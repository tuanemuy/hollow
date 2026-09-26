import { randomUUID } from "node:crypto";
import type {
  BatchAcceptInput,
  BatchConfirmation,
} from "@repo/core/application/batch/ports";
import {
  acceptBatch,
  batchConfirmation,
  cancelBatch,
  getBatch,
  previewBatch,
  retryBatch,
} from "@repo/core/application/batch/usecases";
import {
  claimBatchAttempt,
  processBatchAttempt,
} from "@repo/core/application/batch/worker";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import {
  changeSharing,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { createNote } from "@repo/core/domain/note/entity";
import type { NoteVisibility } from "@repo/core/domain/sharing/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibsqlBatchRepository } from "../repositories/batchRepository";
import { createTestContainer, type TestContainer } from "./helpers";

describe("batch sharing current snapshots and durable outcomes", () => {
  let b: TestContainer;
  let c: HollowContainer;
  let actor: string;
  const session = "isolated-batch-sharing-session";
  const now = new Date("2026-09-26T07:00:00Z");
  const source = () => ({ kind: "personal" as const, accountId: actor });
  beforeEach(async () => {
    b = await createTestContainer();
    actor = randomUUID();
    await b.client.execute({
      sql: "insert into accounts values(?,?,?,?,?)",
      args: [actor, `${actor}@example.test`, "unused", +now, +now],
    });
    await b.client.execute({
      sql: "insert into sessions values(?,?,?)",
      args: [session, actor, +now + 86400000],
    });
    const base = createHollowContainer(b.db, "http://localhost", {
      async send() {},
    });
    c = {
      ...base,
      clock: { now: () => now },
      tokens: { generate: randomUUID, hash: (v) => v },
      passwordHasher: {
        async hash(v) {
          return `fixture:${v}`;
        },
        async verify(v, hash) {
          return hash === `fixture:${v}`;
        },
      },
      sharing: {
        protector: {
          protect: (v) => v,
          reveal: (v) => v,
          needsRotation: () => false,
        },
        passwordWork: { run: (work) => work(), async stop() {} },
      },
    };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    b.close();
  });
  async function note(html = "<p>body</p>") {
    const n = createNote(
      {
        id: randomUUID(),
        accountId: actor,
        title: "batch sharing",
        html,
        text: html ? "body" : "",
      },
      now,
    );
    await c.unitOfWorkProvider.run((u) => u.notes.insert(n));
    return n.id;
  }
  async function profile() {
    await b.client.execute({
      sql: "insert into account_public_profiles(account_id,handle,bio,version) values(?,?,'',0)",
      args: [actor, `batch-${actor}`],
    });
  }
  async function prepare(
    ids: readonly string[],
    visibility: NoteVisibility,
    parentId?: string,
  ): Promise<BatchAcceptInput> {
    const operation = { kind: "sharing" as const, visibility };
    const preview = await previewBatch(c, session, {
      ids,
      source: source(),
      operation,
      ...(parentId ? { parentId } : {}),
    });
    return {
      requestId: randomUUID(),
      source: source(),
      operation,
      items: preview.items.map(batchConfirmation),
    };
  }
  const settings = (id: string) =>
    c.unitOfWorkProvider.run((u) => u.sharing.find(id));
  async function step() {
    const claimed = await claimBatchAttempt(c, 60000);
    if (claimed) await processBatchAttempt(c, claimed);
    return claimed;
  }
  it("accepts all 500 fixed sharing snapshots and reports excluded IDs without metadata", async () => {
    const ids: string[] = [];
    await c.unitOfWorkProvider.run(async (u) => {
      for (let index = 0; index < 500; index++) {
        const n = createNote(
          {
            id: randomUUID(),
            accountId: actor,
            title: `合法対象${index}`,
            html: "",
            text: "",
          },
          now,
        );
        await u.notes.insert(n);
        ids.push(n.id);
      }
    });
    const items: BatchConfirmation[] = [];
    for (let start = 0; start < 500; start += 50)
      items.push(
        ...(await prepare(ids.slice(start, start + 50), "private")).items,
      );
    const input: BatchAcceptInput = {
      requestId: randomUUID(),
      source: source(),
      operation: { kind: "sharing", visibility: "private" },
      items,
    };
    const receipt = await acceptBatch(c, session, input);
    expect(receipt).toMatchObject({ total: 500, excluded: 0 });
    await step();
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.outcome,
    ).toEqual({ kind: "sharing", visibility: "private", change: "unchanged" });
    const hiddenId = randomUUID();
    const hidden = await prepare([hiddenId], "private");
    expect(hidden.items).toEqual([{ kind: "excluded", noteId: hiddenId }]);
    await expect(acceptBatch(c, session, hidden)).rejects.toMatchObject({
      code: "BATCH_EMPTY",
    });
    console.log(
      JSON.stringify({
        batchSharingMeasurement: {
          count: 500,
          bytes: Buffer.byteLength(JSON.stringify(input)),
        },
      }),
    );
  });
  it("saves changed/no-op results, keeps siblings after empty body failure, and preserves old outcomes", async () => {
    const ids = [await note(), await note(), await note("")];
    const same = ids[1];
    if (!same) throw Error("fixture");
    await changeSharing(c, session, {
      expected: (await getSharing(c, session, same)).expected,
      operation: { kind: "visibility", visibility: "link" },
    });
    const original = await settings(same);
    const receipt = await acceptBatch(c, session, await prepare(ids, "link"));
    await step();
    await step();
    await step();
    const view = await getBatch(c, session, { id: receipt.id });
    expect(view.items.map((r) => r.state)).toEqual([
      "succeeded",
      "succeeded",
      "failed",
    ]);
    expect(view.items[0]?.outcome).toEqual({
      kind: "sharing",
      visibility: "link",
      change: "changed",
    });
    expect(view.items[1]?.outcome).toEqual({
      kind: "sharing",
      visibility: "link",
      change: "unchanged",
    });
    expect(view.items[2]?.failure?.code).toBe("SHARE_BODY_REQUIRED");
    expect(await settings(same)).toEqual(original);
    await changeSharing(c, session, {
      expected: (await getSharing(c, session, same)).expected,
      operation: { kind: "visibility", visibility: "private" },
    });
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[1]?.outcome,
    ).toEqual(view.items[1]?.outcome);
  });
  it("does not accept public without the source prerequisite", async () => {
    await expect(prepare([await note()], "public")).rejects.toMatchObject({
      code: "SHARE_PUBLIC_HANDLE_REQUIRED",
    });
    expect(
      (await b.client.execute("select count(*) n from note_batches")).rows[0]
        ?.n,
    ).toBe(0);
  });
  it("binds public password-removal consent to each child version", async () => {
    await profile();
    const id = await note();
    await changeSharing(c, session, {
      expected: (await getSharing(c, session, id)).expected,
      operation: { kind: "password", password: "fixture-password" },
    });
    const input = await prepare([id], "public");
    await expect(acceptBatch(c, session, input)).rejects.toMatchObject({
      code: "BATCH_CHANGED",
    });
    const item = input.items[0];
    if (item?.kind !== "ready" || item.expected.kind !== "sharing")
      throw Error("fixture");
    const confirmed: BatchConfirmation = {
      ...item,
      expected: item.expected,
      consent: {
        kind: "remove-password",
        noteId: id,
        shareVersion: item.expected.snapshot.share.shareVersion,
      },
    };
    const receipt = await acceptBatch(c, session, {
      ...input,
      items: [confirmed],
    });
    await step();
    expect((await settings(id))?.passwordHash).toBeNull();
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.state,
    ).toBe("succeeded");
  });
  it("canonicalizes sharing payload order but rejects changed payload, and re-delivery cannot mutate", async () => {
    const id = await note();
    const input = await prepare([id], "link");
    const receipt = await acceptBatch(c, session, input);
    const reordered = JSON.parse(JSON.stringify(input), (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ) as BatchAcceptInput;
    expect(await acceptBatch(c, session, reordered)).toEqual(receipt);
    await expect(
      acceptBatch(c, session, {
        ...input,
        operation: { kind: "sharing", visibility: "private" },
      }),
    ).rejects.toMatchObject({ code: "BATCH_CHANGED" });
    const claimed = await step();
    if (!claimed) throw Error("fixture");
    const original = await settings(id);
    await processBatchAttempt(c, claimed);
    expect(await settings(id)).toEqual(original);
    expect(await acceptBatch(c, session, input)).toEqual(receipt);
  });
  it("rolls back mutation when child finish loses its lease, then stores only failure", async () => {
    const id = await note();
    const before = await settings(id);
    const receipt = await acceptBatch(c, session, await prepare([id], "link"));
    const finish = LibsqlBatchRepository.prototype.finish;
    vi.spyOn(LibsqlBatchRepository.prototype, "finish").mockImplementationOnce(
      async () => false,
    );
    await step();
    expect(await settings(id)).toEqual(before);
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.state,
    ).toBe("failed");
    LibsqlBatchRepository.prototype.finish = finish;
  });
  it("rejects stale acceptance and execution, then retries latest failure from fresh confirmation", async () => {
    const id = await note();
    const old = await prepare([id], "link");
    await changeSharing(c, session, {
      expected: (await getSharing(c, session, id)).expected,
      operation: { kind: "visibility", visibility: "private" },
    });
    await expect(acceptBatch(c, session, old)).rejects.toMatchObject({
      code: "BATCH_CHANGED",
    });
    const receipt = await acceptBatch(c, session, await prepare([id], "link"));
    await changeSharing(c, session, {
      expected: (await getSharing(c, session, id)).expected,
      operation: { kind: "visibility", visibility: "private" },
    });
    await step();
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.failure?.code,
    ).toBe("SHARE_CONFIRMATION_CHANGED");
    const input = await prepare([id], "link", receipt.id);
    const retry = { id: receipt.id, generation: 1, items: input.items };
    await retryBatch(c, session, retry);
    await step();
    expect(
      (await getBatch(c, session, { id: receipt.id })).items[0]?.state,
    ).toBe("succeeded");
    expect(await retryBatch(c, session, retry)).toEqual({
      id: receipt.id,
      total: 1,
    });
  });
  it("normal cancellation leaves the claimed child result and cancels waiting children", async () => {
    const ids = [await note(), await note("")];
    const receipt = await acceptBatch(
      c,
      session,
      await prepare(ids, "private"),
    );
    const claimed = await claimBatchAttempt(c, 60000);
    if (!claimed) throw Error("fixture");
    await cancelBatch(c, session, { id: receipt.id, generation: 1 });
    await processBatchAttempt(c, claimed);
    expect(
      (await getBatch(c, session, { id: receipt.id })).items.map(
        (r) => r.state,
      ),
    ).toEqual(["succeeded", "cancelled"]);
  });
});
