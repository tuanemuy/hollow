import type {
  LlmConversion,
  LlmFailure,
  LlmOutcome,
} from "@repo/core/domain/llm/entity";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import { editNote } from "@repo/core/domain/note/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { commitNote } from "../note/commitNote";
import { canScope } from "../workspace/access";
import { currentLlmSource } from "./current";
import {
  isLlmObjectOwnershipUnprovenError,
  LlmObjectOwnershipUnprovenError,
} from "./ownershipError";
import { isLlmOperationError, LlmOperationError } from "./ports";

const unproven = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);
async function replace(
  u: HollowUnitOfWorkContext,
  previous: LlmConversion,
  next: LlmConversion,
) {
  if (
    !(await u.llmConversions.replace(
      { ...next, version: previous.version + 1 },
      previous.version,
    ))
  )
    throw unproven();
}
async function complete(
  container: HollowContainer,
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
  outcome: LlmOutcome,
  now: Date,
) {
  if (value.owner.state === "idle") throw unproven();
  await replace(u, value, {
    ...value,
    phase: "terminal",
    outcome,
    owner: { ...value.owner, state: "closed" },
    responseBudget: 0,
    updatedAt: now,
  });
  await u.llmQuota.releaseUnsent(value.jobId, now);
  await u.llmDispatches.scrub(value.jobId);
  const original = await u.imports.findOriginal(value.source.originalId);
  if (original?.activeJobId === value.jobId && outcome.kind !== "succeeded")
    await u.imports.saveOriginal({
      ...original,
      state:
        value.operation === "regenerate"
          ? value.sourceState
          : outcome.kind === "cancelled"
            ? "cancelled"
            : "failed",
      coverage: value.sourceCoverage,
    });
  if (value.operation === "import" && outcome.kind !== "succeeded") {
    const note = await u.notes.findById(value.noteId);
    if (
      note?.lifecycle.kind === "active" &&
      note.version === value.noteVersion &&
      (await canScope(u, note.owner, value.accountId, "edit"))
    )
      await commitNote(container, u, {
        previous: note,
        note: {
          ...note,
          display: completeDisplay(
            note.display,
            "conversion",
            value.jobId,
            false,
          ),
        },
        actor: { kind: "system", jobId: value.jobId },
        cause: "import",
      });
  }
}

