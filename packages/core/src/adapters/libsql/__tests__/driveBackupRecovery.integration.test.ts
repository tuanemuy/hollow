import { type ChildProcess, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { createServer, request } from "node:http";
import type { Socket } from "node:net";
import path from "node:path";
import { NodeDriveBackupProvider } from "@repo/core/adapters/node/drive/backupProvider";
import { NodeDriveBackupSource } from "@repo/core/adapters/node/drive/backupSource";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import { NodeDriveHttp } from "@repo/core/adapters/node/drive/http";
import { acquireDriveRuntime } from "@repo/core/adapters/node/drive/runtimeOwnership";
import { createDriveSecretProtector } from "@repo/core/adapters/node/drive/secretProtector";
import { FileObjectStorage } from "@repo/core/adapters/node/objectStorage";
import { backupSessionBinding } from "@repo/core/application/integration/drive/backup/recovery";
import {
  backupPhase,
  runDriveBackup,
} from "@repo/core/application/integration/drive/backup/runner";
import { reconcileDriveClosures } from "@repo/core/application/integration/drive/runner";
import { BusinessRuleError } from "@repo/core/domain/error";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  type BackupCase,
  type BackupFixture,
  backupCase,
  backupFixture,
  backupNow,
  finite,
} from "./driveBackupFixtures";

const root = process.env.HOLLOW_DRIVE_BACKUP_NATIVE_ROOT;
const failure = () =>
  new BusinessRuleError("FIXTURE_NATIVE", "自己検証の状態を確認できません。");
const data = Buffer.alloc(2 * 1024 * 1024 + 17, 37);
const sha256 = createHash("sha256").update(data).digest("hex");
const expected = [
  "generate",
  "start",
  "chunk",
  "chunk",
  "query",
  "chunk",
  "inspect",
  "start",
  "chunk",
  "inspect",
  "query",
  "chunk",
  "chunk",
  "inspect",
];

