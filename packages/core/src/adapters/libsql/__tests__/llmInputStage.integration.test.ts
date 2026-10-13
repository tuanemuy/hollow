import { createRequire, syncBuiltinESMExports } from "node:module";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { HollowUnitOfWorkContext } from "@repo/core/application/execution/hollowUnitOfWork";
import { llmAdmissionSource } from "@repo/core/application/llm/admissionSource";
import { completeLlm, replaceLlm } from "@repo/core/application/llm/completion";
import {
  cancelLlmRegeneration,
  undoLlmBody,
} from "@repo/core/application/llm/control";
import {
  beginPdfPreview,
  getPdfPreview,
  sweepPdfPreviews,
} from "@repo/core/application/llm/pdfPreview";
import { LlmOperationError } from "@repo/core/application/llm/ports";
import {
  admitLlm,
  requestLlmRegeneration,
} from "@repo/core/application/llm/request";
import { sweepLlm } from "@repo/core/application/llm/worker";
import { beginNotePurge } from "@repo/core/application/note/purge";
import { trashNoteInTransaction } from "@repo/core/application/note/trash";
import { canScope } from "@repo/core/application/workspace/access";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
import {
  PDF_PAGE_POLICY,
  PDF_PAGE_RENDERER,
  pdfPageManifest,
} from "@repo/core/domain/llm/pdfPreview";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createStageFixture } from "./llmInputStageFixtures";

type Fixture = Awaited<ReturnType<typeof createStageFixture>>;
let f: Fixture;
const databaseFailure = () =>
  new SystemError(SystemErrorCode.DatabaseError, "自己fixture応答不明");
