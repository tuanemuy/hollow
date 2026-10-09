import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = process.env.HOLLOW_S4_ROOT;
if (
  !ROOT ||
  realpathSync(ROOT) !== ROOT ||
  (lstatSync(ROOT).mode & 0o777) !== 0o700
)
  throw Error("S4_D_BINDING");
const [mode, counterpart, expectedParent] = process.argv.slice(2);
if (
  !["owner", "grandchild"].includes(mode) ||
  !["active", "unknown"].includes(counterpart)
)
  throw Error("S4_D_ARGS");
const marker = path.join(ROOT, "tmp", `release-${counterpart}`);
const send = (value) => {
  if (
    !process.connected ||
    !process.send ||
    Buffer.byteLength(JSON.stringify(value)) > 32768
  )
    throw Error("S4_D_IPC");
  return new Promise((resolve, reject) =>
    process.send(value, (error) => (error ? reject(error) : resolve())),
  );
};
const onceMessage = () =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(Error("S4_D_MESSAGE_TIMEOUT"));
    }, 30000);
    const message = (value) => {
      cleanup();
      resolve(value);
    };
    const closed = () => {
      cleanup();
      reject(Error("S4_D_IPC_CLOSED"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      process.off("message", message);
      process.off("disconnect", closed);
    };
    process.once("message", message);
    process.once("disconnect", closed);
  });