describe.skipIf(!root)(
  "Drive backup two bounded native recovery chains",
  () => {
    let fixture: BackupFixture;
    let scenario: BackupCase | undefined;
    let child: ChildProcess | undefined;
    let childEnd:
      | Promise<{ code: number | null; signal: string | null }>
      | undefined;
    let port = 0;
    let chain = 1;
    let count = 0;
    let wire = 0;
    let transportBytes = 0;
    let active = 0;
    let received = 0;
    let chunks = 0;
    let marker = "";
    let sourceOpens = 0;
    let sourceCloses = 0;
    let childClosed = false;
    let childExited = false;
    let liveRefused = false;
    let listenerClosed = false;
    const offsets: number[] = [];
    const sockets = new Set<Socket>();
    const socketEnds: Promise<void>[] = [];
    let storage: FileObjectStorage;
    const key = randomBytes(32);
    const protector = createDriveSecretProtector({
      activeKid: "self",
      keys: new Map([["self", key]]),
    });
    key.fill(0);
    const metadata = () => ({
      id: `native-file${chain}`,
      parents: ["backup-folder"],
      size: String(data.length),
      sha256Checksum: sha256,
      trashed: false,
      appProperties: { hollowBackupTarget: marker },
    });
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://self.invalid");
      const range = req.headers["content-range"];
      const endpoint =
        req.method === "GET" && url.pathname === "/drive/v3/files/generateIds"
          ? "generate"
          : req.method === "POST" && url.pathname === "/upload/drive/v3/files"
            ? "start"
            : req.method === "GET" &&
                url.pathname === `/drive/v3/files/native-file${chain}`
              ? "inspect"
              : req.method === "PUT" &&
                  url.pathname === "/upload/drive/v3/files" &&
                  url.searchParams.get("upload_id") === `chain${chain}`
                ? typeof range === "string" && range.startsWith("bytes */")
                  ? "query"
                  : "chunk"
                : "unknown";
      count++;
      active++;
      const parts: Buffer[] = [];
      let size = 0;
      res.once("close", () => {
        active--;
      });
      if (count > 32 || active > 1 || endpoint !== expected[count - 1]) {
        req.destroy();
        return;
      }
      req.on("data", (b: Buffer) => {
        size += b.length;
        wire += b.length;
        if (size > 1048576 || wire > 16 * 1024 * 1024) req.destroy();
        else parts.push(b);
      });
      const json = (status: number, value: unknown) => {
        const body = JSON.stringify(value);
        wire += Buffer.byteLength(body);
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        });
        res.end(body);
      };
      req.on("end", () => {
        try {
          if (endpoint === "generate") {
            json(200, { ids: ["native-file1"] });
            return;
          }
          if (endpoint === "start") {
            const input = JSON.parse(Buffer.concat(parts).toString());
            if (
              input.id !== `native-file${chain}` ||
              input.parents?.[0] !== "backup-folder"
            )
              throw failure();
            marker = input.appProperties.hollowBackupTarget;
            res.writeHead(200, {
              Location: `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=chain${chain}`,
            });
            res.end();
            return;
          }
          if (endpoint === "inspect") {
            json(
              received === data.length ? 200 : 404,
              received === data.length ? metadata() : {},
            );
            return;
          }
          if (endpoint === "query") {
            res.writeHead(308, { Range: `bytes=0-${received - 1}` });
            res.end();
            return;
          }
          const parsed =
            typeof range === "string"
              ? /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range)
              : null;
          if (!parsed) throw failure();
          const offset = Number(parsed[1]);
          if (
            offset !== received ||
            Number(parsed[2]) + 1 !== offset + size ||
            Number(parsed[3]) !== data.length ||
            !Buffer.concat(parts).equals(data.subarray(offset, offset + size))
          )
            throw failure();
          offsets.push(offset);
          chunks++;
          received = chunks === 1 ? 17 : offset + size;
          if ((chain === 1 && chunks === 2) || (chain === 2 && chunks === 1)) {
            req.socket.destroy();
            return;
          }
          if (received === data.length) json(200, metadata());
          else {
            res.writeHead(308, { Range: `bytes=0-${received - 1}` });
            res.end();
          }
        } catch {
          req.destroy();
        }
      });
    });
    server.on("connection", (socket) => {
      sockets.add(socket);
      socketEnds.push(
        new Promise((resolve) =>
          socket.once("close", () => {
            transportBytes += socket.bytesRead + socket.bytesWritten;
            sockets.delete(socket);
            resolve();
          }),
        ),
      );
    });
    function native(c: BackupCase) {
      const http = new NodeDriveHttp(c.execution, (url, options, response) => {
        const fixed = new URL(url);
        fixed.protocol = "http:";
        fixed.hostname = "127.0.0.1";
        fixed.port = String(port);
        return request(
          fixed,
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
      const source = new NodeDriveBackupSource(
        {
          async openOwnedRandomRead(...args) {
            sourceOpens++;
            const opened = await storage.openOwnedRandomRead(...args);
            void opened.closed.then(
              () => {
                sourceCloses++;
              },
              () => {},
            );
            return opened;
          },
        },
        (signal) => c.execution.register(signal),
      );
      return {
        ...c.c,
        drive: {
          ...c.service,
          backup: { provider: new NodeDriveBackupProvider(http), source },
        },
      };
    }
    beforeAll(async () => {
      if (
        !root ||
        realpathSync(root) !== root ||
        !lstatSync(root).isDirectory() ||
        (lstatSync(root).mode & 0o777) !== 0o700
      )
        throw failure();
      fixture = await backupFixture({
        label: "native",
        bytes: data.length,
        sha256,
      });
      storage = new FileObjectStorage(path.join(root, "originals"));
      for (const original of fixture.originals)
        await storage.put(
          original.storageKey,
          new ReadableStream({
            start(controller) {
              controller.enqueue(data);
              controller.close();
            },
          }),
          data.length,
        );
      await new Promise<void>((resolve, reject) => {
        server.once("error", () => reject(failure()));
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (!address || typeof address === "string") throw failure();
      port = address.port;
    });
    afterEach(async (context) => {
      if (child?.connected) child.send({ op: "stop" });
      if (childEnd) {
        const result = await childEnd;
        childExited = result.code === 0 && result.signal === null;
      }
      await scenario?.close(context.task.result?.state === "pass", chain === 2);
      scenario = undefined;
    });
    afterAll(async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(failure()) : resolve())),
      );
      await Promise.all(socketEnds);
      listenerClosed = !server.listening;
      const probe = createServer();
      await new Promise<void>((resolve, reject) => {
        probe.once("error", () => reject(failure()));
        probe.listen(port, "127.0.0.1", resolve);
      });
      await new Promise<void>((resolve, reject) =>
        probe.close((e) => (e ? reject(failure()) : resolve())),
      );
      await fixture?.close();
      process.stdout.write(
        `__METRICS__${JSON.stringify({
          requests: count,
          bodyBytes: wire,
          transportBytes,
          active,
          sockets: sockets.size,
          sourceOpens,
          sourceCloses,
          childClosed,
          childExited,
          liveRefused,
          listenerClosed,
          dbClosed: true,
          bindProbe: !probe.listening,
        })}\n`,
      );
      expect(
        count === expected.length &&
          wire < 16 * 1024 * 1024 &&
          transportBytes < 16 * 1024 * 1024 &&
          active === 0 &&
          sockets.size === 0 &&
          sourceOpens === sourceCloses &&
          listenerClosed,
      ).toBe(true);
    });
    it("uploads verified nonaligned ranges, queries an unknown ACK and completes one immutable ID", async () => {
      scenario = await backupCase(fixture, { protector });
      const accepted = await scenario.admission();
      expect(
        await runDriveBackup(
          native(scenario),
          accepted.transfer!.id,
          scenario.execution.runtimeGeneration,
        ),
      ).toBe(true);
      const saved = await fixture.uow.run((u) =>
        u.driveBackupTransfers.find(accepted.transfer!.id),
      );
      expect(
        saved?.phase === "succeeded" &&
          saved.owner.state === "closed" &&
          !saved.readPinned,
      ).toBe(true);
      expect(offsets).toEqual([0, 17, 1048593]);
      expect(count).toBe(7);
    });
    it("refuses a live predecessor, then reconciles its physical exit before reclaiming the persisted intent", async () => {
      chain = 2;
      received = 0;
      chunks = 0;
      for (const original of fixture.originals)
        await storage.put(
          original.storageKey,
          new ReadableStream({
            start(controller) {
              controller.enqueue(data);
              controller.close();
            },
          }),
          data.length,
        );
      const ownedRoot = root!;
      const helper = new URL(
        "../../../../../../tests/driveBackupPredecessor.mjs",
        import.meta.url,
      ).pathname;
      const stat = lstatSync(helper);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384)
        throw failure();
      const loader = new URL(
        "../../../../../../tests/resolveTsImports.mjs",
        import.meta.url,
      ).pathname;
      child = spawn(
        process.execPath,
        ["--experimental-transform-types", "--import", loader, helper],
        {
          cwd: ownedRoot,
          env: {
            ...process.env,
            NODE_DISABLE_COMPILE_CACHE: "1",
            TSX_DISABLE_CACHE: "1",
            TMPDIR: path.join(ownedRoot, "tmp"),
          },
          stdio: ["ignore", "pipe", "pipe", "ipc"],
        },
      );
      child.stdout!.resume();
      let childDiagnostics = "";
      child.stderr!.on("data", (chunk: Buffer) => {
        if (childDiagnostics.length < 8192)
          childDiagnostics += chunk.toString();
      });
      const messages: {
        code: string;
        generation?: string;
        sourceClosed?: boolean;
      }[] = [];
      const waits = new Map<
        string,
        (value: { code: string; generation?: string }) => void
      >();
      child.on("message", (value) => {
        if (
          !value ||
          typeof value !== "object" ||
          !("code" in value) ||
          typeof value.code !== "string"
        )
          return;
        const event = value as {
          code: string;
          generation?: string;
          sourceClosed?: boolean;
        };
        messages.push(event);
        waits.get(event.code)?.(event);
        if (event.code === "CLOSED") childClosed = event.sourceClosed === true;
      });
      childEnd = new Promise((resolve) =>
        child!.once("close", (code, signal) => resolve({ code, signal })),
      );
      const wait = (code: string) =>
        new Promise<{ code: string; generation?: string }>(
          (resolve, reject) => {
            const present = messages.find((v) => v.code === code);
            if (present) {
              resolve(present);
              return;
            }
            const timeout = setTimeout(() => reject(failure()), 15000);
            waits.set(code, (value) => {
              clearTimeout(timeout);
              resolve(value);
            });
            child!.once("close", () => {
              clearTimeout(timeout);
              if (!messages.some((v) => v.code === code))
                reject(
                  new Error(
                    `Native predecessor failed before ${code}: ${childDiagnostics}`,
                  ),
                );
            });
          },
        );
      child.send({ op: "start", port });
      const ready = await wait("READY");
      if (!ready.generation || !/^[a-f0-9-]{36}$/.test(ready.generation))
        throw failure();
      scenario = await backupCase(fixture, {
        execution: new NodeDriveExecution(ready.generation),
        protector,
      });
      const a = await scenario.admission();
      const owner = {
        state: "active" as const,
        runtimeGeneration: ready.generation,
        token: fixture.id(),
      };
      const saved = await fixture.uow.run(async (u) => {
        const target = await u.driveBackupTargets.find(a.transfer!.targetId);
        const allocated = {
          ...target!,
          state: "allocated" as const,
          fileId: "native-file2",
          version: target!.version + 1,
        };
        expect(
          await u.driveBackupTargets.replace(allocated, target!.version),
        ).toBe(true);
        const claimed = backupPhase(
          a.transfer!,
          "checking",
          { owner, readPinned: true },
          backupNow,
        );
        expect(
          await u.driveBackupTransfers.claim(claimed, a.transfer!.version),
        ).toBe(true);
        const uploading = backupPhase(
          claimed,
          "uploading",
          {
            offset: 0,
            length: 1048576,
            sessionEnvelope: protector.protect(
              "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=chain2",
              backupSessionBinding(claimed, "native-file2"),
            ),
          },
          backupNow,
        );
        expect(
          await u.driveBackupTransfers.replace(uploading, claimed.version),
        ).toBe(true);
        return { uploading, allocated };
      });
      child.send({
        op: "work",
        id: a.transfer!.id,
        token: owner.token,
        identity: saved.uploading.identity,
        fileId: "native-file2",
        folderId: "backup-folder",
        marker: saved.allocated.marker,
      });
      await wait("UPLOADED");
      liveRefused =
        (await finite(() =>
          acquireDriveRuntime(
            path.join(ownedRoot, "runtime"),
            path.join(ownedRoot, "native.sqlite"),
          ),
        )) !== "resolved";
      expect(liveRefused).toBe(true);
      expect(
        (
          await fixture.uow.run((u) =>
            u.driveBackupTransfers.find(a.transfer!.id),
          )
        )?.readPinned,
      ).toBe(true);
      child.send({ op: "stop" });
      await wait("CLOSED");
      const exited = await childEnd;
      expect(exited.code === 0 && exited.signal === null && childClosed).toBe(
        true,
      );
      const ownership = await acquireDriveRuntime(
        path.join(ownedRoot, "runtime"),
        path.join(ownedRoot, "native.sqlite"),
      );
      const successor = new NodeDriveExecution(
        ownership.runtimeGeneration,
        ownership,
      );
      expect(successor.accepting()).toBe(false);
      await scenario.execution.stop();
      scenario.replaceExecution(successor);
      const c = native(scenario);
      expect(await reconcileDriveClosures(c)).toBe(1);
      expect(successor.accepting()).toBe(true);
      const closed = await fixture.uow.run((u) =>
        u.driveBackupTransfers.find(a.transfer!.id),
      );
      expect(
        closed?.phase === "uploading" &&
          closed.owner.state === "closed" &&
          !closed.readPinned &&
          closed.received === 0,
      ).toBe(true);
      expect(
        await runDriveBackup(c, a.transfer!.id, ownership.runtimeGeneration),
      ).toBe(true);
      const completed = await fixture.uow.run((u) =>
        u.driveBackupTransfers.find(a.transfer!.id),
      );
      expect(
        completed?.phase === "succeeded" &&
          completed.owner.state === "closed" &&
          !completed.readPinned,
      ).toBe(true);
      expect(count).toBe(14);
    });
  },
);
