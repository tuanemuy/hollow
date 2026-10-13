import type { ConversionJob } from "@repo/core/domain/job/entity";
import type {
  LlmConversion,
  LlmDispatch,
  LlmOutcome,
  LlmQuotaReservation,
} from "@repo/core/domain/llm/entity";
import type { SourceInputReceipt } from "@repo/core/domain/regeneration/source";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { completeLlm } from "./completion";
import { currentLlmSource } from "./current";
import {
  type DriveLlmData,
  type DriveLlmDispatchData,
  type DriveLlmPrewrite,
  type DriveLlmQuotaData,
  type DriveLlmTerminalCall,
  isLlmOperationError,
  LlmOperationError,
} from "./ports";

export function leasedDrive(value: LlmConversion) {
  return (
    value.access.origin === "drive-record" &&
    value.selection === "fixed" &&
    value.operation === "regenerate"
  );
}

export function leasedText(value: LlmConversion) {
  return (
    value.access.origin === "local-original" &&
    value.selection === "fixed" &&
    value.preparationVersion === 1
  );
}
export function leasedLocal(value: LlmConversion) {
  if (
    value.access.origin !== "local-original" ||
    value.access.bindingId !== null
  )
    return false;
  if (value.selection === "pdf-pending") return value.source.format === "pdf";
  return value.preparationVersion === 1
    ? value.promptVersion === 1
    : value.preparationVersion === 2
      ? value.promptVersion === 1
      : value.preparationVersion === 3
        ? value.promptVersion === 2
        : value.preparationVersion === 4
          ? value.promptVersion === 3
          : value.preparationVersion === 5 && value.promptVersion === 4;
}
export function sameInputSource(left: LlmConversion, right: LlmConversion) {
  return (
    left.jobId === right.jobId &&
    left.accountId === right.accountId &&
    left.noteId === right.noteId &&
    left.noteVersion === right.noteVersion &&
    left.credentialEpoch === right.credentialEpoch &&
    left.sourceOwnershipGeneration === right.sourceOwnershipGeneration &&
    JSON.stringify(left.source) === JSON.stringify(right.source) &&
    JSON.stringify(left.access) === JSON.stringify(right.access) &&
    left.selection === right.selection &&
    (left.selection !== "fixed" ||
      right.selection !== "fixed" ||
      (left.preparationVersion === right.preparationVersion &&
        left.promptVersion === right.promptVersion &&
        (left.preparationVersion !== 5 ||
          right.preparationVersion !== 5 ||
          (left.modelId === right.modelId &&
            JSON.stringify(left.audioRecipe) ===
              JSON.stringify(right.audioRecipe))) &&
        (left.preparationVersion !== 4 ||
          right.preparationVersion !== 4 ||
          JSON.stringify(left.manifest) === JSON.stringify(right.manifest))))
  );
}
export function sameInputReceipt(
  left: SourceInputReceipt | null,
  right: SourceInputReceipt | null,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}
export function queuedCancellationFence(
  candidate: LlmConversion,
  saved: LlmConversion,
) {
  return (
    candidate.phase === "queued" &&
    candidate.owner.state === "idle" &&
    candidate.sourceMemoryBytes === 0 &&
    (!candidate.inputReceipt || candidate.inputReceipt.state === "closed") &&
    JSON.stringify(saved) ===
      JSON.stringify({
        ...candidate,
        phase: "terminal",
        outcome: { kind: "cancelled" },
        cancelGeneration: candidate.cancelGeneration + 1,
        updatedAt: saved.updatedAt,
        version: candidate.version + 1,
      })
  );
}
export async function candidateOutcome(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
): Promise<Exclude<LlmOutcome, { kind: "pending" | "succeeded" }> | null> {
  if (value.cancelGeneration) return { kind: "cancelled" };
  if (value.deadlineAt <= c.clock.now())
    return { kind: "failed", code: "LLM_TIMEOUT" };
  try {
    await currentLlmSource(u, value, c.clock.now());
    return null;
  } catch (error) {
    if (!isLlmOperationError(error)) throw error;
    return { kind: "failed", code: error.code };
  }
}
export async function terminateCandidate(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
) {
  const outcome = await candidateOutcome(c, u, value);
  if (!outcome) return false;
  await completeLlm(c, u, value, outcome, c.clock.now(), "never-read");
  return true;
}

