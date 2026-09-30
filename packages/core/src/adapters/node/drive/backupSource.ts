import { createHash } from "node:crypto";
import type {
  DriveBackupSource,
  DriveBackupSourceHandle,
  DriveBackupSourceIdentity,
} from "@repo/core/application/integration/drive/backup/ports";
import {
  isObjectReadCloseUnprovenError,
  type ObjectStorage,
} from "@repo/core/application/ports/objectStorage";
import { BusinessRuleError } from "@repo/core/domain/error";

const READ_BYTES = 64 * 1024;
const BLOCK_BYTES = 1024 * 1024;
const MAX_BYTES = 200 * BLOCK_BYTES;

const invalid = () =>
  new BusinessRuleError(
    "DRIVE_BACKUP_SOURCE_INVALID",
    "バックアップ原本の読み取り条件を確認できません。",
  );
const changed = () =>
  new BusinessRuleError(
    "DRIVE_BACKUP_SOURCE_CHANGED",
    "バックアップ原本の内容を確認できません。",
  );
const unavailable = () =>
  new BusinessRuleError(
    "DRIVE_BACKUP_SOURCE_UNAVAILABLE",
    "バックアップ原本を読み取れません。",
  );

export class NodeDriveBackupSource implements DriveBackupSource {
  private readonly storage: Required<
    Pick<ObjectStorage, "openOwnedRandomRead">
  >;

  constructor(
    storage: Pick<ObjectStorage, "openOwnedRandomRead">,
    private readonly register: (signal: AbortSignal) => () => void = () =>
      () => {},
  ) {
    const open = storage.openOwnedRandomRead;
    if (!open) throw unavailable();
    this.storage = { openOwnedRandomRead: open.bind(storage) };
  }

  async open(
    identity: DriveBackupSourceIdentity,
    signal: AbortSignal,
  ): Promise<DriveBackupSourceHandle> {
    if (
      !/^[a-zA-Z0-9_-]{1,80}$/.test(identity.storageKey) ||
      !Number.isSafeInteger(identity.bytes) ||
      identity.bytes < 0 ||
      identity.bytes > MAX_BYTES ||
      !/^[a-f0-9]{64}$/.test(identity.sha256)
    )
      throw invalid();
    if (signal.aborted) throw unavailable();
    const release = this.register(signal);
    const source = await this.storage
      .openOwnedRandomRead(identity.storageKey, signal)
      .catch((error: unknown) => {
        if (isObjectReadCloseUnprovenError(error)) throw error;
        release();
        throw unavailable();
      });
    source.closed.then(release, () => {});
    let state: "new" | "preparing" | "ready" | "failed" | "closed" = "new";
    let reading = false;
    const digests: Buffer[] = [];
    const available = () => {
      if (signal.aborted || state === "closed") throw unavailable();
    };
    const readAt = async (offset: number, length: number) => {
      available();
      const bytes = await source
        .readAt(offset, length)
        .catch((error: unknown) => {
          if (isObjectReadCloseUnprovenError(error)) throw error;
          throw unavailable();
        });
      available();
      if (bytes.byteLength !== length) throw changed();
      return bytes;
    };
    return {
      bytes: source.bytes,
      closed: source.closed,
      close() {
        state = "closed";
        return source.close();
      },
      async prepare() {
        available();
        if (state === "ready") return;
        if (state !== "new") throw invalid();
        state = "preparing";
        try {
          if (source.bytes !== identity.bytes) throw changed();
          const full = createHash("sha256");
          for (let start = 0; start < identity.bytes; start += BLOCK_BYTES) {
            const block = createHash("sha256");
            const end = Math.min(start + BLOCK_BYTES, identity.bytes);
            for (let offset = start; offset < end; offset += READ_BYTES) {
              const bytes = await readAt(
                offset,
                Math.min(READ_BYTES, end - offset),
              );
              full.update(bytes);
              block.update(bytes);
            }
            digests.push(block.digest());
          }
          available();
          if (full.digest("hex") !== identity.sha256) throw changed();
          state = "ready";
        } catch (error) {
          state = "failed";
          throw error;
        }
      },
      async readRange(offset, length) {
        available();
        if (
          state !== "ready" ||
          reading ||
          !Number.isSafeInteger(offset) ||
          !Number.isSafeInteger(length) ||
          offset < 0 ||
          length < 1 ||
          length > BLOCK_BYTES ||
          offset > identity.bytes - length
        )
          throw invalid();
        reading = true;
        try {
          const output = Buffer.alloc(length);
          const first = Math.floor(offset / BLOCK_BYTES);
          const last = Math.floor((offset + length - 1) / BLOCK_BYTES);
          for (let index = first; index <= last; index++) {
            const start = index * BLOCK_BYTES;
            const end = Math.min(start + BLOCK_BYTES, identity.bytes);
            const hash = createHash("sha256");
            for (let position = start; position < end; position += READ_BYTES) {
              const bytes = await readAt(
                position,
                Math.min(READ_BYTES, end - position),
              );
              hash.update(bytes);
              const from = Math.max(position, offset);
              const to = Math.min(position + bytes.byteLength, offset + length);
              if (from < to)
                output.set(
                  bytes.subarray(from - position, to - position),
                  from - offset,
                );
            }
            const expected = digests[index];
            if (!expected || !hash.digest().equals(expected)) throw changed();
          }
          available();
          return output;
        } catch (error) {
          state = "failed";
          throw error;
        } finally {
          reading = false;
        }
      },
    };
  }
}
