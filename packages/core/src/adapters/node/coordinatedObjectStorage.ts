import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import {
  type FileHandle,
  mkdir,
  open,
  readFile,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import type { HollowUnitOfWorkProvider } from "@repo/core/application/execution/hollowUnitOfWork";
import { isLlmObjectOwnershipUnprovenError } from "@repo/core/application/llm/ownershipError";
import type { Clock } from "@repo/core/application/ports/clock";
import { ObjectOwnershipUnprovenError } from "@repo/core/application/ports/objectOwnership";
import type { ObjectStorage } from "@repo/core/application/ports/objectStorage";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { WriteOwner } from "@repo/core/domain/purge/entity";
import { FileObjectStorage } from "./objectStorage";

type Resource = {
  id: string;
  ready: Promise<void>;
  owners: AsyncLocalStorage<string>;
  keys: Map<string, Promise<void>>;
};
const symbol = Symbol.for("hollow.object-storage.resources.v1");
const globalResources = globalThis as typeof globalThis & {
  [symbol]?: Map<string, Resource>;
};
globalResources[symbol] ??= new Map<string, Resource>();
const resources = globalResources[symbol];
const busy = () =>
  new BusinessRuleError(
    "OBJECT_BUSY",
    "書き込みの終了を待って回収します。しばらくして最新の状態を確認してください。",
  );
function parseOwner(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new BusinessRuleError(
      "STORAGE_OWNER_UNKNOWN",
      "ストレージ所有記録を確認できません。管理者による所有状態の確認後に再起動してください。",
    );
  }
}

async function exclusiveRuntime(directory: string, id: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, ".hollow-writer-owner");
  let recovery: FileHandle;
  try {
    recovery = await open(lock + ".recovery", "wx", 0o600);
  } catch {
    throw new BusinessRuleError(
      "STORAGE_OWNER_UNKNOWN",
      "ストレージ所有の確認が別処理中、または中断されています。管理者による所有状態の確認後に再起動してください。",
    );
  }
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const file = await open(lock, "wx", 0o600);
        try {
          await file.writeFile(JSON.stringify({ pid: process.pid, id }));
        } finally {
          await file.close();
        }
        return;
      } catch (error) {
        if (
          !(
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "EEXIST"
          )
        )
          throw error;
        const raw = await readFile(lock, "utf8");
        const prior = parseOwner(raw);
        if (
          !prior ||
          typeof prior !== "object" ||
          !("pid" in prior) ||
          !Number.isSafeInteger(prior.pid) ||
          Number(prior.pid) <= 0
        )
          throw busy();
        try {
          process.kill(Number(prior.pid), 0);
          throw busy();
        } catch (status) {
          if (
            !(
              status &&
              typeof status === "object" &&
              "code" in status &&
              status.code === "ESRCH"
            )
          )
            throw status;
        }
        if ((await readFile(lock, "utf8")) !== raw) throw busy();
        await unlink(lock);
      }
    }
    throw busy();
  } finally {
    await recovery.close();
    await unlink(lock + ".recovery");
  }
}

