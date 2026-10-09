import { request } from "node:http";
import path from "node:path";
import { NodeDriveBackupProvider } from "../packages/core/src/adapters/node/drive/backupProvider.ts";
import { NodeDriveBackupSource } from "../packages/core/src/adapters/node/drive/backupSource.ts";
import {
  DriveTransportError,
  NodeDriveExecution,
} from "../packages/core/src/adapters/node/drive/execution.ts";
import { NodeDriveHttp } from "../packages/core/src/adapters/node/drive/http.ts";
import { acquireDriveRuntime } from "../packages/core/src/adapters/node/drive/runtimeOwnership.ts";
import { FileObjectStorage } from "../packages/core/src/adapters/node/objectStorage.ts";

const root = process.env.HOLLOW_DRIVE_BACKUP_NATIVE_ROOT;
if (!root) throw Error("FIXTURE_ROOT");
let execution;
let port;
let resolveStop;
const stopped = new Promise((resolve) => {
  resolveStop = resolve;
});
const send = (value) =>
  new Promise((resolve, reject) =>
    process.send(value, (error) => (error ? reject(error) : resolve())),
  );
const deadline = setTimeout(() => {
  resolveStop();
  process.exitCode = 1;
}, 15000);
process.on("message", async (message) => {
  try {
    if (message.op === "stop") {
      resolveStop();
      return;
    }
    if (message.op === "start") {
      port = message.port;
      const ownership = await acquireDriveRuntime(
        path.join(root, "runtime"),
        path.join(root, "native.sqlite"),
      );
      execution = new NodeDriveExecution(
        ownership.runtimeGeneration,
        ownership,
      );
      await send({ code: "READY", generation: ownership.runtimeGeneration });
      return;
    }
    if (message.op !== "work" || !execution || !Number.isInteger(port))
      throw Error("FIXTURE_PROTOCOL");
    const target = {
      kind: "backup",
      id: message.id,
      owner: {
        state: "active",
        runtimeGeneration: execution.runtimeGeneration,
        token: message.token,
      },
    };
    const source = new NodeDriveBackupSource(
      new FileObjectStorage(path.join(root, "originals")),
      (signal) => execution.register(signal),
    );
    const http = new NodeDriveHttp(execution, (url, options, response) => {
      const local = new URL(url);
      local.protocol = "http:";
      local.hostname = "127.0.0.1";
      local.port = String(port);
      return request(
        local,
        {
          ...options,
          protocol: "http:",
          host: "127.0.0.1",
          hostname: "127.0.0.1",
          port,
          agent: false,
        },
        response,
      );
    });
    const provider = new NodeDriveBackupProvider(http);
    let sourceClosed = false;
    await execution.withCaller(
      target,
      async () => true,
      async () => {
        const owned = execution.run(target, async (signal) => {
          const handle = await source.open(message.identity, signal);
          try {
            await handle.prepare();
            const started = await provider.startResumable({
              accessToken: "synthetic",
              signal,
              fileId: message.fileId,
              folderId: message.folderId,
              folderResourceKey: null,
              marker: message.marker,
              name: "fixture.bin",
              bytes: message.identity.bytes,
            });
            if (started.kind !== "started")
              throw Error("FIXTURE_RESUMABLE_START");
            const chunk = await handle.readRange(0, 1048576);
            await provider
              .uploadChunk({
                accessToken: "synthetic",
                signal,
                session: started.session,
                bytes: message.identity.bytes,
                offset: 0,
                chunk,
              })
              .catch((error) => {
                if (!(error instanceof DriveTransportError)) throw error;
              });
            await send({ code: "UPLOADED" });
            await stopped;
          } finally {
            await handle.close();
            await handle.closed;
            sourceClosed = true;
          }
        });
        const outcome = await owned.result;
        if (outcome.kind !== "value")
          throw Error(`Native backup work failed: ${outcome.code}`);
        await owned.closed;
      },
    );
    clearTimeout(deadline);
    await send({ code: "CLOSED", sourceClosed });
    process.disconnect();
  } catch (error) {
    clearTimeout(deadline);
    process.exitCode = 1;
    console.error(error);
    if (process.connected) process.disconnect();
  }
});