export function driveLlmData(value: LlmConversion): DriveLlmData {
  if (!leasedDrive(value) || value.selection !== "fixed")
    throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
  Object.freeze(value.access);
  Object.freeze(value.source);
  Object.freeze(value.owner);
  Object.freeze(value.outcome);
  if (value.inputReceipt) {
    Object.freeze(value.inputReceipt.consumer);
    Object.freeze(value.inputReceipt);
  }
  return Object.freeze({
    ...value,
    createdAt: value.createdAt.getTime(),
    updatedAt: value.updatedAt.getTime(),
    deadlineAt: value.deadlineAt.getTime(),
  });
}

export function driveDispatchData(value: LlmDispatch): DriveLlmDispatchData {
  if (value.stage === "transcribe") {
    const data = {
      ...value,
      input: Object.freeze({ ...value.input }),
      intentAt: value.intentAt?.getTime() ?? null,
    };
    return value.state === "prepared"
      ? Object.freeze({
          ...data,
          state: "prepared",
          intentAt: null,
          response: null,
        })
      : value.state === "response"
        ? Object.freeze({
            ...data,
            state: "response",
            intentAt: value.intentAt.getTime(),
            response: Object.freeze({ ...value.response }),
          })
        : Object.freeze({
            ...data,
            state: value.state,
            intentAt: value.intentAt.getTime(),
            response: null,
          });
  }
  const data = {
    ...value,
    input: Object.freeze({ ...value.input }),
    intentAt: value.intentAt?.getTime() ?? null,
  };
  return value.state === "prepared"
    ? Object.freeze({
        ...data,
        state: "prepared",
        intentAt: null,
        response: null,
      })
    : value.state === "response"
      ? Object.freeze({
          ...data,
          state: "response",
          intentAt: value.intentAt.getTime(),
          response: Object.freeze({ ...value.response }),
        })
      : Object.freeze({
          ...data,
          state: value.state,
          intentAt: value.intentAt.getTime(),
          response: null,
        });
}

export function driveQuotaData(value: LlmQuotaReservation): DriveLlmQuotaData {
  const data = {
    ...value,
    createdAt: value.createdAt.getTime(),
    updatedAt: value.updatedAt.getTime(),
  };
  return value.state === "reserved"
    ? Object.freeze({ ...data, state: "reserved", firstIntentAt: null })
    : value.state === "consumed"
      ? Object.freeze({
          ...data,
          state: "consumed",
          firstIntentAt: value.firstIntentAt.getTime(),
        })
      : Object.freeze({
          ...data,
          state: "released",
          firstIntentAt: value.firstIntentAt?.getTime() ?? null,
        });
}

function driveJobData(value: ConversionJob): DriveLlmPrewrite["job"] {
  const data = {
    ...value,
    createdAt: value.createdAt.getTime(),
    updatedAt: value.updatedAt.getTime(),
  };
  if (value.state === "running")
    return Object.freeze({
      ...data,
      state: "running",
      failure: null,
      leaseToken: value.leaseToken,
      leaseUntil: value.leaseUntil.getTime(),
    });
  if (value.state === "failed")
    return Object.freeze({
      ...data,
      state: "failed",
      failure: value.failure,
      leaseToken: null,
      leaseUntil: null,
    });
  return Object.freeze({
    ...data,
    state: value.state,
    failure: null,
    leaseToken: null,
    leaseUntil: null,
  });
}

export async function captureDriveLlmPrewrite(
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
): Promise<DriveLlmPrewrite> {
  const conversion = await u.llmConversions.find(value.jobId);
  const job = await u.jobs.find(value.jobId);
  const quota = await u.llmQuota.reservation(value.jobId);
  const original = await u.imports.findOriginal(value.source.originalId);
  const binding =
    value.access.origin === "drive-record"
      ? await u.regenerationBindings.find(value.access.bindingId)
      : null;
  if (
    !conversion ||
    !job ||
    !quota ||
    !original ||
    !binding ||
    !sameInputSource(conversion, value) ||
    job.id !== value.jobId ||
    job.originalId !== value.source.originalId ||
    job.accountId !== value.accountId ||
    binding.consumer.kind !== "llm-conversion" ||
    binding.consumer.id !== value.jobId ||
    binding.executorId !== value.accountId ||
    binding.fingerprint !== value.requestDigest
  )
    throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
  return Object.freeze({
    conversion: driveLlmData(conversion),
    job: driveJobData(job),
    dispatches: Object.freeze(
      (await u.llmDispatches.list(value.jobId)).map(driveDispatchData),
    ),
    quota: driveQuotaData(quota),
    original: Object.freeze({
      ...original,
      createdAt: original.createdAt.getTime(),
    }),
    binding: Object.freeze({
      ...binding,
      consumer: Object.freeze({ ...binding.consumer }),
      createdAt: binding.createdAt.getTime(),
    }),
  });
}