/** Single-process storage ownership; an unproven/live prior owner blocks recovery. */
export class CoordinatedObjectStorage implements ObjectStorage {
  private readonly raw: FileObjectStorage;
  private readonly resource: Resource;
  constructor(
    directory: string,
    private readonly uow: HollowUnitOfWorkProvider,
    private readonly clock: Clock,
  ) {
    const root = path.resolve(directory);
    this.raw = new FileObjectStorage(root, async () => {
      const id = this.resource.owners.getStore();
      if (
        !id ||
        !(await this.uow.run((c) =>
          c.objectOperations.canPublish(id, this.clock.now()),
        ))
      )
        throw new BusinessRuleError(
          "OBJECT_FENCED",
          "対象が終了したためファイルを公開できません。",
        );
    });
    let resource = resources.get(root);
    if (!resource) {
      const id = randomUUID();
      resource = {
        id,
        owners: new AsyncLocalStorage<string>(),
        keys: new Map(),
        ready: Promise.resolve(),
      };
      resource.ready = exclusiveRuntime(root, id).then(() =>
        uow.run((c) => c.objectOperations.recoverWrites(id)),
      );
      resources.set(root, resource);
    }
    this.resource = resource;
  }
  async recoverOwners() {
    await this.resource.ready;
  }
  async withOwner<T>(
    owner: WriteOwner,
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.resource.ready;
    const id = randomUUID();
    await this.uow.run((c) =>
      c.objectOperations.beginWrite(
        id,
        this.resource.id,
        owner,
        this.clock.now(),
      ),
    );
    let retained = false;
    try {
      return await this.resource.owners.run(id, operation);
    } catch (error) {
      retained =
        (error instanceof ObjectOwnershipUnprovenError ||
          isLlmObjectOwnershipUnprovenError(error)) &&
        error.owner.kind === owner.kind &&
        error.owner.id === owner.id;
      throw error;
    } finally {
      if (!retained) await this.uow.run((c) => c.objectOperations.endWrite(id));
    }
  }
  private async keyed<T>(key: string, fn: () => Promise<T>) {
    const previous = this.resource.keys.get(key) ?? Promise.resolve();
    let release!: () => void;
    const lock = new Promise<void>((r) => {
      release = r;
    });
    const tail = previous.then(() => lock);
    this.resource.keys.set(key, tail);
    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.resource.keys.get(key) === tail) this.resource.keys.delete(key);
    }
  }
  private async register(key: string) {
    const owner = this.resource.owners.getStore();
    if (!owner)
      throw new BusinessRuleError(
        "OBJECT_OWNER_REQUIRED",
        "保存処理の所有を確認できません。",
      );
    await this.uow.run((c) =>
      c.objectOperations.registerKey(owner, key, this.clock.now()),
    );
  }
  async put(key: string, body: ReadableStream<Uint8Array>, bytes: number) {
    await this.resource.ready;
    return this.keyed(key, async () => {
      await this.register(key);
      return this.raw.put(key, body, bytes);
    });
  }
  async putBounded(
    key: string,
    body: ReadableStream<Uint8Array>,
    bytes: number,
    signal?: AbortSignal,
  ) {
    await this.resource.ready;
    return this.keyed(key, async () => {
      await this.register(key);
      return this.raw.putBounded(key, body, bytes, signal);
    });
  }
  async putOwnedBounded(
    key: string,
    body: ReadableStream<Uint8Array>,
    bytes: number,
    signal?: AbortSignal,
  ) {
    await this.resource.ready;
    return this.keyed(key, async () => {
      await this.register(key);
      return this.raw.putOwnedBounded(key, body, bytes, signal);
    });
  }
  async read(key: string, maxBytes?: number) {
    if (this.resource.owners.getStore()) await this.register(key);
    return this.raw.read(key, maxBytes);
  }
  async stream(key: string, range?: Readonly<{ start: number; end: number }>) {
    if (this.resource.owners.getStore()) await this.register(key);
    return this.raw.stream(key, range);
  }
  async openOwnedRead(key: string, signal?: AbortSignal) {
    await this.resource.ready;
    return this.keyed(key, async () => {
      await this.register(key);
      return this.raw.openOwnedRead(key, signal);
    });
  }
  stat(key: string) {
    return this.raw.stat(key);
  }
  async remove(key: string) {
    await this.removeClaimed(key);
  }
  async removeClaimed(key: string): Promise<{ token: string }> {
    await this.resource.ready;
    if (this.resource.keys.has(key)) throw busy();
    return this.keyed(key, async () => {
      const token = randomUUID();
      const now = this.clock.now();
      const claimed = await this.uow.run((c) =>
        c.objectOperations.claimDelete(
          key,
          token,
          this.resource.owners.getStore() ?? null,
          now,
          new Date(now.getTime() + 60_000),
        ),
      );
      if (!claimed) throw busy();
      try {
        await this.raw.remove(key);
        if (
          !(await this.uow.run((c) =>
            c.objectOperations.finishDelete(key, token),
          ))
        )
          throw busy();
        return { token };
      } catch (error) {
        await this.uow.run((c) => c.objectOperations.releaseDelete(key, token));
        throw error;
      }
    });
  }
}
