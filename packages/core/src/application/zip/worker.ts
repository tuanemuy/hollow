import { BusinessRuleError } from "@repo/core/domain/error";
import type { HollowContainer } from "../di/hollowTypes";
import { ObjectOwnershipUnprovenError } from "../ports/objectOwnership";
import { assembleZip } from "./assembly";
import { checkedCurrentZipArtifact } from "./delivery";
import { ZipExecutionUnprovenError } from "./executionError";
import {
  currentZipRun,
  generateZipChild,
  zipAborted,
  zipFailure,
} from "./generation";
import type { ZipWorkClaim } from "./ports";
import { zipServices } from "./services";

async function generate(
  c: HollowContainer,
  claim: ZipWorkClaim,
  signal: AbortSignal,
) {
  const service = zipServices(c);
  let unknown: ObjectOwnershipUnprovenError | ZipExecutionUnprovenError | null =
    null;
  try {
    for (let index = 0; index < 500; index++) {
      const attempt = await c.unitOfWorkProvider.run(async (u) => {
        await currentZipRun(c, u, claim, signal);
        return u.zipWork.nextAttempt(
          claim.run,
          claim.lease.token,
          c.clock.now(),
        );
      });
      if (!attempt) break;
      await generateZipChild(c, claim, attempt, signal);
    }
    await assembleZip(c, claim, signal);
  } catch (error) {
    unknown =
      error instanceof ObjectOwnershipUnprovenError ||
      error instanceof ZipExecutionUnprovenError
        ? error
        : null;
    const reason = unknown
      ? unknown.code
      : signal.aborted
        ? c.clock.now() >= claim.run.deadlineAt
          ? "ZIP_DEADLINE"
          : "ZIP_CANCELLED"
        : zipFailure(error);
    await c.unitOfWorkProvider.run(async (u) => {
      const current = await u.zipRequests.findRun(claim.run);
      if (
        current?.state !== "stopping" ||
        current.failure !== null ||
        reason !== "ZIP_CANCELLED"
      )
        await u.zipWork.fail(
          claim.run,
          claim.lease.token,
          reason,
          c.clock.now(),
        );
    });
    c.logger.error("ZIP generation did not publish", {
      requestId: claim.request.id,
      generation: claim.run.generation,
      code: reason,
      ownershipKnown: !unknown,
    });
  } finally {
    if (!unknown)
      await c.unitOfWorkProvider.run((u) =>
        u.zipWork.finishClosed(claim.run, claim.lease.token, c.clock.now()),
      );
    service.wake();
  }
  if (unknown) throw unknown;
}

export async function pumpZip(c: HollowContainer) {
  if (!c.zip) return;
  const service = zipServices(c);
  const active = await c.unitOfWorkProvider.run((u) => u.zipWork.active());
  if (active) {
    const { run } = active;
    const id = `${run.requestId}:${run.generation}`;
    if (service.execution.active(id)) {
      const live = await c.unitOfWorkProvider.run((u) =>
        u.zipWork.renew(
          run,
          run.lease?.token ?? "",
          c.clock.now(),
          new Date(c.clock.now().getTime() + service.capacity.leaseMs),
        ),
      );
      if (!live) service.execution.cancel(id);
      return;
    }
    if (run.lease && run.lease.runtimeId !== service.execution.runtimeId)
      throw new BusinessRuleError(
        "ZIP_RUNTIME_UNPROVEN",
        "以前のZIP処理の終了確認が必要です。",
      );
    if (
      run.state === "stopping" ||
      run.state === "running" ||
      run.state === "assembling" ||
      run.deadlineAt <= c.clock.now()
    ) {
      await c.unitOfWorkProvider.run(async (u) => {
        if (run.state !== "stopping")
          await u.zipWork.fail(
            run,
            run.lease?.token ?? null,
            run.deadlineAt <= c.clock.now()
              ? "ZIP_DEADLINE"
              : "ZIP_INTERRUPTED",
            c.clock.now(),
          );
        await u.zipWork.finishClosed(
          run,
          run.lease?.token ?? null,
          c.clock.now(),
        );
      });
      return;
    }
  }
  const now = c.clock.now();
  const claim = await c.unitOfWorkProvider.run((u) =>
    u.zipWork.claim(now, {
      token: c.tokens.generate(),
      runtimeId: service.execution.runtimeId,
      until: new Date(now.getTime() + service.capacity.leaseMs),
    }),
  );
  if (!claim) return;
  if (
    !service.execution.start(
      `${claim.request.id}:${claim.run.generation}`,
      claim.run.deadlineAt,
      (signal) => generate(c, claim, signal),
    )
  ) {
    await c.unitOfWorkProvider.run(async (u) => {
      await u.zipWork.fail(
        claim.run,
        claim.lease.token,
        "ZIP_EXECUTION_BUSY",
        c.clock.now(),
      );
      await u.zipWork.finishClosed(claim.run, claim.lease.token, c.clock.now());
    });
  }
}