if (mode === "grandchild") {
  if (
    !/^[1-9][0-9]*$/.test(expectedParent ?? "") ||
    process.ppid !== Number(expectedParent)
  )
    throw Error("S4_D_PARENT");
  await send({
    type: "grandchild-ready",
    pid: process.pid,
    ppid: process.ppid,
  });
  let ended = false;
  const deadline = setTimeout(() => {
    ended = true;
    clearInterval(poll);
    process.exitCode = 1;
    if (process.connected) process.disconnect();
  }, 30000);
  const poll = setInterval(() => {
    if (ended) return;
    let fd;
    try {
      fd = openSync(marker, constants.O_RDONLY | constants.O_NOFOLLOW);
      const info = fstatSync(fd);
      if (
        !info.isFile() ||
        info.uid !== process.getuid() ||
        info.nlink !== 1 ||
        (info.mode & 0o777) !== 0o600 ||
        info.size !== 8
      )
        throw Error("S4_D_MARKER");
      const data = Buffer.alloc(8);
      if (readSync(fd, data, 0, 8, 0) !== 8 || data.toString() !== "release\n")
        throw Error("S4_D_MARKER");
      ended = true;
      clearInterval(poll);
      clearTimeout(deadline);
      if (process.connected) process.disconnect();
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        ended = true;
        clearInterval(poll);
        clearTimeout(deadline);
        process.exitCode = 1;
        if (process.connected) process.disconnect();
      }
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }, 200);
} else {
  if (expectedParent !== undefined) throw Error("S4_D_ARGS");
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (
          error?.code !== "ERR_MODULE_NOT_FOUND" ||
          !specifier.startsWith(".") ||
          path.extname(specifier) ||
          !context.parentURL?.startsWith("file:")
        )
          throw error;
        return nextResolve(
          new URL(specifier + ".ts", context.parentURL).href,
          context,
        );
      }
    },
  });
  let client;
  let actual;
  let successful = false;
  try {
    const [runtime, memoryModule, preparerModule, clientModule, uowModule] =
      await Promise.all([
        import(
          pathToFileURL(
            path.join(
              SOURCE,
              "packages/core/src/adapters/node/llm/runtimeOwnership.ts",
            ),
          ).href
        ),
        import(
          pathToFileURL(
            path.join(
              SOURCE,
              "packages/core/src/adapters/node/regeneration/memory.ts",
            ),
          ).href
        ),
        import(
          pathToFileURL(
            path.join(
              SOURCE,
              "packages/core/src/adapters/node/llm/sourcePreparer.ts",
            ),
          ).href
        ),
        import(
          pathToFileURL(
            path.join(SOURCE, "packages/core/src/adapters/libsql/client.ts"),
          ).href
        ),
        import(
          pathToFileURL(
            path.join(
              SOURCE,
              "packages/core/src/adapters/libsql/hollowUnitOfWork.ts",
            ),
          ).href
        ),
      ]);
    const commandReady = onceMessage();
    await send({ type: "await-claim" });
    const command = await commandReady;
    if (
      typeof command !== "object" ||
      command === null ||
      Object.keys(command).sort().join(",") !== "previewId,type" ||
      command.type !== "claim" ||
      typeof command.previewId !== "string" ||
      !/^[0-9a-f-]{36}$/.test(command.previewId)
    )
      throw Error("S4_D_CLAIM");
    const owner = await runtime.NodeLlmRuntimeOwnership.acquire(
      path.join(
        ROOT,
        "objects-native",
        ".llm-runtime",
        `recovery-${counterpart}`,
      ),
    );
    client = clientModule.createLibsqlClient({
      url: "file:" + path.join(ROOT, "native.db"),
    });
    await clientModule.applyPragmas(client);
    const uow = new uowModule.LibsqlHollowUnitOfWorkProvider(
      clientModule.getDatabase(client),
    );
    const source = new preparerModule.NodeLlmSourcePreparer(
      path.join(SOURCE, "packages/core/src/adapters/node/llm/sourceWorker.mjs"),
    );
    const memory = new memoryModule.NodeRegenerationMemory(source);
    const admission = memory.reserveBegin({
      kind: "pdf-preview",
      id: command.previewId,
    });
    const receipt = {
      consumer: admission.consumer,
      runtimeId: owner.runtimeId,
      token: randomUUID(),
      generation: 1,
      state: "active",
    };
    memory.bindBegin(admission, receipt);
    const claimed = await memory.claimTransaction(admission, uow, async (u) => {
      const candidate = await u.llmPdfPreviews.claimCandidate(
        new Date("2026-10-06T00:00:00Z"),
      );
      if (!candidate || candidate.id !== command.previewId)
        throw Error("S4_D_CANDIDATE");
      const value = await u.llmPdfPreviews.claimExact({
        candidate,
        now: new Date("2026-10-06T00:00:00Z"),
        runtimeId: owner.runtimeId,
        ownerToken: receipt.token,
        receipt,
      });
      if (!value) throw Error("S4_D_CLAIM");
      return { kind: "claimed", value };
    });
    if (claimed.result.kind !== "claimed" || !claimed.lease)
      throw Error("S4_D_LEASE");
    let value = claimed.result.value;
    const native = owner.nativeOwner(value, claimed.lease);
    const birth = await native.reserve();
    actual = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        "grandchild",
        counterpart,
        String(process.pid),
      ],
      {
        detached: false,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        env: {
          PATH: process.env.PATH,
          LANG: "C.UTF-8",
          TMPDIR: path.join(ROOT, "tmp"),
          HOLLOW_S4_ROOT: ROOT,
        },
      },
    );
    const handle = actual;
    const childReady = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(Error("S4_D_CHILD_TIMEOUT"));
      }, 10000);
      const message = (v) => {
        cleanup();
        resolve(v);
      };
      const error = () => {
        cleanup();
        reject(Error("S4_D_CHILD_FAILED"));
      };
      const cleanup = () => {
        clearTimeout(timer);
        handle.off("message", message);
        handle.off("error", error);
        handle.off("exit", error);
      };
      handle.once("message", message);
      handle.once("error", error);
      handle.once("exit", error);
    });
    if (actual.pid === undefined) throw Error("S4_D_CHILD_PID");
    await native.register(birth, actual.pid);
    const metadata = await childReady;
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      metadata.type !== "grandchild-ready" ||
      metadata.pid !== actual.pid ||
      metadata.ppid !== process.pid
    )
      throw Error("S4_D_CHILD_PARENT");
    if (counterpart === "unknown")
      value = await uow.run(async (u) => {
        const current = await u.llmPdfPreviews.find(command.previewId);
        if (
          !current ||
          current.state !== "running" ||
          current.owner.state !== "active" ||
          !current.inputReceipt
        )
          throw Error("S4_D_UNKNOWN");
        const next = {
          ...current,
          state: "unknown",
          owner: { ...current.owner, state: "unknown" },
          inputReceipt: { ...current.inputReceipt, state: "unknown" },
          version: current.version + 1,
          updatedAt: new Date("2026-10-06T00:00:00Z"),
        };
        if (!(await u.llmPdfPreviews.replace(next, current.version)))
          throw Error("S4_D_UNKNOWN");
        return next;
      });
    const checkpoint = await client.execute(
      "PRAGMA main.wal_checkpoint(TRUNCATE)",
    );
    if (
      JSON.stringify(checkpoint.columns) !== '["busy","log","checkpointed"]' ||
      checkpoint.rows.length !== 1 ||
      checkpoint.rows[0].length !== 3 ||
      ["busy", "log", "checkpointed"].some(
        (k) =>
          typeof checkpoint.rows[0][k] !== "number" ||
          !Number.isSafeInteger(checkpoint.rows[0][k]) ||
          checkpoint.rows[0][k] !== 0,
      )
    )
      throw Error("S4_D_CHECKPOINT");
    client.close();
    if (!client.closed) throw Error("S4_D_CLIENT_CLOSE");
    client = undefined;
    const exitReady = onceMessage();
    await send({
      type: "owner-ready",
      runtimeId: owner.runtimeId,
      nativePid: actual.pid,
      nativeParent: process.pid,
      clientClosed: true,
      checkpoint: true,
    });
    const exit = await exitReady;
    if (
      typeof exit !== "object" ||
      exit === null ||
      Object.keys(exit).join(",") !== "type" ||
      exit.type !== "exit"
    )
      throw Error("S4_D_EXIT");
    if (actual.connected) actual.disconnect();
    actual.unref();
    successful = true;
    if (process.connected) process.disconnect();
  } finally {
    if (client) client.close();
    if (actual && !successful) {
      const handle = actual;
      let closed = false;
      handle.once("close", () => {
        closed = true;
      });
      handle.kill("SIGTERM");
      const wait = async (ms) => {
        const end = Date.now() + ms;
        while (!closed && Date.now() < end)
          await new Promise((r) => setTimeout(r, 20));
      };
      await wait(5000);
      if (!closed) {
        handle.kill("SIGKILL");
        await wait(5000);
      }
      if (!closed) process.exitCode = 1;
    }
    hooks.deregister();
  }
}
