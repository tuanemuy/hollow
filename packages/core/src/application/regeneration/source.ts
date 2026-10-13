import type { SourceAttempt } from "@repo/core/domain/regeneration/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { revealDriveCredential } from "../integration/drive/credentials";
import type { DriveExecutionTarget } from "../integration/drive/ports";
import { acknowledgeSourceClosure } from "../integration/drive/runner";
import type { SourceSink } from "../llm/audioPorts";
import { isLlmOperationError, LlmOperationError } from "../llm/ports";
import { currentDriveSource, currentInput } from "./current";
import type { RegenerationServices, SourceInputLease } from "./services";
import { sourceStateInvalid } from "./services";

async function capture(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  lease: SourceInputLease,
) {
  const input = await currentInput(c, u, lease.receipt.consumer);
  const receipt = input.receipt;
  if (
    !receipt ||
    receipt.state !== "active" ||
    receipt.runtimeId !== lease.receipt.runtimeId ||
    receipt.token !== lease.receipt.token ||
    receipt.generation !== lease.receipt.generation ||
    input.memory !== 52_428_800
  )
    return sourceStateInvalid();
  const drive = await currentDriveSource(u, input);
  return { input, drive };
}

export async function readInput(
  c: HollowContainer,
  services: RegenerationServices,
  lease: SourceInputLease,
  signal: AbortSignal,
  purpose: "acquire" | "final-check" = "acquire",
) {
  services.input.startRead(lease);
  try {
    await readOwnedInput(c, services, lease, signal, purpose);
  } finally {
    services.input.endRead(lease);
  }
}
export async function readInputInto(
  c: HollowContainer,
  services: RegenerationServices,
  lease: SourceInputLease,
  sink: SourceSink,
  signal: AbortSignal,
) {
  services.input.startRead(lease);
  try {
    await readOwnedInput(c, services, lease, signal, "acquire", sink);
  } finally {
    services.input.endRead(lease);
  }
}
async function readOwnedInput(
  c: HollowContainer,
  services: RegenerationServices,
  lease: SourceInputLease,
  signal: AbortSignal,
  purpose: "acquire" | "final-check",
  sink?: SourceSink,
) {
  if (signal.aborted) return sourceStateInvalid();
  let snapshot = await c.unitOfWorkProvider.run((u) => capture(c, u, lease));
  if (!snapshot.drive) {
    if (purpose !== "acquire") return sourceStateInvalid();
    const identity = {
      ...snapshot.input.source,
      kind: "original" as const,
      originalId: snapshot.input.originalId,
    };
    const bytes = await (sink
      ? services.local.readInto(
          snapshot.input.original.storageKey,
          identity,
          sink,
          signal,
        )
      : services.local.read(
          snapshot.input.original.storageKey,
          identity,
          signal,
        )
    ).catch((error) => {
      if (!isLlmOperationError(error) || !error.closed)
        services.input.unknown(lease);
      throw error;
    });
    await c.unitOfWorkProvider.run((u) => capture(c, u, lease));
    if (signal.aborted) return sourceStateInvalid();
    if (bytes) services.input.adopt(lease, bytes);
    return;
  }
  if (!services.drive || !services.provider) return sourceStateInvalid();
  const execution = services.drive.execution;
  const revision = execution.changeRevision();
  if (snapshot.drive.connection.credential.accessExpiresAt <= c.clock.now()) {
    await execution.waitForChange(revision, signal);
    snapshot = await c.unitOfWorkProvider.run((u) => capture(c, u, lease));
  }
  if (
    !snapshot.drive ||
    signal.aborted ||
    snapshot.drive.connection.credential.accessExpiresAt <= c.clock.now()
  )
    return sourceStateInvalid();
  const expected = snapshot.drive;
  const id = c.idGenerator.next();
  const owner = {
    runtimeGeneration: services.drive.runtimeGeneration,
    token: c.idGenerator.next(),
  };
  const target: DriveExecutionTarget = { kind: "source", id, owner };
  const captured = await execution.withCaller(
    target,
    () =>
      c.unitOfWorkProvider.run(async (u) => {
        const checked = await capture(c, u, lease);
        const drive = checked.drive;
        if (
          !drive ||
          signal.aborted ||
          drive.connection.credentialVersion !==
            expected.connection.credentialVersion ||
          drive.connection.version !== expected.connection.version ||
          drive.connection.credential.accessExpiresAt <= c.clock.now()
        )
          return null;
        const attempts = await u.regenerationAttempts.forBinding(
          drive.binding.id,
        );
        const ordinal = Math.max(0, ...attempts.map((a) => a.ordinal)) + 1;
        if (!Number.isSafeInteger(ordinal) || ordinal > 100)
          return sourceStateInvalid();
        const now = c.clock.now();
        const queued: SourceAttempt = {
          id,
          bindingId: drive.binding.id,
          ordinal,
          purpose,
          version: 1,
          cancelGeneration: 0,
          deadlineAt: new Date(now.getTime() + 120_000),
          credentialVersion: drive.connection.credentialVersion,
          createdAt: now,
          updatedAt: now,
          phase: "queued",
          owner: { state: "none", runtimeId: null, token: null },
          completion: null,
        };
        await u.regenerationAttempts.insert(queued);
        const active: SourceAttempt = {
          ...queued,
          version: 2,
          phase: "active",
          owner: {
            state: "active",
            runtimeId: owner.runtimeGeneration,
            token: owner.token,
          },
        };
        if (!(await u.regenerationAttempts.claim(active, 1)))
          return sourceStateInvalid();
        return { active, drive };
      }),
    async (claimed) => {
      const accessToken = revealDriveCredential(
        c,
        claimed.drive.connection,
      ).accessToken;
      const record = claimed.drive.record;
      const resourceKey =
        record.resourceKeyEnvelope === null
          ? null
          : services.drive.protector.reveal(record.resourceKeyEnvelope, {
              purpose: "backup-record-file-key",
              accountId: record.accountId,
              subject: record.subject,
              recordId: record.id,
              fileId: record.fileId,
            });
      const handle = execution.run(target, async (ownedSignal) => {
        const request = {
          record,
          accessToken,
          resourceKey,
          signal: ownedSignal,
          checkCurrent: () =>
            c.unitOfWorkProvider.run(async (u) => {
              const current = await capture(c, u, lease);
              const attempt = await u.regenerationAttempts.find(id);
              const drive = current.drive;
              if (
                ownedSignal.aborted ||
                signal.aborted ||
                !drive ||
                drive.binding.id !== claimed.drive.binding.id ||
                drive.binding.version !== claimed.drive.binding.version ||
                drive.record.id !== record.id ||
                drive.connection.version !== claimed.drive.connection.version ||
                drive.connection.credentialVersion !==
                  claimed.drive.connection.credentialVersion ||
                drive.connection.credential.accessExpiresAt <= c.clock.now() ||
                !attempt ||
                attempt.phase !== "active" ||
                attempt.cancelGeneration !== 0 ||
                attempt.owner.runtimeId !== owner.runtimeGeneration ||
                attempt.owner.token !== owner.token ||
                attempt.deadlineAt <= c.clock.now()
              )
                return sourceStateInvalid();
            }),
        };
        if (purpose === "final-check") {
          await services.provider.inspect(request);
          return null;
        }
        if (sink) {
          await services.provider.readInto(request, sink);
          return null;
        }
        return services.provider.read(request);
      });
      const abort = () => handle.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      const closed = handle.closed.then(
        () => true,
        () => false,
      );
      try {
        const result = await handle.result;
        const ended = await closed;
        const closure = execution.closure(target);
        if (!ended || closure.kind !== "closed") {
          await c.unitOfWorkProvider.run(async (u) => {
            const saved = await u.regenerationAttempts.find(id);
            if (saved?.phase === "active")
              await u.regenerationAttempts.replace(
                {
                  ...saved,
                  phase: "unknown",
                  owner: { ...saved.owner, state: "unknown" },
                  version: saved.version + 1,
                  updatedAt: c.clock.now(),
                },
                saved.version,
              );
          });
          services.input.unknown(lease);
          return sourceStateInvalid();
        }
        await c.unitOfWorkProvider.run(async (u) => {
          const saved = await u.regenerationAttempts.find(id);
          if (
            !saved ||
            saved.phase !== "active" ||
            saved.owner.token !== owner.token
          )
            return sourceStateInvalid();
          if (
            !(await u.regenerationAttempts.replace(
              {
                ...saved,
                phase: "terminal",
                owner: { ...saved.owner, state: "closed" },
                version: saved.version + 1,
                updatedAt: c.clock.now(),
                completion: {
                  kind: "closed",
                  proofId: closure.proof.evidenceId,
                  callerEnded: false,
                  acknowledged: false,
                  outcome: result.kind === "value" ? "succeeded" : "failed",
                  failure: result.kind === "failure" ? result.code : null,
                  digest:
                    result.kind === "value" && purpose === "acquire"
                      ? record.sha256
                      : null,
                },
              },
              saved.version,
            ))
          )
            return sourceStateInvalid();
        });
        return { result, proof: closure.proof };
      } finally {
        signal.removeEventListener("abort", abort);
      }
    },
  );
  if (captured.kind !== "settled") return sourceStateInvalid();
  try {
    await execution.coordinate("maintenance", () =>
      acknowledgeSourceClosure(c, captured.value.proof),
    );
  } catch {
    services.input.unknown(lease);
    throw new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "not-sent", false);
  }
  await c.unitOfWorkProvider.run((u) => capture(c, u, lease));
  if (signal.aborted || captured.value.result.kind !== "value")
    return sourceStateInvalid();
  if (captured.value.result.value !== null)
    services.input.adopt(lease, captured.value.result.value);
}