async function process(
  container: HollowContainer,
  claimed: LlmConversion,
  signal: AbortSignal,
): Promise<void> {
  const services = container.llm;
  const control = container.openRouter;
  if (!services || claimed.owner.state !== "active") throw unproven();
  const owner = claimed.owner;
  let dispatchId: string | null = null;
  try {
    if (claimed.phase !== "finalizing" && (!control || !services.configured))
      throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
    const source = await container.unitOfWorkProvider.run((u) =>
      currentLlmSource(u, claimed, container.clock.now()),
    );
    if (!services.storage.withOwner)
      throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
    const prepared = await services.storage.withOwner(
      { kind: "conversion-job", id: claimed.jobId },
      async () => {
        try {
          const bytes = await services.source.read(
            source.original.storageKey,
            claimed.source,
            signal,
          );
          return await services.preparer.prepare(
            claimed.preparationVersion === 1
              ? {
                  bytes,
                  source: claimed.source,
                  preparationVersion: 1,
                  promptVersion: claimed.promptVersion,
                  media: source.media.map(({ sourceUrl, placeholder }) => ({
                    sourceUrl,
                    placeholder,
                  })),
                }
              : {
                  bytes,
                  source: claimed.source,
                  preparationVersion: 2,
                  promptVersion: claimed.promptVersion,
                },
            signal,
          );
        } catch (error) {
          if (isLlmOperationError(error) && !error.closed)
            throw new LlmObjectOwnershipUnprovenError(claimed.jobId);
          throw error;
        }
      },
    );
    const existing = await container.unitOfWorkProvider.run((u) =>
      u.llmDispatches.list(claimed.jobId),
    );
    const resume = claimed.phase === "finalizing";
    if (
      resume &&
      (existing.length !== prepared.segments.length ||
        existing.some(
          (item, index) =>
            item.state !== "response" ||
            item.input.sha256 !== prepared.segments[index]?.identity.sha256,
        ))
    )
      throw new LlmOperationError("LLM_SOURCE_CHANGED", "possible", true);
    if (!resume && existing.length)
      throw new LlmOperationError("LLM_DELIVERY_UNKNOWN", "possible", true);
    if (!resume) {
      if (!control)
        throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
      const model = await services.profiles.inspect(claimed.modelId, signal);
      for (const segment of prepared.segments) {
        if (signal.aborted)
          throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
        const id = container.idGenerator.next();
        const credential = await container.unitOfWorkProvider.run(async (u) => {
          const ready = await currentLlmSource(
            u,
            claimed,
            container.clock.now(),
          );
          await u.llmDispatches.prepare({
            id,
            jobId: claimed.jobId,
            ordinal: segment.identity.ordinal,
            input: segment.identity,
            runtimeId: owner.runtimeId,
            ownerToken: owner.token,
            state: "prepared",
            intentAt: null,
            response: null,
          });
          const credential = control.protector.reveal(
            ready.connection.credentialEnvelope,
            {
              purpose: "credential",
              accountId: claimed.accountId,
              epoch: claimed.credentialEpoch,
            },
          );
          await replace(u, ready.current, {
            ...ready.current,
            phase: "dispatching",
            updatedAt: container.clock.now(),
          });
          if (
            !(await u.llmDispatches.intent(
              id,
              owner.token,
              container.clock.now(),
            ))
          )
            throw unproven();
          return credential;
        });
        dispatchId = id;
        const response = await services.generator.generate(
          {
            kind: "chat-text",
            promptVersion: claimed.promptVersion,
            dispatchId: id,
            credential,
            model,
            instruction: claimed.instruction,
            input: {
              kind: "text-block",
              html: segment.html,
              ordinal: segment.identity.ordinal,
              segments: prepared.segments.length,
            },
          },
          signal,
        );
        if (signal.aborted)
          throw new LlmOperationError("LLM_TIMEOUT", "possible", true);
        await container.unitOfWorkProvider.run(async (u) => {
          const ready = await currentLlmSource(
            u,
            claimed,
            container.clock.now(),
          );
          if (!(await u.llmDispatches.response(id, owner.token, response)))
            throw unproven();
          const last =
            segment === prepared.segments[prepared.segments.length - 1];
          await replace(u, ready.current, {
            ...ready.current,
            phase: last ? "response-ready" : "dispatching",
            updatedAt: container.clock.now(),
          });
        });
        dispatchId = null;
      }
    }
    const responses = await container.unitOfWorkProvider.run(async (u) => {
      await currentLlmSource(u, claimed, container.clock.now());
      return u.llmDispatches.list(claimed.jobId);
    });
    if (
      responses.length !== prepared.segments.length ||
      responses.some((row) => row.state !== "response")
    )
      throw unproven();
    const media = prepared.media.map((item) => {
      const match = source.media.find(
        (candidate) => candidate.placeholder === item.placeholder,
      );
      if (!match)
        throw new LlmOperationError("LLM_SOURCE_CHANGED", "possible", true);
      return { ...item, assetUrl: match.assetUrl, kind: match.kind };
    });
    const restored = services.result.restore(
      responses.map((row) => {
        if (row.state !== "response") throw unproven();
        return row.response.content;
      }),
      media,
    );
    const clean = container.htmlSanitizer.sanitize(restored);
    const note = {
      ...editNote(
        source.note,
        source.note.title,
        clean.html,
        container.clock.now(),
      ),
      display: completeDisplay(
        source.note.display,
        "conversion",
        claimed.jobId,
        false,
      ),
    };
    const projection = await container.browsing?.projection.project({
      title: note.title,
      html: note.html,
    });
    await container.unitOfWorkProvider.run(async (u) => {
      const ready = await currentLlmSource(u, claimed, container.clock.now());
      for (const item of media)
        if (
          !ready.media.some(
            (current) =>
              current.placeholder === item.placeholder &&
              current.assetUrl === item.assetUrl &&
              current.kind === item.kind,
          )
        )
          throw new LlmOperationError("LLM_SOURCE_CHANGED", "possible", true);
      if (signal.aborted)
        throw new LlmOperationError("LLM_TIMEOUT", "possible", true);
      await commitNote(container, u, {
        previous: ready.note,
        note,
        projection,
        actor: { kind: "system", jobId: claimed.jobId },
        cause: "import",
      });
      await u.imports.saveOriginal({
        ...ready.original,
        state: "ready",
        coverage:
          prepared.preparationVersion === 2 &&
          prepared.coverage.kind === "office-text" &&
          prepared.coverage.uninterpretedMedia > 0
            ? "partial"
            : "complete",
      });
      await u.imports.replaceNotices(
        ready.original.id,
        prepared.preparationVersion === 1
          ? prepared.notices.map((message) => ({
              code: "LLM_SOURCE_NOTICE",
              location: "document",
              message,
            }))
          : prepared.notices.map((notice) => ({
              code: notice.code,
              location: `unit:${notice.unit}`,
              message:
                notice.code === "OFFICE_MEDIA_UNINTERPRETED"
                  ? `文字・構造を取り込みました。画像・図など${notice.count}件の内容は解釈していません。`
                  : `非表示の内容${notice.count}件も本文準備に含めました。`,
            })),
      );
      await complete(
        container,
        u,
        ready.current,
        { kind: "succeeded", noteVersion: note.version },
        container.clock.now(),
      );
    });
  } catch (error) {
    const failure = isLlmOperationError(error)
      ? error
      : isLlmObjectOwnershipUnprovenError(error)
        ? unproven()
        : unproven();
    let committed = false;
    try {
      await container.unitOfWorkProvider.run(async (u) => {
        const current = await u.llmConversions.find(claimed.jobId);
        if (
          !current ||
          current.owner.token !== owner.token ||
          current.owner.runtimeId !== owner.runtimeId
        )
          throw unproven();
        if (current.phase === "terminal" && current.owner.state === "closed") {
          committed = true;
          return;
        }
        if (dispatchId)
          await u.llmDispatches.fail(dispatchId, owner.token, failure.delivery);
        if (!failure.closed) {
          await replace(u, current, {
            ...current,
            owner: { ...owner, state: "unknown" },
            outcome: { kind: "unknown", code: "LLM_OWNERSHIP_UNKNOWN" },
            updatedAt: container.clock.now(),
          });
          return;
        }
        const outcome: LlmOutcome =
          current.cancelGeneration > 0
            ? { kind: "cancelled" }
            : failure.code === "LLM_DELIVERY_UNKNOWN"
              ? { kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" }
              : { kind: "failed", code: failure.code };
        await complete(container, u, current, outcome, container.clock.now());
      });
    } catch {
      throw unproven();
    }
    if (committed) return;
    if (!failure.closed) throw unproven();
  }
}

export async function recoverLlm(container: HollowContainer): Promise<void> {
  const service = container.llm;
  if (!service) return;
  for (const predecessor of service.ownership.predecessors()) {
    await container.unitOfWorkProvider.run(async (u) => {
      for (const current of await u.llmConversions.owned(predecessor)) {
        if (current.owner.state === "idle") throw unproven();
        const dispatches = await u.llmDispatches.list(current.jobId);
        const allResponses =
          dispatches.length > 0 &&
          dispatches.every((row) => row.state === "response") &&
          (current.phase === "response-ready" ||
            current.phase === "finalizing");
        if (
          allResponses &&
          current.cancelGeneration === 0 &&
          current.deadlineAt > container.clock.now()
        ) {
          await replace(u, current, {
            ...current,
            owner: { ...current.owner, state: "closed" },
            phase: "response-ready",
            outcome: { kind: "pending" },
            updatedAt: container.clock.now(),
          });
        } else {
          for (const dispatch of dispatches)
            if (dispatch.state === "intent")
              await u.llmDispatches.fail(
                dispatch.id,
                dispatch.ownerToken,
                "possible",
              );
          const possible = dispatches.some(
            (row) => row.state !== "prepared" && row.state !== "not-sent",
          );
          const code: LlmFailure = possible
            ? "LLM_DELIVERY_UNKNOWN"
            : "LLM_UNAVAILABLE";
          await complete(
            container,
            u,
            current,
            current.cancelGeneration
              ? { kind: "cancelled" }
              : possible
                ? { kind: "unknown", code: "LLM_DELIVERY_UNKNOWN" }
                : { kind: "failed", code },
            container.clock.now(),
          );
        }
      }
    });
    await service.ownership.acknowledge(predecessor);
  }
  service.ownership.assertReady();
}

export async function sweepLlm(container: HollowContainer): Promise<void> {
  const service = container.llm;
  if (!service) return;
  service.ownership.assertReady();
  const owned = await container.unitOfWorkProvider.run((u) =>
    u.llmConversions.owned(service.execution.runtimeId),
  );
  for (const value of owned) {
    if (value.owner.state === "unknown") continue;
    if (value.cancelGeneration || value.deadlineAt <= container.clock.now())
      service.execution.cancel(value.jobId);
    else {
      const valid = await container.unitOfWorkProvider.run(async (u) => {
        try {
          await currentLlmSource(u, value, container.clock.now());
          return true;
        } catch (error) {
          if (isLlmOperationError(error)) return false;
          throw error;
        }
      });
      if (!valid) service.execution.cancel(value.jobId);
    }
  }
  for (let index = 0; index < LLM_LIMITS.concurrency; index++) {
    const value = await container.unitOfWorkProvider.run((u) =>
      u.llmConversions.claim(
        container.clock.now(),
        service.execution.runtimeId,
        container.idGenerator.next(),
      ),
    );
    if (!value) break;
    if (
      !service.execution.start(
        value.jobId,
        value.accountId,
        value.deadlineAt,
        (signal) => process(container, value, signal),
      )
    )
      throw unproven();
  }
}
