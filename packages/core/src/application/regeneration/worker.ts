import { BusinessRuleError } from "@repo/core/domain/error";
import type { MachineRegeneration } from "@repo/core/domain/regeneration/entity";
import { sameMachineSource } from "@repo/core/domain/regeneration/machine";
import { SOURCE_MEMORY_BYTES } from "@repo/core/domain/regeneration/source";
import type { HollowContainer } from "../di/hollowTypes";
import { ForbiddenError, NotFoundError } from "../errors";
import { withObjectOwner } from "../import/withObjectOwner";
import { LlmObjectOwnershipUnprovenError } from "../llm/ownershipError";
import { isLlmOperationError, LlmOperationError } from "../llm/ports";
import { adoptBody, prepareBody } from "./body";
import { completeMachine } from "./completion";
import { currentMachine } from "./current";
import { finishInput } from "./memory";
import {
  type MachineOwnedInput,
  type MachinePredecessor,
  type MachineRuntimeOwnership,
  sourceStateInvalid,
} from "./services";
import { readInput } from "./source";

const unproven = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
function receiptMatches(
  a: MachineRegeneration["inputReceipt"],
  b: MachineRegeneration["inputReceipt"],
) {
  return (
    a !== null &&
    b !== null &&
    a.consumer.kind === b.consumer.kind &&
    a.consumer.id === b.consumer.id &&
    a.runtimeId === b.runtimeId &&
    a.token === b.token &&
    a.generation === b.generation
  );
}
async function predecessorSettled(
  c: HollowContainer,
  ownership: MachineRuntimeOwnership,
  predecessor: MachinePredecessor,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const value = await u.machineRegenerations.find(
      predecessor.proof.receipt.consumer.id,
    );
    if (
      !value ||
      !ownership.verifyMachinePredecessor(predecessor, value) ||
      value.phase !== "terminal" ||
      value.outcome !== "failed" ||
      value.failure !== "REGENERATION_INTERRUPTED" ||
      value.owner.state !== "closed" ||
      value.sourceMemoryBytes !== 0
    )
      return false;
    const job = await u.jobs.find(value.id);
    const original = await u.imports.findOriginal(value.originalId);
    return (
      !!job &&
      job.state === "failed" &&
      job.failure === value.failure &&
      job.leaseToken === null &&
      job.leaseUntil === null &&
      !job.useAi &&
      job.accountId === value.executorId &&
      job.noteId === value.noteId &&
      job.originalId === value.originalId &&
      !!original &&
      (original.activeJobId !== value.id ||
        (original.state === value.previous.state &&
          original.coverage === value.previous.coverage))
    );
  });
}
export async function recoverMachine(c: HollowContainer) {
  const s = c.machine;
  if (!s) return;
  for (const runtime of s.ownership.predecessors()) {
    const pending = s.ownership.pendingMachinePredecessors(runtime);
    for (const proof of pending) {
      if (proof.proof.receipt.consumer.kind !== "machine-regeneration")
        continue;
      if (await predecessorSettled(c, s.ownership, proof))
        s.ownership.consumeMachinePredecessor(proof);
    }
    const rows = await c.unitOfWorkProvider.run((u) =>
      u.machineRegenerations.owned(runtime),
    );
    for (const value of rows) {
      const proof = s.ownership.machinePredecessor(value);
      if (!proof) throw unproven();
      await c.unitOfWorkProvider.run(async (u) => {
        const saved = await u.machineRegenerations.find(value.id);
        if (
          !saved ||
          saved.owner.state === "none" ||
          saved.version !== value.version ||
          !s.ownership.verifyMachinePredecessor(proof, saved)
        )
          throw unproven();
        const now = c.clock.now();
        const closed: MachineRegeneration = {
          ...saved,
          phase: "terminal",
          outcome: "failed",
          failure: "REGENERATION_INTERRUPTED",
          resultVersion: null,
          terminalAt: saved.terminalAt ?? now,
          owner: { ...saved.owner, state: "closed" },
          version: saved.version + 1,
          updatedAt: now,
        };
        if (!(await u.machineRegenerations.replace(closed, saved.version)))
          throw unproven();
        const ended =
          proof.kind === "input"
            ? {
                ...closed,
                inputReceipt: proof.proof.receipt,
                sourceMemoryBytes: 0 as const,
                version: closed.version + 1,
              }
            : closed;
        if (
          (proof.kind === "input" &&
            !(await u.machineRegenerations.replace(ended, closed.version))) ||
          !(await u.machineRegenerations.finishJob(ended, now))
        )
          throw unproven();
        const original = await u.imports.findOriginal(value.originalId);
        if (original?.activeJobId === value.id)
          await u.imports.saveOriginal({
            ...original,
            state: value.previous.state,
            coverage: value.previous.coverage,
          });
      });
      if (!(await predecessorSettled(c, s.ownership, proof))) throw unproven();
      s.ownership.consumeMachinePredecessor(proof);
    }
    // Other consumers must finish their own recovery before the shared owner ACK.
    if (
      !s.ownership.pendingMachinePredecessors(runtime).length &&
      !(
        await c.unitOfWorkProvider.run((u) =>
          u.machineRegenerations.owned(runtime),
        )
      ).length &&
      !(await c.unitOfWorkProvider.run((u) => u.llmConversions.owned(runtime)))
        .length &&
      !(await c.unitOfWorkProvider.run((u) => u.llmPdfPreviews.owned(runtime)))
        .length
    )
      await s.ownership.acknowledge(runtime);
  }
}
async function claim(c: HollowContainer) {
  const s = c.machine;
  if (!s) return null;
  let intent = s.progress.admissions()[0];
  if (!intent) {
    const candidate = await c.unitOfWorkProvider.run(async (u) => {
      const value = await u.machineRegenerations.candidate();
      if (!value) return null;
      try {
        await currentMachine(c, u, value);
      } catch (error) {
        if (
          !(error instanceof BusinessRuleError) &&
          !(error instanceof NotFoundError) &&
          !(error instanceof ForbiddenError)
        )
          throw error;
        await completeMachine(
          c,
          u,
          value,
          value.cancelGeneration > 0 ? "cancelled" : "failed",
          "REGENERATION_SOURCE_CHANGED",
        );
        return null;
      }
      return value;
    });
    if (!candidate) return null;
    const reserved = s.input.tryReserveBegin({
      kind: "machine-regeneration",
      id: candidate.id,
    });
    if (reserved.kind === "busy") return null;
    const receipt = {
      consumer: reserved.admission.consumer,
      runtimeId: s.ownership.runtimeId,
      token: c.idGenerator.next(),
      generation: (candidate.inputReceipt?.generation ?? 0) + 1,
      state: "active" as const,
    };
    s.input.bindBegin(reserved.admission, receipt);
    intent = { candidate, admission: reserved.admission, receipt };
    s.progress.retainAdmission(intent);
  }
  const chosen = intent;
  const committed = await s.input.claimTransaction(
    chosen.admission,
    c.unitOfWorkProvider,
    async (u) => {
      const saved = await u.machineRegenerations.find(chosen.candidate.id);
      if (!saved) return { kind: "no-claim" };
      const original = chosen.candidate;
      if (
        saved.owner.runtimeId === chosen.receipt.runtimeId &&
        saved.owner.token === chosen.receipt.token &&
        receiptMatches(saved.inputReceipt, chosen.receipt) &&
        saved.sourceMemoryBytes === SOURCE_MEMORY_BYTES &&
        saved.phase === "acquiring" &&
        saved.version === original.version + 1 &&
        sameMachineSource({ ...original, owner: saved.owner }, saved)
      )
        return { kind: "claimed", value: saved };
      if (
        saved.phase === "terminal" &&
        saved.outcome === "cancelled" &&
        saved.owner.state === "none" &&
        saved.sourceMemoryBytes === 0 &&
        saved.version === original.version + 1 &&
        saved.cancelGeneration === original.cancelGeneration + 1 &&
        saved.failure === null &&
        saved.resultVersion === null &&
        saved.terminalAt?.getTime() === saved.updatedAt.getTime() &&
        sameMachineSource(saved, original) &&
        JSON.stringify(saved.inputReceipt) ===
          JSON.stringify(original.inputReceipt)
      )
        return { kind: "cancelled-fence" };
      if (
        saved.version !== original.version ||
        saved.phase !== "queued" ||
        saved.owner.state !== "none"
      )
        return { kind: "no-claim" };
      try {
        await currentMachine(c, u, saved);
      } catch (error) {
        if (
          !(error instanceof BusinessRuleError) &&
          !(error instanceof NotFoundError) &&
          !(error instanceof ForbiddenError)
        )
          throw error;
        await completeMachine(
          c,
          u,
          saved,
          saved.cancelGeneration > 0 ? "cancelled" : "failed",
          "REGENERATION_SOURCE_CHANGED",
        );
        return { kind: "fenced" };
      }
      const value: MachineRegeneration = {
        ...saved,
        phase: "acquiring",
        owner: {
          state: "active",
          runtimeId: chosen.receipt.runtimeId,
          token: chosen.receipt.token,
        },
        inputReceipt: chosen.receipt,
        sourceMemoryBytes: SOURCE_MEMORY_BYTES,
        version: saved.version + 1,
        updatedAt: c.clock.now(),
      };
      return (await u.machineRegenerations.claimExact(
        value,
        saved.version,
        c.clock.now(),
      ))
        ? { kind: "claimed", value }
        : { kind: "no-claim" };
    },
  );
  if (committed.result.kind !== "claimed") {
    if (
      committed.result.kind !== "no-claim" ||
      !s.input.hasPendingBegin(chosen.admission)
    )
      s.progress.releaseAdmission(chosen.candidate.id);
    return null;
  }
  if (!committed.lease) throw unproven();
  s.progress.releaseAdmission(chosen.candidate.id);
  const owned = {
    value: committed.result.value,
    lease: committed.lease,
    proof: null,
  };
  s.progress.retainInput(owned);
  return owned;
}
async function runOwned(
  c: HollowContainer,
  owned: MachineOwnedInput,
  signal: AbortSignal,
) {
  const s = c.machine;
  if (!s) return;
  let extraction: Awaited<ReturnType<typeof s.input.prepareMachine>> | null =
    null;
  let failure: string | null = null;
  let driveBody: Awaited<ReturnType<typeof prepareBody>> | null = null;
  try {
    await readInput(c, s, owned.lease, signal);
    await c.unitOfWorkProvider.run(async (u) => {
      const v = await u.machineRegenerations.find(owned.value.id);
      if (!v || !sameMachineSource(v, owned.value)) return sourceStateInvalid();
      await currentMachine(c, u, v);
      if (
        !(await u.machineRegenerations.replace(
          {
            ...v,
            phase: "preparing",
            version: v.version + 1,
            updatedAt: c.clock.now(),
          },
          v.version,
        ))
      )
        return sourceStateInvalid();
    });
    extraction = await s.input.prepareMachine(
      owned.lease,
      owned.value.source,
      signal,
    );
    if (owned.value.access.origin === "drive-record") {
      const note = await c.unitOfWorkProvider.run(async (u) => {
        const value = await u.machineRegenerations.find(owned.value.id);
        if (!value || !sameMachineSource(value, owned.value))
          return sourceStateInvalid();
        return (await currentMachine(c, u, value)).note;
      });
      driveBody = await prepareBody(c, note, extraction.html);
      await c.unitOfWorkProvider.run(async (u) => {
        const value = await u.machineRegenerations.find(owned.value.id);
        if (!value || !sameMachineSource(value, owned.value))
          return sourceStateInvalid();
        await currentMachine(c, u, value);
        if (
          !(await u.machineRegenerations.replace(
            {
              ...value,
              phase: "final-check",
              version: value.version + 1,
              updatedAt: c.clock.now(),
            },
            value.version,
          ))
        )
          return sourceStateInvalid();
      });
      await readInput(c, s, owned.lease, signal, "final-check");
    }
  } catch (error) {
    if (
      !(error instanceof BusinessRuleError) &&
      !(isLlmOperationError(error) && error.closed)
    ) {
      s.input.unknown(owned.lease);
      throw unproven();
    }
    failure = error.code;
    if (!s.input.owns(owned.lease)) throw unproven();
    s.input.discard(owned.lease);
  }
  const proof = s.input.finish(owned.lease, c.idGenerator.next());
  s.progress.retainInput({ ...owned, proof });
  try {
    await finishInput(c, s, proof);
    const source = await c.unitOfWorkProvider.run(async (u) => {
      const v = await u.machineRegenerations.find(owned.value.id);
      if (!v) return sourceStateInvalid();
      return { v, note: await u.notes.findById(v.noteId) };
    });
    let body: Awaited<ReturnType<typeof prepareBody>> | null = driveBody;
    if (
      owned.value.access.origin !== "drive-record" &&
      extraction &&
      source.note
    ) {
      try {
        body = await prepareBody(c, source.note, extraction.html);
      } catch (error) {
        if (!(error instanceof BusinessRuleError)) throw unproven();
        failure = error.code;
      }
    }
    await c.unitOfWorkProvider.run(async (u) => {
      const v = await u.machineRegenerations.find(owned.value.id);
      if (
        !v ||
        !sameMachineSource(v, owned.value) ||
        v.sourceMemoryBytes !== 0 ||
        v.inputReceipt?.state !== "closed" ||
        v.inputReceipt.proofId !== proof.receipt.proofId
      )
        return sourceStateInvalid();
      let current: Awaited<ReturnType<typeof currentMachine>> | null = null;
      try {
        current = await currentMachine(c, u, v);
      } catch (error) {
        if (
          !(error instanceof BusinessRuleError) &&
          !(error instanceof NotFoundError) &&
          !(error instanceof ForbiddenError)
        )
          throw error;
        failure = "REGENERATION_SOURCE_CHANGED";
      }
      if (signal.aborted || !current || !body || failure) {
        await completeMachine(
          c,
          u,
          v,
          v.cancelGeneration > 0 ? "cancelled" : "failed",
          failure ?? "REGENERATION_CANCELLED",
        );
        return;
      }
      const note = await adoptBody(
        c,
        u,
        current.note,
        v.id,
        v.executorId,
        body,
      );
      await u.imports.replaceNotices(v.originalId, [
        ...(extraction?.notices ?? []),
        ...body.safe.removed.map((message) => ({
          code: "SANITIZED",
          location: "本文",
          message,
        })),
      ]);
      await completeMachine(
        c,
        u,
        v,
        "succeeded",
        null,
        note.version,
        extraction?.coverage,
      );
    });
  } catch {
    await s.progress.awaitCompletion({ ...owned, proof });
  }
  s.progress.releaseInput(owned.value.id);
}
export async function sweepMachine(c: HollowContainer, admit = true) {
  const s = c.machine;
  if (!s) return;
  for (const row of s.progress.inputs()) {
    if (
      !row.proof ||
      (s.execution.active(row.value.id) &&
        !s.progress.pendingCompletion(row.value.id))
    )
      continue;
    if (!s.input.consumed(row.proof, row.lease))
      await finishInput(c, s, row.proof);
    await c.unitOfWorkProvider.run(async (u) => {
      const value = await u.machineRegenerations.find(row.value.id);
      if (
        !value ||
        !sameMachineSource(value, row.value) ||
        value.inputReceipt?.state !== "closed" ||
        value.inputReceipt.proofId !== row.proof?.receipt.proofId ||
        value.sourceMemoryBytes !== 0
      )
        throw unproven();
      if (value.phase !== "terminal")
        await completeMachine(
          c,
          u,
          value,
          value.cancelGeneration > 0 ? "cancelled" : "failed",
          "REGENERATION_INTERRUPTED",
        );
    });
    if (s.progress.pendingCompletion(row.value.id)) {
      if (!(await s.progress.confirmCompletion(row))) throw unproven();
    } else s.progress.releaseInput(row.value.id);
  }
  if (!admit) return;
  const owned = await claim(c);
  if (!owned) return;
  const started = s.execution.start(
    owned.value.id,
    owned.value.executorId,
    owned.value.deadlineAt,
    (signal) =>
      withObjectOwner(
        c,
        { kind: "conversion-job", id: owned.value.id },
        async () => {
          try {
            await runOwned(c, owned, signal);
          } catch {
            if (!s.progress.owned(owned.value.id)?.proof) {
              s.input.unknown(owned.lease);
              await c.unitOfWorkProvider
                .run(async (u) => {
                  const value = await u.machineRegenerations.find(
                    owned.value.id,
                  );
                  if (
                    !value ||
                    value.owner.state !== "active" ||
                    !sameMachineSource(value, owned.value) ||
                    !value.inputReceipt ||
                    value.inputReceipt.state === "closed"
                  )
                    throw unproven();
                  const now = c.clock.now();
                  if (
                    !(await u.machineRegenerations.replace(
                      {
                        ...value,
                        phase: "terminal",
                        outcome: "unknown",
                        failure: "REGENERATION_OWNERSHIP_UNKNOWN",
                        resultVersion: null,
                        owner: { ...value.owner, state: "unknown" },
                        inputReceipt: {
                          ...value.inputReceipt,
                          state: "unknown",
                        },
                        version: value.version + 1,
                        updatedAt: now,
                        terminalAt: now,
                      },
                      value.version,
                    ))
                  )
                    throw unproven();
                })
                .catch(() => {});
            }
            throw new LlmObjectOwnershipUnprovenError(owned.value.id);
          }
        },
      ),
  );
  if (!started) {
    const proof = s.input.finish(owned.lease, c.idGenerator.next());
    s.progress.retainInput({ ...owned, proof });
    await finishInput(c, s, proof);
    await c.unitOfWorkProvider.run(async (u) => {
      const value = await u.machineRegenerations.find(owned.value.id);
      if (!value || !sameMachineSource(value, owned.value)) throw unproven();
      await completeMachine(c, u, value, "failed", "REGENERATION_BUSY");
    });
    s.progress.releaseInput(owned.value.id);
  }
}
