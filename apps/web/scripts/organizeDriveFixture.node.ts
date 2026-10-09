import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NodeDriveBackupSource } from "@repo/core/adapters/node/drive/backupSource";
import { NodeDriveExecution } from "@repo/core/adapters/node/drive/execution";
import type { createNodeDrive } from "@repo/core/adapters/node/drive/factory";
import { createDriveSecretProtector } from "@repo/core/adapters/node/drive/secretProtector";
import type {
  DriveBackupFile,
  DriveBackupReceived,
} from "@repo/core/application/integration/drive/backup/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

type Transfer = {
  file: DriveBackupFile;
  received: number;
  chunks: Uint8Array[];
};

export async function createOrganizeDriveFixture(
  root: string,
  appOrigin?: string,
) {
  const directory = join(root, "local-drive");
  await mkdir(directory, { mode: 0o700 });
  const key = randomBytes(32);
  const protector = createDriveSecretProtector({
    activeKid: "local",
    keys: new Map([["local", key]]),
  });
  key.fill(0);
  const files = new Map<string, Transfer>();
  const folderId = "local-backup-folder";
  const folders = new Map([
    [
      folderId,
      { name: "ローカル原本バックアップ", marker: null as string | null },
    ],
  ]);
  const factory: typeof createNodeDrive = async (_base, options) => {
    if (!options.storage) throw new Error("Local Drive storage missing");
    const execution = new NodeDriveExecution(randomUUID());
    const observed = (signal: AbortSignal) => signal.throwIfAborted();
    const received = (transfer: Transfer): DriveBackupReceived =>
      transfer.received === transfer.file.bytes
        ? { kind: "complete", file: transfer.file }
        : { kind: "incomplete", offset: transfer.received };
    return {
      callbackUrl: new URL("/auth/drive/callback", options.appUrl).href,
      services: {
        runtimeGeneration: execution.runtimeGeneration,
        execution,
        protector,
        picker: { appId: "1", apiKey: "local-fixture" },
        wake: options.wake,
        authorization: {
          async authorization() {
            throw new BusinessRuleError(
              "DRIVE_UNAVAILABLE",
              "このfixtureの連携は起動時に用意します。",
            );
          },
          async exchange() {
            throw new BusinessRuleError(
              "DRIVE_UNAVAILABLE",
              "実サービスに接続しません。",
            );
          },
          async verifyCandidate() {
            throw new BusinessRuleError(
              "DRIVE_UNAVAILABLE",
              "実サービスに接続しません。",
            );
          },
          async refresh(input) {
            observed(input.signal);
            return {
              accessToken: "local-access",
              refreshToken: null,
              idToken: null,
              scope: null,
              accessExpiresAt: new Date(Date.now() + 3600000),
            };
          },
        },
        folders: {
          async generateFolderId(input) {
            observed(input.signal);
            return appOrigin ? `local-folder-${randomUUID()}` : folderId;
          },
          async createFolder(input) {
            observed(input.signal);
            if (appOrigin)
              folders.set(input.fileId, {
                name: "ローカル新規保存先",
                marker: input.marker,
              });
            return { kind: "created" };
          },
          async inspectFolder(input) {
            observed(input.signal);
            return folders.has(input.fileId)
              ? {
                  kind: "usable",
                  folder: {
                    id: input.fileId,
                    name:
                      folders.get(input.fileId)?.name ??
                      "ローカル原本バックアップ",
                    driveId: null,
                  },
                  resourceKey: null,
                  parents: ["root"],
                  marker: folders.get(input.fileId)?.marker ?? null,
                }
              : { kind: "access-denied" };
          },
        },
        backup: {
          source: new NodeDriveBackupSource(options.storage, (signal) =>
            execution.register(signal),
          ),
          provider: {
            async allocateFileId(input) {
              observed(input.signal);
              return `local-${randomUUID()}`;
            },
            async startResumable(input) {
              observed(input.signal);
              if (!folders.has(input.folderId)) return { kind: "conflict" };
              files.set(input.fileId, {
                file: {
                  id: input.fileId,
                  parents: [input.folderId],
                  marker: input.marker,
                  bytes: input.bytes,
                  sha256: null,
                  trashed: false,
                  webViewLink: appOrigin
                    ? `${appOrigin}/__fixture/drive/file/${encodeURIComponent(input.fileId)}`
                    : null,
                  resourceKey: null,
                },
                received: 0,
                chunks: [],
              });
              return { kind: "started", session: input.fileId };
            },
            async queryReceived(input) {
              observed(input.signal);
              const transfer = files.get(input.session);
              return transfer
                ? received(transfer)
                : { kind: "session-expired" };
            },
            async uploadChunk(input) {
              observed(input.signal);
              const transfer = files.get(input.session);
              if (
                !transfer ||
                input.offset !== transfer.received ||
                input.bytes !== transfer.file.bytes
              )
                return { kind: "conflict" };
              const release = execution.register(input.signal);
              try {
                transfer.chunks.push(input.chunk.slice());
                transfer.received += input.chunk.byteLength;
                if (transfer.received === transfer.file.bytes) {
                  const bytes = Buffer.concat(transfer.chunks);
                  await writeFile(
                    join(directory, `${transfer.file.id}.original`),
                    bytes,
                    { flag: "wx", mode: 0o600 },
                  );
                  observed(input.signal);
                  transfer.file = {
                    ...transfer.file,
                    sha256: createHash("sha256").update(bytes).digest("hex"),
                  };
                }
                return received(transfer);
              } finally {
                release();
              }
            },
            async inspectFile(input) {
              observed(input.signal);
              const transfer = files.get(input.fileId);
              return transfer?.received === transfer?.file.bytes
                ? (transfer?.file ?? null)
                : null;
            },
          },
        },
      },
    };
  };
  return { factory, protector, folderId, file: (id: string) => files.get(id) };
}