function memory() {
  if (!f.memory) throw Error("APP_MEMORY");
  return f.memory;
}
function slot(n: number) {
  const value = f.slots.get(n);
  if (!value) throw Error("SLOT");
  return value;
}
async function row(jobId: string) {
  const value = await f.container.unitOfWorkProvider.run((u) =>
    u.llmConversions.find(jobId),
  );
  if (!value) throw Error("ROW");
  return value;
}
async function complete(value: LlmConversion) {
  await f.stage.finish(value);
  await f.container.unitOfWorkProvider.run(async (u) => {
    const current = await u.llmConversions.find(value.jobId);
    if (!current) throw Error("ROW");
    await completeLlm(
      f.container,
      u,
      current,
      { kind: "failed", code: "LLM_UNAVAILABLE" },
      f.container.clock.now(),
    );
  });
}
function claimFault(mode: "false" | "saved" | "unsaved") {
  const provider = f.container.unitOfWorkProvider;
  const original = provider.run.bind(provider);
  let armed = true;
  let planned:
    | Parameters<HollowUnitOfWorkContext["llmConversions"]["claimExact"]>[0]
    | null = null;
  provider.run = async <T>(
    work: (u: HollowUnitOfWorkContext) => Promise<T>,
  ) => {
    let reached = false;
    const result = await original(async (u) => {
      const exact = u.llmConversions.claimExact.bind(u.llmConversions);
      u.llmConversions.claimExact = async (input) => {
        if (!armed) return exact(input);
        planned = input;
        reached = true;
        if (mode === "false") return null;
        if (mode === "unsaved") {
          armed = false;
          throw databaseFailure();
        }
        return exact(input);
      };
      return work(u);
    });
    if (reached && armed) {
      armed = false;
      if (mode === "saved") throw databaseFailure();
    }
    return result;
  };
  return {
    planned: () => planned,
    restore: () => {
      provider.run = original;
    },
  };
}
beforeAll(async () => {
  f = await createStageFixture("app");
}, 120_000);
afterAll(async () => {
  if (f) await f.close();
}, 60_000);
describe("S3-A app transaction and input lifetime", () => {
  let started = 0;
  beforeAll(() => {
    started = performance.now();
  });
  beforeEach(() => {
    expect(performance.now() - started).toBeLessThan(120_000);
  });
  afterEach(() => {
    expect(performance.now() - started).toBeLessThan(120_000);
  });
  it("S3-A01 queued capacity busy leaves job, quota and version unchanged", async () => {
    const job = await f.request(1);
    const before = await row(job.jobId);
    const a = memory().reserveBegin({
      kind: "llm-conversion",
      id: f.container.idGenerator.next(),
    });
    const b = memory().reserveBegin({
      kind: "llm-conversion",
      id: f.container.idGenerator.next(),
    });
    expect(await f.stage.claim()).toBeNull();
    expect(await row(job.jobId)).toEqual(before);
    expect(
      (await f.container.unitOfWorkProvider.run((u) => u.jobs.find(job.jobId)))
        ?.attempt,
    ).toBe(0);
    memory().holdBegin(a);
    memory().holdBegin(b);
    const claimed = await f.stage.claim();
    if (!claimed) throw Error("CLAIM");
    await complete(claimed.value);
  });
  it("S3-A02 parallel candidates produce one atomic owner/receipt/job lease", async () => {
    const job = await f.request(2);
    const values = await Promise.all([f.stage.claim(), f.stage.claim()]);
    const claims = values.filter((value) => value !== null);
    expect(claims).toHaveLength(1);
    const claim = claims[0];
    if (!claim) throw Error("CLAIM");
    const saved = await row(job.jobId);
    expect(saved.owner.runtimeId).toBe(saved.inputReceipt?.runtimeId);
    expect(saved.owner.token).toBe(saved.inputReceipt?.token);
    expect(saved.sourceMemoryBytes).toBe(52_428_800);
    expect(
      (await f.container.unitOfWorkProvider.run((u) => u.jobs.find(job.jobId)))
        ?.leaseToken,
    ).toBe(saved.owner.token);
    await complete(claim.value);
  });
  it("S3-A03 first exact false releases only the unsaved first admission", async () => {
    const job = await f.request(3);
    const before = await row(job.jobId);
    const fault = claimFault("false");
    try {
      expect(await f.stage.claim()).toBeNull();
    } finally {
      fault.restore();
    }
    expect(await row(job.jobId)).toEqual(before);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    await complete(claim.value);
  });
  it("S3-A04 saved claim response loss resumes the same receipt exactly once", async () => {
    const job = await f.request(4);
    const fault = claimFault("saved");
    try {
      expect(await f.stage.claim()).toBeNull();
    } finally {
      fault.restore();
    }
    const saved = await row(job.jobId);
    expect(saved.sourceMemoryBytes).toBe(52_428_800);
    const resumed = await f.stage.resume();
    expect(resumed).toHaveLength(1);
    expect(resumed[0]?.value.owner).toEqual(saved.owner);
    expect(resumed[0]?.value.inputReceipt).toEqual(saved.inputReceipt);
    expect(await f.stage.resume()).toHaveLength(0);
    if (!resumed[0]) throw Error("RESUME");
    await complete(resumed[0].value);
  });
  it("S3-A05 unsaved unknown replay false retains capacity then same-intent CAS fences the old write", async () => {
    const job = await f.request(5);
    const old = await row(job.jobId);
    const fault = claimFault("unsaved");
    try {
      expect(await f.stage.claim()).toBeNull();
    } finally {
      fault.restore();
    }
    const planned = fault.planned();
    if (!planned) throw Error("INTENT");
    expect(await row(job.jobId)).toEqual(old);
    const replay = claimFault("false");
    try {
      expect(await f.stage.resume()).toHaveLength(0);
    } finally {
      replay.restore();
    }
    expect(
      memory().tryReserveBegin({ kind: "llm-conversion", id: job.jobId }).kind,
    ).toBe("busy");
    const resumed = await f.stage.resume();
    expect(resumed).toHaveLength(1);
    expect(resumed[0]?.value.owner.token).toBe(planned.ownerToken);
    expect(resumed[0]?.value.inputReceipt?.generation).toBe(1);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmConversions.claimExact(planned),
      ),
    ).toBeNull();
    if (!resumed[0]) throw Error("RESUME");
    await complete(resumed[0].value);
  });
  it("S3-A06 unknown cancellation fence loses its response and settles only after exact terminal equality", async () => {
    const job = await f.request(6);
    const fault = claimFault("unsaved");
    try {
      expect(await f.stage.claim()).toBeNull();
    } finally {
      fault.restore();
    }
    const planned = fault.planned();
    if (!planned) throw Error("INTENT");
    await f.container.unitOfWorkProvider.run((u) =>
      u.llmConversions.cancelNote(slot(6).noteId, f.container.clock.now()),
    );
    const provider = f.container.unitOfWorkProvider;
    const original = provider.run.bind(provider);
    let armed = true;
    provider.run = async <T>(
      work: (u: HollowUnitOfWorkContext) => Promise<T>,
    ) => {
      let terminal = false;
      const result = await original(async (u) => {
        const replace = u.llmConversions.replace.bind(u.llmConversions);
        u.llmConversions.replace = async (next, version) => {
          const result = await replace(next, version);
          if (result && next.phase === "terminal") terminal = true;
          return result;
        };
        return work(u);
      });
      if (terminal && armed) {
        armed = false;
        throw databaseFailure();
      }
      return result;
    };
    try {
      expect(await f.stage.resume()).toHaveLength(0);
    } finally {
      provider.run = original;
    }
    expect(
      memory().tryReserveBegin({ kind: "llm-conversion", id: job.jobId }).kind,
    ).toBe("busy");
    expect(await f.stage.resume()).toHaveLength(0);
    const reserved = memory().tryReserveBegin({
      kind: "llm-conversion",
      id: job.jobId,
    });
    expect(reserved.kind).toBe("reserved");
    if (reserved.kind === "reserved") memory().holdBegin(reserved.admission);
    expect((await row(job.jobId)).outcome.kind).toBe("cancelled");
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmConversions.claimExact(planned),
      ),
    ).toBeNull();
    expect(
      (
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmQuota.reservation(job.jobId),
        )
      )?.state,
    ).toBe("released");
  });
  it("S3-A06 normal queued cancellation commits an exact terminal fence for the same unread unknown intent", async () => {
    const job = await f.request(6);
    const before = await row(job.jobId);
    const generic = await f.container.unitOfWorkProvider.run((u) =>
      u.jobs.find(job.jobId),
    );
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const reads = vi.spyOn(service.source, "read");
    const fault = claimFault("unsaved");
    try {
      expect(await f.stage.claim()).toBeNull();
    } finally {
      fault.restore();
    }
    const planned = fault.planned();
    if (!planned) throw Error("INTENT");
    try {
      await cancelLlmRegeneration(f.container, slot(6).token, job.jobId);
      const terminal = await row(job.jobId);
      expect(terminal).toEqual({
        ...before,
        phase: "terminal",
        outcome: { kind: "cancelled" },
        cancelGeneration: before.cancelGeneration + 1,
        version: before.version + 1,
        updatedAt: f.container.clock.now(),
      });
      const cancelledJob = await f.container.unitOfWorkProvider.run((u) =>
        u.jobs.find(job.jobId),
      );
      expect(cancelledJob).toEqual({
        ...generic,
        state: "cancelled",
        failure: null,
        leaseToken: null,
        leaseUntil: null,
        updatedAt: f.container.clock.now(),
      });
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmQuota.reservation(job.jobId),
          )
        )?.state,
      ).toBe("released");
      expect(
        memory().tryReserveBegin({ kind: "llm-conversion", id: job.jobId })
          .kind,
      ).toBe("busy");
      expect(await f.stage.resume()).toHaveLength(0);
      expect(await row(job.jobId)).toEqual(terminal);
      expect(
        await f.container.unitOfWorkProvider.run((u) => u.jobs.find(job.jobId)),
      ).toEqual(cancelledJob);
      const reserved = memory().tryReserveBegin({
        kind: "llm-conversion",
        id: job.jobId,
      });
      expect(reserved.kind).toBe("reserved");
      if (reserved.kind === "reserved") memory().holdBegin(reserved.admission);
      expect(
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmConversions.claimExact(planned),
        ),
      ).toBeNull();
      expect(reads).not.toHaveBeenCalled();
      expect(
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmDispatches.list(job.jobId),
        ),
      ).toEqual([]);
    } finally {
      reads.mockRestore();
    }
  });
  it("S3-A07 loss of editing role completes never-read cleanup and restored permission does not restart the old job", async () => {
    const job = await f.request(7);
    const note = await f.container.unitOfWorkProvider.run((u) =>
      u.notes.findById(slot(7).noteId),
    );
    if (!note || note.owner.kind !== "workspace") throw Error("WORKSPACE_NOTE");
    const workspaceId = note.owner.workspaceId;
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const reads = vi.spyOn(service.source, "read");
    const generators = f.generateCalls;
    try {
      await changeWorkspaceMember(f.container, slot(1).token, {
        workspaceId,
        accountId: slot(7).accountId,
        role: "viewer",
        expectedRole: "editor",
        ownerConfirmed: false,
      });
      const lost = await f.container.unitOfWorkProvider.run(async (u) => ({
        note: await u.notes.findById(note.id),
        role: await u.workspaces.role(workspaceId, slot(7).accountId),
        canEdit: await canScope(u, note.owner, slot(7).accountId, "edit"),
      }));
      expect(lost.role).toBe("viewer");
      expect(lost.canEdit).toBe(false);
      expect(lost.note?.version).toBe(note.version);
      expect(await f.stage.claim()).toBeNull();
      const saved = await row(job.jobId);
      expect(saved.phase).toBe("terminal");
      expect(saved.owner.state).toBe("idle");
      expect(saved.sourceMemoryBytes).toBe(0);
      expect(saved.inputReceipt).toBeNull();
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.jobs.find(job.jobId),
          )
        )?.state,
      ).toBe("cancelled");
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.llmQuota.reservation(job.jobId),
          )
        )?.state,
      ).toBe("released");
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.notes.findById(note.id),
          )
        )?.html,
      ).toBe(note.html);
      expect(reads).not.toHaveBeenCalled();
      expect(
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmDispatches.list(job.jobId),
        ),
      ).toEqual([]);
      await changeWorkspaceMember(f.container, slot(1).token, {
        workspaceId,
        accountId: slot(7).accountId,
        role: "editor",
        expectedRole: "viewer",
        ownerConfirmed: false,
      });
      expect(
        await f.container.unitOfWorkProvider.run((u) =>
          canScope(u, note.owner, slot(7).accountId, "edit"),
        ),
      ).toBe(true);
      await sweepLlm(f.container);
      expect(await row(job.jobId)).toEqual(saved);
      expect(reads).not.toHaveBeenCalled();
      expect(f.generateCalls).toBe(generators);
    } finally {
      reads.mockRestore();
    }
  });
  it("S3-A08 response-ready reclaims owner and next receipt in one transaction", async () => {
    const job = await f.request(8);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    await f.stage.finish(claim.value);
    await f.container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(job.jobId);
      if (!current || current.owner.state === "idle") throw Error("ROW");
      if (current.selection !== "fixed") throw Error("FIXED");
      await replaceLlm(u, current, {
        ...current,
        phase: "response-ready",
        owner: { ...current.owner, state: "closed" },
      });
    });
    const old = await row(job.jobId);
    const next = await f.stage.claim();
    if (!next) throw Error("CLAIM");
    expect(next.value.phase).toBe("finalizing");
    expect(next.value.owner.token).not.toBe(old.owner.token);
    expect(next.value.inputReceipt?.generation).toBe(2);
    expect(next.value.inputReceipt?.token).toBe(next.value.owner.token);
    await complete(next.value);
  });
  it("S3-A09 completed response resume does not send another generator request", async () => {
    const job = await f.request(8);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    const prepared = await f.storage.withOwner(
      { kind: "conversion-job", id: job.jobId },
      () => f.stage.prepare(claim.value, new AbortController().signal),
    );
    if (prepared.preparationVersion !== 1) throw Error("PREPARATION_VERSION");
    const segment = prepared.segments[0];
    if (!segment) throw Error("SEGMENT");
    await f.container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(job.jobId);
      if (
        !current ||
        current.owner.state === "idle" ||
        current.selection !== "fixed"
      )
        throw Error("ROW");
      await replaceLlm(u, current, { ...current, phase: "dispatching" });
      const dispatchId = f.container.idGenerator.next();
      await u.llmDispatches.prepare({
        id: dispatchId,
        jobId: job.jobId,
        ordinal: 0,
        input: segment.identity,
        runtimeId: current.owner.runtimeId,
        ownerToken: current.owner.token,
        state: "prepared",
        intentAt: null,
        response: null,
      });
      expect(await u.llmQuota.consume(job.jobId, f.container.clock.now())).toBe(
        true,
      );
      expect(
        await u.llmDispatches.intent(
          dispatchId,
          current.owner.token,
          f.container.clock.now(),
        ),
      ).toBe(true);
      expect(
        await u.llmDispatches.response(dispatchId, current.owner.token, {
          content: "<p>保存済みの応答</p>",
          finish: "stop",
          inputTokens: 1,
          outputTokens: 1,
        }),
      ).toBe(true);
      const dispatched = await u.llmConversions.find(job.jobId);
      if (
        !dispatched ||
        dispatched.owner.state === "idle" ||
        dispatched.selection !== "fixed"
      )
        throw Error("ROW");
      await replaceLlm(u, dispatched, {
        ...dispatched,
        phase: "response-ready",
        owner: { ...dispatched.owner, state: "closed" },
      });
    });
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const generate = service.generator.generate;
    let calls = 0;
    service.generator.generate = async () => {
      calls++;
      throw Error("RESEND");
    };
    try {
      await sweepLlm(f.container);
      expect((await f.finish(job.jobId)).outcome.kind).toBe("succeeded");
      expect(calls).toBe(0);
    } finally {
      service.generator.generate = generate;
    }
  });
  it("S3-A10 retains the legacy NULL receipt contract for unchanged local formats", async () => {
    const job = await f.request(10);
    const current = await row(job.jobId);
    expect(current.inputReceipt).toBeNull();
    expect(current.sourceMemoryBytes).toBe(0);
    const legacy = await f.container.unitOfWorkProvider.run((u) =>
      u.llmConversions.claim(
        f.container.clock.now(),
        f.ownership.runtimeId,
        f.container.idGenerator.next(),
      ),
    );
    if (!legacy) throw Error("CLAIM");
    expect(legacy.inputReceipt).toBeNull();
    await f.container.unitOfWorkProvider.run((u) =>
      completeLlm(
        f.container,
        u,
        legacy,
        { kind: "failed", code: "LLM_UNAVAILABLE" },
        f.container.clock.now(),
      ),
    );
  });
  it("S3-A11 input-only lifetime prevents physical purge; S3-A12 confirmed release allows collection", async () => {
    const job = await f.request(9);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    await f.container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(job.jobId);
      if (
        !current ||
        current.owner.state === "idle" ||
        current.selection !== "fixed"
      )
        throw Error("ROW");
      await replaceLlm(u, current, {
        ...current,
        phase: "terminal",
        outcome: { kind: "failed", code: "LLM_UNAVAILABLE" },
        owner: { ...current.owner, state: "closed" },
        responseBudget: 0,
      });
      await u.llmQuota.releaseUnsent(job.jobId, f.container.clock.now());
      const note = await u.notes.findById(slot(9).noteId);
      if (!note) throw Error("NOTE");
      const { operationId } = await trashNoteInTransaction(
        f.container,
        u,
        slot(9).accountId,
        { id: note.id, version: note.version, cancelProcessing: true },
      );
      await beginNotePurge(
        f.container,
        u,
        { id: note.id, operationId },
        "manual",
        slot(9).accountId,
      );
    });
    const token = f.container.idGenerator.next();
    const purge = await f.container.unitOfWorkProvider.run((u) =>
      u.purges.claim(
        f.container.clock.now(),
        token,
        new Date(f.container.clock.now().getTime() + 60_000),
      ),
    );
    if (!purge) throw Error("PURGE");
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.purges.readyToDelete(
          purge.id,
          token,
          slot(9).storageKey,
          f.container.clock.now(),
        ),
      ),
    ).toBe(false);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.purges.finish(purge.id, token, f.container.clock.now()),
      ),
    ).toBe(false);
    await f.stage.finish(claim.value);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.purges.readyToDelete(
          purge.id,
          token,
          slot(9).storageKey,
          f.container.clock.now(),
        ),
      ),
    ).toBe(true);
    const removed = await f.storage.removeClaimed(slot(9).storageKey);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.purges.completeObject(
          purge.id,
          token,
          slot(9).storageKey,
          removed.token,
          f.container.clock.now(),
        ),
      ),
    ).toBe(true);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.purges.finish(purge.id, token, f.container.clock.now()),
      ),
    ).toBe(true);
  });
  it("S3-A13 history pruning holds input receipts until the exact proof is committed", async () => {
    const job = await f.request(11);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    await f.container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(job.jobId);
      if (
        !current ||
        current.owner.state === "idle" ||
        current.selection !== "fixed"
      )
        throw Error("ROW");
      await replaceLlm(u, current, {
        ...current,
        phase: "terminal",
        outcome: { kind: "failed", code: "LLM_UNAVAILABLE" },
        owner: { ...current.owner, state: "closed" },
        responseBudget: 0,
      });
      await u.llmQuota.releaseUnsent(job.jobId, f.container.clock.now());
      await u.llmConversions.prune(
        new Date(f.container.clock.now().getTime() + 91 * 86400_000),
        100,
      );
    });
    expect((await row(job.jobId)).sourceMemoryBytes).toBe(52_428_800);
    await f.stage.finish(claim.value);
    await f.container.unitOfWorkProvider.run((u) =>
      u.llmConversions.prune(
        new Date(f.container.clock.now().getTime() + 91 * 86400_000),
        100,
      ),
    );
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmConversions.find(job.jobId),
      ),
    ).toBeNull();
  });
  it("S3-A14 rejects legacy/string proof; S3-A18 rolls back a failed second cleanup CAS and retains the real proof", async () => {
    const job = await f.request(12);
    const claim = await f.stage.claim();
    if (!claim?.lease) throw Error("CLAIM");
    await f.container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(job.jobId);
      if (!current || current.owner.state === "idle") throw Error("ROW");
      await replaceLlm(u, current, {
        ...current,
        owner: { ...current.owner, state: "unknown" },
      });
    });
    const unknown = await row(job.jobId);
    expect(f.ownership.inputPredecessor(unknown)).toBeNull();
    let proof: ReturnType<ReturnType<typeof memory>["finish"]> | undefined;
    const finishMemory = memory().finish.bind(memory());
    memory().finish = (lease, id) => {
      proof = finishMemory(lease, id);
      return proof;
    };
    try {
      await expect(f.stage.finish(claim.value)).rejects.toThrow();
    } finally {
      memory().finish = finishMemory;
    }
    if (!proof) throw Error("PROOF");
    const closureProof = proof;
    await expect(
      f.container.unitOfWorkProvider.run(async (u) => {
        const current = await u.llmConversions.find(job.jobId);
        if (!current || current.owner.state === "idle") throw Error("ROW");
        await replaceLlm(u, current, {
          ...current,
          owner: { ...current.owner, state: "closed" },
        });
        throw databaseFailure();
      }),
    ).rejects.toThrow();
    expect((await row(job.jobId)).owner.state).toBe("unknown");
    expect((await row(job.jobId)).sourceMemoryBytes).toBe(52_428_800);
    expect(memory().verify(closureProof, closureProof.receipt)).toBe(true);
    await f.container.unitOfWorkProvider.run(async (u) => {
      let current = await u.llmConversions.find(job.jobId);
      if (!current || current.owner.state === "idle") throw Error("ROW");
      await replaceLlm(u, current, {
        ...current,
        owner: { ...current.owner, state: "closed" },
      });
      current = await u.llmConversions.find(job.jobId);
      if (!current) throw Error("ROW");
      await replaceLlm(u, current, {
        ...current,
        inputReceipt: closureProof.receipt,
        sourceMemoryBytes: 0,
      });
    });
    await f.stage.finish(claim.value);
    const current = await row(job.jobId);
    await f.container.unitOfWorkProvider.run((u) =>
      completeLlm(
        f.container,
        u,
        current,
        { kind: "failed", code: "LLM_UNAVAILABLE" },
        f.container.clock.now(),
      ),
    );
  });
  it("S3-A15 never-read cancellation passes a full memory reservation and leaves the next candidate reachable", async () => {
    const cancelled = await f.request(1);
    const next = await f.request(2);
    await f.container.unitOfWorkProvider.run((u) =>
      u.llmConversions.cancelNote(slot(1).noteId, f.container.clock.now()),
    );
    const a = memory().reserveBegin({
      kind: "llm-conversion",
      id: f.container.idGenerator.next(),
    });
    const b = memory().reserveBegin({
      kind: "llm-conversion",
      id: f.container.idGenerator.next(),
    });
    expect(await f.stage.claim()).toBeNull();
    expect((await row(cancelled.jobId)).phase).toBe("terminal");
    expect((await row(cancelled.jobId)).inputReceipt).toBeNull();
    memory().holdBegin(a);
    memory().holdBegin(b);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    expect(claim.value.jobId).toBe(next.jobId);
    await complete(claim.value);
  });
  it("S3-A16 stale response-ready keeps prior consumed quota and never resends", async () => {
    const job = await f.request(3);
    const claim = await f.stage.claim();
    if (!claim) throw Error("CLAIM");
    await f.stage.finish(claim.value);
    await f.container.unitOfWorkProvider.run(async (u) => {
      const current = await u.llmConversions.find(job.jobId);
      if (
        !current ||
        current.selection !== "fixed" ||
        current.owner.state === "idle"
      )
        throw Error("ROW");
      await replaceLlm(u, current, { ...current, phase: "dispatching" });
      const id = f.container.idGenerator.next();
      await u.llmDispatches.prepare({
        id,
        jobId: job.jobId,
        ordinal: 0,
        input: { kind: "prepared-segment", sha256: "a".repeat(64), ordinal: 0 },
        runtimeId: current.owner.runtimeId,
        ownerToken: current.owner.token,
        state: "prepared",
        intentAt: null,
        response: null,
      });
      await u.llmQuota.consume(job.jobId, f.container.clock.now());
      await u.llmDispatches.intent(
        id,
        current.owner.token,
        f.container.clock.now(),
      );
      await u.llmDispatches.response(id, current.owner.token, {
        content: "<p>保存済み</p>",
        finish: "stop",
        inputTokens: 1,
        outputTokens: 1,
      });
      const dispatched = await u.llmConversions.find(job.jobId);
      if (
        !dispatched ||
        dispatched.owner.state === "idle" ||
        dispatched.selection !== "fixed"
      )
        throw Error("ROW");
      await replaceLlm(u, dispatched, {
        ...dispatched,
        phase: "response-ready",
        owner: { ...dispatched.owner, state: "closed" },
        cancelGeneration: 1,
      });
    });
    expect(await f.stage.claim()).toBeNull();
    expect((await row(job.jobId)).phase).toBe("terminal");
    expect(
      (
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmQuota.reservation(job.jobId),
        )
      )?.state,
    ).toBe("consumed");
  });
  it("S3-A17 the original committed order also fences duplicate replay and preserves one generation", async () => {
    await f.request(4);
    const fault = claimFault("saved");
    try {
      await f.stage.claim();
    } finally {
      fault.restore();
    }
    const planned = fault.planned();
    if (!planned) throw Error("INTENT");
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmConversions.claimExact(planned),
      ),
    ).toBeNull();
    const resumed = await f.stage.resume();
    expect(resumed).toHaveLength(1);
    if (!resumed[0]) throw Error("RESUME");
    expect(resumed[0].value.inputReceipt?.generation).toBe(1);
    await complete(resumed[0].value);
  });
  it("S3-A19 lost finish response holds object/execution/input until exact closed0 reconciliation", async () => {
    const request = await f.request(6);
    const provider = f.container.unitOfWorkProvider;
    const original = provider.run.bind(provider);
    let armed = true;
    let pauseNext = false;
    let waiting = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    provider.run = async <T>(
      work: (u: HollowUnitOfWorkContext) => Promise<T>,
    ) => {
      if (pauseNext) {
        pauseNext = false;
        waiting = true;
        await gate;
      }
      let closed = false;
      const result = await original(async (u) => {
        const replace = u.llmConversions.replace.bind(u.llmConversions);
        u.llmConversions.replace = async (next, version) => {
          const ok = await replace(next, version);
          if (
            ok &&
            next.jobId === request.jobId &&
            next.inputReceipt?.state === "closed" &&
            next.sourceMemoryBytes === 0
          )
            closed = true;
          return ok;
        };
        return work(u);
      });
      if (armed && closed) {
        armed = false;
        pauseNext = true;
        throw databaseFailure();
      }
      return result;
    };
    try {
      await sweepLlm(f.container);
      await vi.waitFor(() => expect(waiting).toBe(true), {
        timeout: 3000,
        interval: 10,
      });
      expect(f.execution.active(request.jobId)).toBe(true);
      expect(
        memory().tryReserveBegin({ kind: "llm-conversion", id: request.jobId })
          .kind,
      ).toBe("busy");
      const pins = await f.client.execute({
        sql: "SELECT count(*) AS n FROM object_writes WHERE owner_id=? AND active=1",
        args: [request.jobId],
      });
      expect(Number(pins.rows[0]?.["n"])).toBe(1);
      const current = await row(request.jobId);
      expect(current.inputReceipt?.state).toBe("closed");
      expect(current.sourceMemoryBytes).toBe(0);
      expect(
        await f.container.unitOfWorkProvider.run((u) =>
          u.llmDispatches.list(request.jobId),
        ),
      ).toEqual([]);
      release();
      expect((await f.finish(request.jobId)).outcome.kind).toBe("succeeded");
      const ended = await f.client.execute({
        sql: "SELECT count(*) AS n FROM object_writes WHERE owner_id=? AND active=1",
        args: [request.jobId],
      });
      expect(Number(ended.rows[0]?.["n"])).toBe(0);
      const admission = memory().tryReserveBegin({
        kind: "llm-conversion",
        id: request.jobId,
      });
      expect(admission.kind).toBe("reserved");
      if (admission.kind === "reserved")
        memory().holdBegin(admission.admission);
    } finally {
      release();
      provider.run = original;
    }
  }, 10_000);
});