export function driveLlmOutcome(
  outcome: LlmOutcome,
): DriveLlmTerminalCall["outcome"] {
  if (outcome.kind === "succeeded" || outcome.kind === "cancelled")
    return Object.freeze({ ...outcome });
  if (outcome.kind === "unknown" && outcome.code === "LLM_DELIVERY_UNKNOWN")
    return { kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" };
  if (
    outcome.kind === "failed" &&
    outcome.code !== "LLM_OWNERSHIP_UNKNOWN" &&
    outcome.code !== "LLM_DELIVERY_UNKNOWN"
  )
    return { kind: "failed", code: outcome.code };
  throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
}
export async function captureDriveLlmTerminal(
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
  outcome: Exclude<LlmOutcome, { kind: "pending" }>,
  now: Date,
): Promise<DriveLlmTerminalCall> {
  const quota = await u.llmQuota.reservation(value.jobId);
  if (
    !quota ||
    (outcome.kind === "unknown" && outcome.code === "LLM_OWNERSHIP_UNKNOWN")
  )
    throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
  return Object.freeze({
    base: driveLlmData(value),
    outcome: driveLlmOutcome(outcome),
    epochMs: now.getTime(),
    dispatches: Object.freeze(
      (await u.llmDispatches.list(value.jobId)).map(driveDispatchData),
    ),
    quota: driveQuotaData(quota),
  });
}

export function sameDrivePrewrite(
  left: DriveLlmPrewrite,
  right: DriveLlmPrewrite,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function driveLlmTerminalSaved(
  saved: DriveLlmPrewrite,
  before: DriveLlmPrewrite,
  call: DriveLlmTerminalCall,
) {
  const base = call.base;
  if (
    base.owner.state !== "active" ||
    base.sourceMemoryBytes !== 0 ||
    base.inputReceipt?.state !== "closed"
  )
    return false;
  const conversion: DriveLlmData = {
    ...base,
    phase: "terminal",
    outcome: call.outcome,
    owner: { ...base.owner, state: "closed" },
    version: base.version + 1,
    updatedAt: call.epochMs,
    responseBudget: 0,
  };
  const state =
    call.outcome.kind === "succeeded" || call.outcome.kind === "cancelled"
      ? call.outcome.kind
      : "failed";
  const failure =
    call.outcome.kind === "failed" || call.outcome.kind === "unknown"
      ? call.outcome.code
      : null;
  const job = {
    ...before.job,
    state,
    failure,
    leaseToken: null,
    leaseUntil: null,
    updatedAt: call.epochMs,
  };
  const dispatches = call.dispatches.map((row) =>
    row.state === "response"
      ? { ...row, state: "scrubbed", response: null }
      : row,
  );
  const sent = call.dispatches.some(
    (row) => row.state !== "prepared" && row.state !== "not-sent",
  );
  const quota =
    sent || call.quota.state === "released"
      ? call.quota
      : { ...call.quota, state: "released", updatedAt: call.epochMs };
  const {
    version: _oldVersion,
    cancelGeneration: _oldCancel,
    ...binding
  } = before.binding;
  const {
    version: _newVersion,
    cancelGeneration: _newCancel,
    ...savedBinding
  } = saved.binding;
  return (
    JSON.stringify(saved.conversion) === JSON.stringify(conversion) &&
    JSON.stringify(saved.job) === JSON.stringify(job) &&
    JSON.stringify(saved.dispatches) === JSON.stringify(dispatches) &&
    JSON.stringify(saved.quota) === JSON.stringify(quota) &&
    JSON.stringify(savedBinding) === JSON.stringify(binding)
  );
}