export async function sweepZip(c: HollowContainer) {
  if (!c.zip) return;
  const service = zipServices(c);
  for (const id of service.transfers.ids()) {
    try {
      const current = await c.unitOfWorkProvider.run(async (u) => {
        const delivery = await u.zipDeliveries.find(id);
        if (
          !delivery ||
          delivery.state !== "sending" ||
          delivery.expiresAt <= c.clock.now()
        )
          return false;
        return Boolean(
          await checkedCurrentZipArtifact(
            c,
            u,
            delivery.accountId,
            delivery.artifactId,
          ),
        );
      });
      if (!current) service.transfers.cancel(id);
    } catch (error) {
      service.transfers.cancel(id);
      c.logger.error("ZIP delivery current authorization unavailable", {
        code: zipFailure(error),
      });
    }
  }
  await c.unitOfWorkProvider.run(async (u) => {
    await u.zipDeliveries.expireReady(c.clock.now());
    await u.zipRequests.prune(c.clock.now());
    await u.zipDeliveries.prune(c.clock.now());
  });
  for (let index = 0; index < 20; index++) {
    const token = c.tokens.generate();
    const now = c.clock.now();
    const until = new Date(now.getTime() + service.capacity.leaseMs);
    const claimed = await c.unitOfWorkProvider.run(async (u) => {
      const artifact = await u.zipArtifacts.claimCleanup(now, token, until);
      if (artifact) return { kind: "artifact" as const, value: artifact };
      const spool = await u.zipSpools.claimCleanup(now, token, until);
      if (spool) return { kind: "spool" as const, value: spool };
      const assembly = await u.zipWork.claimAssemblyCleanup(now, token, until);
      return assembly ? { kind: "assembly" as const, value: assembly } : null;
    });
    if (!claimed) break;
    try {
      const key = claimed.value.key;
      if (!key) throw zipAborted();
      const removed = await service.execution.within(
        new Date(c.clock.now().getTime() + service.capacity.cleanupMs),
        new AbortController().signal,
        () => service.removeClaimed(key),
      );
      await c.unitOfWorkProvider.run(async (u) => {
        if (claimed.kind === "artifact")
          await u.zipArtifacts.cleaned(claimed.value.id, token, removed.token);
        else if (claimed.kind === "spool")
          await u.zipSpools.cleaned(claimed.value.id, token, removed.token);
        else
          await u.zipWork.assemblyCleaned(
            claimed.value.id,
            token,
            removed.token,
          );
      });
    } catch (error) {
      await c.unitOfWorkProvider.run(async (u) => {
        if (claimed.kind === "artifact")
          await u.zipArtifacts.deferCleanup(
            claimed.value.id,
            token,
            c.clock.now(),
          );
        else if (claimed.kind === "spool")
          await u.zipSpools.deferCleanup(
            claimed.value.id,
            token,
            c.clock.now(),
          );
        else
          await u.zipWork.deferAssemblyCleanup(
            claimed.value.id,
            token,
            c.clock.now(),
          );
      });
      c.logger.error("ZIP cleanup retained its reservation", {
        kind: claimed.kind,
        code: zipFailure(error),
      });
    }
  }
}