describe("S3-R unchanged local paths through the same app DB", () => {
  let started = 0;
  beforeAll(() => {
    started = performance.now();
  });
  beforeEach(() => {
    expect(performance.now() - started).toBeLessThan(180_000);
  });
  afterEach(() => {
    expect(performance.now() - started).toBeLessThan(180_000);
  });
  it("S3-R Office recipe/limit and image recipe/limit keep explicit legacy inputs", async () => {
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const old = f.preparer.prepare;
    for (const [number, format, fail] of [
      [1, "docx", false],
      [2, "xlsx", true],
      [3, "image", false],
      [4, "image", true],
    ] as const) {
      await f.container.unitOfWorkProvider.run(async (u) => {
        const original = await u.imports.findOriginal(slot(number).originalId);
        if (!original) throw Error("ORIGINAL");
        await u.imports.saveOriginal({ ...original, format });
      });
      f.preparer.prepare = async (input) => {
        if (fail)
          throw new LlmOperationError("LLM_RESOURCE_LIMIT", "not-sent", true);
        if (input.preparationVersion === 2)
          return {
            kind: "text-blocks",
            preparationVersion: 2,
            identity: {
              kind: "prepared-document",
              preparationVersion: 2,
              sha256: "d".repeat(64),
            },
            coverage: {
              kind: "office-text",
              format: "docx",
              textComplete: true,
              units: [
                { ordinal: 0, kind: "body", firstBlock: 0, blockCount: 1 },
              ],
              uninterpretedMedia: 0,
            },
            segments: [
              {
                identity: {
                  kind: "prepared-segment",
                  sha256: "e".repeat(64),
                  ordinal: 0,
                },
                html: "<p>Office</p>",
                firstBlock: 0,
                blockCount: 1,
              },
            ],
            blocks: 1,
            notices: [],
            media: [],
          };
        if (input.preparationVersion === 3)
          return {
            kind: "single-raster",
            preparationVersion: 3,
            identity: {
              kind: "prepared-image",
              preparationVersion: 3,
              sha256: "f".repeat(64),
            },
            inputIdentity: {
              kind: "prepared-raster",
              sha256: "a".repeat(64),
              ordinal: 0,
            },
            raster: {
              mimeType: "image/png",
              bytes: new Uint8Array([1]),
              width: 1,
              height: 1,
            },
            coverage: {
              kind: "single-frame",
              codec: "png",
              sourceWidth: 1,
              sourceHeight: 1,
              orientation: 1,
              frames: 1,
              fullPixels: true,
              resized: false,
              cropped: false,
            },
            normalization: "srgb-white-v1",
          };
        throw Error("RECIPE");
      };
      const job = await f.request(number);
      await sweepLlm(f.container);
      const done = await f.finish(job.jobId);
      expect(done.outcome.kind).toBe(fail ? "failed" : "succeeded");
      expect(done.inputReceipt?.state).toBe("closed");
      expect(done.sourceMemoryBytes).toBe(0);
    }
    f.preparer.prepare = old;
  }, 10_000);
  it("S3-R undo and current OpenRouter epoch preserve prior body and reject stale credentials", async () => {
    await f.container.unitOfWorkProvider.run(async (u) => {
      const original = await u.imports.findOriginal(slot(5).originalId);
      if (!original) throw Error("ORIGINAL");
      await u.imports.saveOriginal({ ...original, format: "text" });
    });
    const before = await f.container.unitOfWorkProvider.run((u) =>
      u.notes.findById(slot(5).noteId),
    );
    const job = await f.request(5);
    await sweepLlm(f.container);
    expect((await f.finish(job.jobId)).outcome.kind).toBe("succeeded");
    await undoLlmBody(f.container, slot(5).token, job.jobId);
    expect(
      (
        await f.container.unitOfWorkProvider.run((u) =>
          u.notes.findById(slot(5).noteId),
        )
      )?.html,
    ).toBe(before?.html);
    const second = await f.request(5);
    await f.container.unitOfWorkProvider.run(async (u) => {
      const connection = await u.openRouterConnections.find(slot(5).accountId);
      if (!connection) throw Error("OR");
      await u.openRouterConnections.replace(
        {
          ...connection,
          epoch: connection.epoch + 1,
          version: connection.version + 1,
        },
        connection.version,
      );
    });
    expect(await f.stage.claim()).toBeNull();
    expect((await row(second.jobId)).phase).toBe("terminal");
  }, 10_000);
  it("S3-R PDF preview uses no quota; strict-text receipt is consumed and expired receipt cannot admit", async () => {
    f.advanceMonth();
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const classifier = service.pdfClassifier.classify;
    const prepare = f.preparer.prepare;
    const hash = "d".repeat(64);
    service.pdfClassifier.classify = async () => ({
      kind: "strict-text",
      preparationVersion: 2,
      promptVersion: 1,
      modelKind: "chat-text",
      preparedDocumentHash: hash,
      pages: 1,
      policy: "strict-text-v1",
    });
    f.preparer.prepare = async () => ({
      kind: "text-blocks",
      preparationVersion: 2,
      identity: {
        kind: "prepared-document",
        preparationVersion: 2,
        sha256: hash,
      },
      coverage: {
        kind: "pdf-text",
        pages: [
          { ordinal: 0, class: "text-covered", firstBlock: 0, blockCount: 1 },
        ],
      },
      segments: [
        {
          identity: {
            kind: "prepared-segment",
            sha256: "e".repeat(64),
            ordinal: 0,
          },
          html: "<p>PDF text</p>",
          firstBlock: 0,
          blockCount: 1,
        },
      ],
      blocks: 1,
      notices: [],
      media: [],
    });
    try {
      for (const number of [6, 7]) {
        await f.container.unitOfWorkProvider.run(async (u) => {
          const original = await u.imports.findOriginal(
            slot(number).originalId,
          );
          if (!original) throw Error("ORIGINAL");
          await u.imports.saveOriginal({ ...original, format: "pdf" });
        });
        const note = await f.container.unitOfWorkProvider.run((u) =>
          u.notes.findById(slot(number).noteId),
        );
        const connection = await f.container.unitOfWorkProvider.run((u) =>
          u.openRouterConnections.find(slot(number).accountId),
        );
        if (!note || connection?.state !== "linked") throw Error("SOURCE");
        const input = {
          noteId: note.id,
          noteVersion: note.version,
          expectedEpoch: connection.epoch,
          commandId: f.container.idGenerator.next(),
        };
        const before = await f.client.execute({
          sql: "SELECT count(*) AS n FROM llm_quota_reservations WHERE account_id=?",
          args: [slot(number).accountId],
        });
        const preview = await beginPdfPreview(
          f.container,
          slot(number).token,
          input,
        );
        await sweepPdfPreviews(f.container);
        await vi.waitFor(
          async () => {
            expect(
              (
                await getPdfPreview(f.container, slot(number).token, {
                  noteId: note.id,
                  commandId: input.commandId,
                })
              )?.state,
            ).toBe("ready");
          },
          { timeout: 3000, interval: 10 },
        );
        const after = await f.client.execute({
          sql: "SELECT count(*) AS n FROM llm_quota_reservations WHERE account_id=?",
          args: [slot(number).accountId],
        });
        expect(after.rows[0]?.["n"]).toBe(before.rows[0]?.["n"]);
        const request = {
          ...input,
          commandId: f.container.idGenerator.next(),
          modelId: "fixture/text",
          instruction: "PDF",
          confirmed: true as const,
          previewId: preview.previewId,
        };
        if (number === 7) {
          const saved = await f.container.unitOfWorkProvider.run((u) =>
            u.llmPdfPreviews.find(preview.previewId),
          );
          if (!saved) throw Error("PREVIEW");
          f.now = new Date(saved.expiresAt.getTime() + 1);
          await expect(
            requestLlmRegeneration(f.container, slot(number).token, request),
          ).rejects.toMatchObject({ code: "LLM_PDF_PREVIEW_CHANGED" });
          await sweepPdfPreviews(f.container);
        } else {
          const requestJob = await requestLlmRegeneration(
            f.container,
            slot(number).token,
            request,
          );
          await sweepLlm(f.container);
          expect((await f.finish(requestJob.jobId)).outcome.kind).toBe(
            "succeeded",
          );
          expect(
            (
              await f.container.unitOfWorkProvider.run((u) =>
                u.llmPdfPreviews.find(preview.previewId),
              )
            )?.state,
          ).toBe("consumed");
        }
      }
    } finally {
      service.pdfClassifier.classify = classifier;
      f.preparer.prepare = prepare;
    }
  }, 10_000);
  it("S3-R pending PDF pages seals once and rejects the final body after current note changes", async () => {
    const number = 8;
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const classifier = service.pdfClassifier.classify;
    const redraw = service.pdfPages.redraw;
    const generator = service.generator.generate;
    const prepare = f.preparer.prepare;
    await f.container.unitOfWorkProvider.run(async (u) => {
      const original = await u.imports.findOriginal(slot(number).originalId);
      if (!original) throw Error("ORIGINAL");
      await u.imports.saveOriginal({ ...original, format: "pdf" });
    });
    let sealed = 0;
    let pages = 0;
    service.pdfClassifier.classify = async (input) => {
      sealed++;
      return {
        kind: "pages",
        preparationVersion: 4,
        promptVersion: 3,
        modelKind: "chat-image",
        reason: "VISUAL_CONTENT",
        manifest: pdfPageManifest({
          kind: "pdf-pages",
          preparationVersion: 4,
          source: input.source,
          policy: PDF_PAGE_POLICY,
          renderer: PDF_PAGE_RENDERER,
          total: 1,
          pages: [
            {
              ordinal: 0,
              width: 1,
              height: 1,
              bytes: 1,
              sha256: "a".repeat(64),
            },
          ],
          sha256: "b".repeat(64),
        }),
      };
    };
    f.preparer.prepare = async (input) => {
      if (input.preparationVersion !== 4) throw Error("PDF");
      return {
        kind: "pdf-pages",
        preparationVersion: 4,
        manifest: input.manifest,
      };
    };
    service.pdfPages.redraw = async () => {
      pages++;
      return {
        mimeType: "image/png",
        bytes: new Uint8Array([1]),
        width: 1,
        height: 1,
      };
    };
    let changedHtml = "";
    service.generator.generate = async (input) => {
      expect(input.kind).toBe("chat-image");
      await f.container.unitOfWorkProvider.run(async (u) => {
        const note = await u.notes.findById(slot(number).noteId);
        if (!note) throw Error("NOTE");
        changedHtml = "<p>保持する現在本文</p>";
        await u.notes.save(
          { ...note, html: changedHtml, version: note.version + 1 },
          note.version,
        );
      });
      return {
        content: "<p>不採用</p>",
        finish: "stop",
        inputTokens: 1,
        outputTokens: 1,
      };
    };
    try {
      const value = await f.container.unitOfWorkProvider.run(async (u) => {
        const note = await u.notes.findById(slot(number).noteId);
        const original = await u.imports.findOriginal(slot(number).originalId);
        const connection = await u.openRouterConnections.find(
          slot(number).accountId,
        );
        if (!note || !original || connection?.state !== "linked")
          throw Error("SOURCE");
        const batchId = f.container.idGenerator.next();
        const jobId = f.container.idGenerator.next();
        const now = f.container.clock.now();
        await u.imports.insertBatch({
          requestedVisibility: "private",
          id: batchId,
          accountId: slot(number).accountId,
          createdAt: now,
          useAi: true,
          cancelledAt: null,
        });
        await u.jobs.insert({
          id: jobId,
          batchId,
          originalId: original.id,
          accountId: slot(number).accountId,
          noteId: note.id,
          noteVersion: note.version,
          useAi: true,
          createdAt: now,
          updatedAt: now,
          attempt: 0,
          retryOf: null,
          state: "queued",
          leaseToken: null,
          leaseUntil: null,
          failure: null,
        });
        return admitLlm(f.container, u, {
          jobId,
          accountId: slot(number).accountId,
          commandId: f.container.idGenerator.next(),
          requestDigest: "a".repeat(64),
          note,
          source: llmAdmissionSource(original, "fixture/text", undefined),
          operation: "import",
          instruction: "PDF",
          epoch: connection.epoch,
          retryOf: null,
          pdf: {
            kind: "pending",
            candidates: {
              settingsVersion: 1,
              textModelId: "fixture/text",
              imageModelId: "fixture/image",
            },
          },
        });
      });
      expect(value.selection).toBe("pdf-pending");
      await sweepLlm(f.container);
      const done = await f.finish(value.jobId);
      expect(done.outcome.kind).toBe("failed");
      expect(done.inputReceipt?.state).toBe("closed");
      expect(done.sourceMemoryBytes).toBe(0);
      expect(sealed).toBe(1);
      expect(pages).toBe(1);
      expect(
        (
          await f.container.unitOfWorkProvider.run((u) =>
            u.notes.findById(slot(number).noteId),
          )
        )?.html,
      ).toBe(changedHtml);
    } finally {
      service.pdfClassifier.classify = classifier;
      service.pdfPages.redraw = redraw;
      service.generator.generate = generator;
      f.preparer.prepare = prepare;
    }
  }, 10_000);
  it("S3-R finish checks file identity after the asynchronous WAL writer has stopped", async () => {
    f.advanceMonth();
    await f.container.unitOfWorkProvider.run(async (u) => {
      const original = await u.imports.findOriginal(slot(1).originalId);
      if (!original) throw Error("ORIGINAL");
      await u.imports.saveOriginal({ ...original, format: "text" });
    });
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    const generate = service.generator.generate;
    let release = () => {};
    const allowed = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered = false;
    service.generator.generate = async (input, signal) => {
      entered = true;
      await allowed;
      return generate(input, signal);
    };
    const job = await f.request(1);
    const fs = createRequire(import.meta.url)(
      "node:fs/promises",
    ) as typeof import("node:fs/promises");
    const originalLstat = fs.lstat;
    const provider = f.container.unitOfWorkProvider;
    const run = provider.run.bind(provider);
    let armed = false;
    provider.run = <T>(work: (u: HollowUnitOfWorkContext) => Promise<T>) =>
      run(async (u) => {
        if (armed) {
          const find = u.llmConversions.find.bind(u.llmConversions);
          u.llmConversions.find = async (id) => {
            if (id === job.jobId) release();
            return find(id);
          };
        }
        return work(u);
      });
    const observation: { before: number; after: number }[] = [];
    const stat = vi.spyOn(fs, "lstat").mockImplementation(async (...args) => {
      const value = await originalLstat(...args);
      if (
        String(args[0]) === `${f.databaseFile}-wal` &&
        f.execution.active(job.jobId)
      ) {
        release();
        await vi.waitFor(() =>
          expect(f.execution.active(job.jobId)).toBe(false),
        );
        const after = await originalLstat(...args);
        expect(after.dev).toBe(value.dev);
        expect(after.ino).toBe(value.ino);
        observation.push({
          before: Number(value.size),
          after: Number(after.size),
        });
        console.info({ walInterleave: observation });
      }
      return value;
    });
    syncBuiltinESMExports();
    try {
      await sweepLlm(f.container);
      await vi.waitFor(() => expect(entered).toBe(true));
      expect(f.execution.active(job.jobId)).toBe(true);
      armed = true;
      const finished = f.finish(job.jobId);
      const result = await finished;
      expect(result.outcome.kind).toBe("succeeded");
      expect(result.inputReceipt?.state).toBe("closed");
      expect(result.sourceMemoryBytes).toBe(0);
      expect(f.execution.active(job.jobId)).toBe(false);
      expect(observation).toEqual([]);
      await f.guard();
    } finally {
      release();
      stat.mockRestore();
      syncBuiltinESMExports();
      provider.run = run;
      service.generator.generate = generate;
    }
  });
  it("S3-R monthly30 boundary keeps ordinary limit and rejects the 31st admission without read", async () => {
    const service = f.container.llm;
    if (!service) throw Error("SERVICE");
    expect(service.monthlyLimit).toBe(30);
    f.advanceMonth();
    await f.container.unitOfWorkProvider.run(async (u) => {
      const original = await u.imports.findOriginal(slot(1).originalId);
      if (!original) throw Error("ORIGINAL");
      await u.imports.saveOriginal({ ...original, format: "text" });
    });
    const before = f.generateCalls;
    for (let n = 0; n < 30; n++) {
      const job = await f.request(1);
      await sweepLlm(f.container);
      const done = await f.finish(job.jobId);
      expect(done.outcome.kind).toBe("succeeded");
      expect(done.inputReceipt?.state).toBe("closed");
      expect(done.sourceMemoryBytes).toBe(0);
    }
    expect(f.generateCalls).toBe(before + 30);
    const reads = vi.spyOn(service.source, "read");
    const denied = await f.request(1);
    await sweepLlm(f.container);
    expect(reads).not.toHaveBeenCalled();
    reads.mockRestore();
    const done = await row(denied.jobId);
    expect(done.phase).toBe("terminal");
    expect(done.outcome).toEqual({ kind: "failed", code: "LLM_MONTHLY_LIMIT" });
    expect(done.owner.state).toBe("idle");
    expect(done.inputReceipt).toBeNull();
    expect(f.generateCalls).toBe(before + 30);
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmQuota.reservation(denied.jobId),
      ),
    ).toBeNull();
    expect(
      await f.container.unitOfWorkProvider.run((u) =>
        u.llmDispatches.list(denied.jobId),
      ),
    ).toEqual([]);
    const usage = await f.container.unitOfWorkProvider.run((u) =>
      u.llmQuota.usage(slot(1).accountId, f.now.toISOString().slice(0, 7)),
    );
    expect(usage?.consumed).toBe(30);
    expect(usage?.reserved).toBe(0);
  }, 10_000);
});
