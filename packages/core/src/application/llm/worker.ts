import { BusinessRuleError } from "@repo/core/domain/error";
import { audioResponsesComplete } from "@repo/core/domain/llm/audio";
import type {
  LlmConversion,
  LlmFailure,
  LlmFixedConversion,
  LlmInputIdentity,
  LlmOutcome,
} from "@repo/core/domain/llm/entity";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import type { PdfPageIdentity } from "@repo/core/domain/llm/pdfPreview";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import { editNote } from "@repo/core/domain/note/entity";
import { attemptReleased } from "@repo/core/domain/regeneration/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { applyImportPublication } from "../import/publication";
import { commitRegeneratedBody as commitNote } from "../regeneration/body";
import { prepareAudioConversion } from "./audioWorker";
import { completeLlm, recordLlmUse, replaceLlm } from "./completion";
import { currentLlmSource as checkLlmSource } from "./current";
import {
  leasedDrive,
  leasedLocal,
  leasedText,
  sameInputSource,
} from "./inputStage";

const currentLlmSource = checkLlmSource;

import {
  isLlmObjectOwnershipUnprovenError,
  LlmObjectOwnershipUnprovenError,
} from "./ownershipError";
import { recoverPdfPreviews } from "./pdfPreview";
import {
  type DriveLlmRecorder,
  isLlmOperationError,
  type LlmGenerateInput,
  type LlmInputStage,
  type LlmModelProfile,
  LlmOperationError,
  type LlmPreparedSource,
} from "./ports";

type PlannedInput = Readonly<{
  identity: Exclude<LlmInputIdentity, { kind: "prepared-audio-chunk" }>;
}> &
  (
    | Readonly<{ kind: "ready"; input: LlmGenerateInput["input"] }>
    | Readonly<{ kind: "page"; page: PdfPageIdentity }>
  );
function inputs(
  container: HollowContainer,
  prepared: LlmPreparedSource,
): readonly PlannedInput[] {
  if (prepared.kind === "pdf-pages")
    return prepared.manifest.pages.map((page) => ({
      kind: "page",
      page,
      identity: {
        kind: "prepared-pdf-page",
        ordinal: page.ordinal,
        sha256: container.tokens.hash(
          JSON.stringify([
            "pdf-page-v4",
            prepared.manifest.sha256,
            page.ordinal,
            page.sha256,
          ]),
        ),
      },
    }));
  return prepared.kind === "single-raster"
    ? [
        {
          kind: "ready",
          identity: prepared.inputIdentity,
          input: { kind: "single-raster" as const, ...prepared.raster },
        },
      ]
    : prepared.segments.map((segment) => ({
        kind: "ready" as const,
        identity: segment.identity,
        input: {
          kind: "text-block" as const,
          html: segment.html,
          ordinal: segment.identity.ordinal,
          segments: prepared.segments.length,
        },
      }));
}
function generation(
  model: LlmModelProfile,
  input: LlmGenerateInput["input"],
  common: Pick<LlmGenerateInput, "dispatchId" | "credential" | "instruction">,
): LlmGenerateInput {
  if (model.kind === "chat-image" && input.kind === "single-raster")
    return { ...common, kind: "chat-image", promptVersion: 2, model, input };
  if (model.kind === "chat-image" && input.kind === "pdf-page")
    return { ...common, kind: "chat-image", promptVersion: 3, model, input };
  if (model.kind === "chat-text" && input.kind === "text-block")
    return { ...common, kind: "chat-text", promptVersion: 1, model, input };
  throw new LlmOperationError("LLM_MODEL_INCOMPATIBLE", "not-sent", true);
}

const unproven = () =>
  new LlmOperationError("LLM_OWNERSHIP_UNKNOWN", "possible", false);

async function process(
  container: HollowContainer,
  initial: LlmConversion,
  signal: AbortSignal,
): Promise<void> {
  if (!leasedDrive(initial)) return processOwned(container, initial, signal);
  const service = container.llm;
  if (
    service?.inputMode !== "leased-local-v2" ||
    service.sourceMode !== "drive" ||
    !service.storage.withOwner
  )
    throw unproven();
  await service.storage.withOwner(
    { kind: "conversion-job", id: initial.jobId },
    async () => {
      try {
        await processOwned(container, initial, signal);
      } catch (error) {
        if (isLlmOperationError(error) && !error.closed)
          throw new LlmObjectOwnershipUnprovenError(initial.jobId);
        throw error;
      }
    },
  );
}
async function processOwned(
  container: HollowContainer,
  initial: LlmConversion,
  signal: AbortSignal,
): Promise<void> {
  const services = container.llm;
  const control = container.openRouter;
  let claimed = initial;
  if (!services || claimed.owner.state !== "active") throw unproven();
  const owner = claimed.owner;
  const drive =
    services.inputMode === "leased-local-v2" &&
    services.sourceMode === "drive" &&
    leasedDrive(initial)
      ? services.inputStage
      : null;
  const currentLlmSource = (
    u: HollowUnitOfWorkContext,
    value: LlmConversion,
    now: Date,
    input?: LlmInputStage,
  ) =>
    checkLlmSource(
      u,
      value,
      now,
      input ??
        (services.inputMode !== "legacy-local" && value.sourceMemoryBytes !== 0
          ? services.inputStage
          : undefined),
    );
  let dispatchId: string | null = null;
  try {
    if (claimed.phase !== "finalizing" && (!control || !services.configured))
      throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
    const source = await container.unitOfWorkProvider.run((u) =>
      currentLlmSource(
        u,
        claimed,
        container.clock.now(),
        services.inputMode !== "legacy-local" && claimed.sourceMemoryBytes !== 0
          ? services.inputStage
          : undefined,
      ),
    );
    if (!services.storage.withOwner)
      throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
    if (claimed.selection === "pdf-pending") {
      const pending = claimed;
      const choice = await services.storage.withOwner(
        { kind: "conversion-job", id: pending.jobId },
        async () => {
          try {
            if (services.inputMode === "leased-local-v2")
              return await services.inputStage.classify(pending, signal);
            const bytes = await services.source.read(
              source.original.storageKey,
              pending.source,
              signal,
            );
            return await services.pdfClassifier.classify(
              { source: pending.source, bytes },
              signal,
            );
          } catch (error) {
            if (isLlmOperationError(error) && !error.closed)
              throw new LlmObjectOwnershipUnprovenError(pending.jobId);
            throw error;
          }
        },
      );
      if (signal.aborted)
        throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
      claimed = await container.unitOfWorkProvider.run(async (u) => {
        const ended =
          services.inputMode === "leased-local-v2"
            ? await u.llmConversions.find(pending.jobId)
            : pending;
        if (
          !ended ||
          ended.selection !== "pdf-pending" ||
          ended.owner.token !== owner.token ||
          ended.owner.runtimeId !== owner.runtimeId ||
          (services.inputMode === "leased-local-v2" &&
            (ended.sourceMemoryBytes !== 0 ||
              ended.inputReceipt?.state !== "closed"))
        )
          throw unproven();
        const checked = await currentLlmSource(u, ended, container.clock.now());
        const sealed = await u.llmConversions.sealPdf({
          jobId: pending.jobId,
          expectedVersion: checked.current.version,
          ownerToken: owner.token,
          runtimeId: owner.runtimeId,
          choice,
          now: container.clock.now(),
        });
        if (!sealed)
          throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
        return sealed;
      });
    }
    if (
      !drive &&
      services.inputMode === "leased-local-v2" &&
      claimed.selection === "fixed" &&
      claimed.preparationVersion === 4 &&
      services.inputStage.lease(claimed)
    ) {
      await services.inputStage.finish(claimed);
      const ended = await container.unitOfWorkProvider.run((u) =>
        u.llmConversions.find(claimed.jobId),
      );
      if (
        !ended ||
        ended.selection !== "fixed" ||
        ended.preparationVersion !== 4 ||
        ended.sourceMemoryBytes !== 0 ||
        ended.inputReceipt?.state !== "closed" ||
        ended.owner.token !== owner.token ||
        ended.owner.runtimeId !== owner.runtimeId
      )
        throw unproven();
      claimed = ended;
    }
    let fixed: LlmFixedConversion = claimed;
    const audioInitial = fixed.preparationVersion === 5 ? fixed : null;
    const audio = audioInitial
      ? await services.storage.withOwner(
          { kind: "conversion-job", id: audioInitial.jobId },
          async () => {
            try {
              return await prepareAudioConversion(
                container,
                audioInitial,
                signal,
                {
                  claimed(value) {
                    claimed = value;
                    fixed = value;
                  },
                  dispatch(id) {
                    dispatchId = id;
                  },
                },
              );
            } catch (error) {
              if (isLlmOperationError(error) && !error.closed)
                throw new LlmObjectOwnershipUnprovenError(claimed.jobId);
              throw error;
            }
          },
        )
      : null;
    const prepared: LlmPreparedSource = audio
      ? audio.prepared
      : fixed.phase !== "finalizing" && fixed.preparationVersion === 4
        ? { kind: "pdf-pages", preparationVersion: 4, manifest: fixed.manifest }
        : drive
          ? await drive.prepare(claimed, signal)
          : services.inputMode !== "legacy-local" &&
              (services.inputMode === "leased-local-v2"
                ? leasedLocal(claimed)
                : leasedText(claimed))
            ? await services.storage.withOwner(
                { kind: "conversion-job", id: claimed.jobId },
                async () => {
                  try {
                    return await services.inputStage.prepare(claimed, signal);
                  } catch (error) {
                    if (isLlmOperationError(error) && !error.closed)
                      throw new LlmObjectOwnershipUnprovenError(claimed.jobId);
                    throw error;
                  }
                },
              )
            : await services.storage.withOwner(
                { kind: "conversion-job", id: claimed.jobId },
                async () => {
                  try {
                    const bytes = await services.source.read(
                      source.original.storageKey,
                      claimed.source,
                      signal,
                    );
                    return await services.preparer.prepare(
                      fixed.preparationVersion === 1
                        ? {
                            bytes,
                            source: fixed.source,
                            preparationVersion: 1,
                            promptVersion: fixed.promptVersion,
                            media: source.media.map(
                              ({ sourceUrl, placeholder }) => ({
                                sourceUrl,
                                placeholder,
                              }),
                            ),
                          }
                        : fixed.preparationVersion === 2
                          ? {
                              bytes,
                              source: fixed.source,
                              preparationVersion: 2,
                              promptVersion: fixed.promptVersion,
                            }
                          : fixed.preparationVersion === 3
                            ? {
                                bytes,
                                source: fixed.source,
                                preparationVersion: 3,
                                promptVersion: 2,
                              }
                            : fixed.preparationVersion === 4
                              ? {
                                  bytes,
                                  source: fixed.source,
                                  preparationVersion: 4,
                                  promptVersion: 3,
                                  manifest: fixed.manifest,
                                }
                              : (() => {
                                  throw unproven();
                                })(),
                      signal,
                    );
                  } catch (error) {
                    if (isLlmOperationError(error) && !error.closed)
                      throw new LlmObjectOwnershipUnprovenError(claimed.jobId);
                    throw error;
                  }
                },
              );
    if (
      fixed.preparationVersion !== 5 &&
      services.inputMode !== "legacy-local" &&
      (services.inputMode === "leased-local-v2"
        ? leasedLocal(claimed)
        : leasedText(claimed))
    ) {
      const ended = await container.unitOfWorkProvider.run((u) =>
        u.llmConversions.find(claimed.jobId),
      );
      if (
        !ended ||
        ended.selection !== "fixed" ||
        ended.sourceMemoryBytes !== 0 ||
        ended.inputReceipt?.state !== "closed" ||
        ended.owner.token !== owner.token ||
        ended.owner.runtimeId !== owner.runtimeId
      )
        throw unproven();
      claimed = ended;
      fixed = ended;
    }
    if (prepared.preparationVersion !== claimed.preparationVersion)
      throw new LlmOperationError("LLM_SOURCE_INVALID", "not-sent", true);
    if (
      fixed.pdfProof?.kind === "strict-text" &&
      (prepared.preparationVersion !== 2 ||
        prepared.identity.sha256 !== fixed.pdfProof.preparedDocumentHash)
    )
      throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
    if (
      fixed.preparationVersion === 4 &&
      (prepared.kind !== "pdf-pages" ||
        prepared.manifest.sha256 !== fixed.manifest.sha256)
    )
      throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
    const planned = inputs(container, prepared);
    const existing = await container.unitOfWorkProvider.run((u) =>
      u.llmDispatches
        .list(claimed.jobId)
        .then((rows) => rows.filter((row) => row.stage !== "transcribe")),
    );
    const resume = claimed.phase === "finalizing";
    if (
      resume &&
      (existing.length !== planned.length ||
        existing.some(
          (item, index) =>
            item.state !== "response" ||
            item.input.sha256 !== planned[index]?.identity.sha256 ||
            item.input.kind !== planned[index]?.identity.kind ||
            item.input.ordinal !== planned[index]?.identity.ordinal,
        ))
    )
      throw new LlmOperationError("LLM_SOURCE_CHANGED", "possible", true);
    if (!resume && existing.length)
      throw new LlmOperationError("LLM_DELIVERY_UNKNOWN", "possible", true);
    if (!resume) {
      if (!control)
        throw new LlmOperationError("LLM_UNCONFIGURED", "not-sent", true);
      const kind =
        prepared.kind === "text-blocks" || prepared.kind === "audio-transcript"
          ? "chat-text"
          : "chat-image";
      const model = await services.profiles.inspect(
        { modelId: fixed.modelId, kind },
        signal,
      );
      if (model.kind !== kind)
        throw new LlmOperationError("LLM_MODEL_INCOMPATIBLE", "not-sent", true);
      for (const segment of planned) {
        if (signal.aborted)
          throw new LlmOperationError("LLM_TIMEOUT", "not-sent", true);
        let input: LlmGenerateInput["input"];
        if (segment.kind === "ready") input = segment.input;
        else {
          if (fixed.preparationVersion !== 4) throw unproven();
          await container.unitOfWorkProvider.run((u) =>
            currentLlmSource(u, fixed, container.clock.now()),
          );
          const pageSource = fixed;
          const raster = await services.storage.withOwner(
            { kind: "conversion-job", id: pageSource.jobId },
            async () => {
              try {
                if (services.inputMode === "leased-local-v2") {
                  if (pageSource.preparationVersion !== 4) throw unproven();
                  return await services.inputStage.redraw(
                    pageSource,
                    pageSource.manifest,
                    segment.page,
                    signal,
                  );
                }
                const bytes = await services.source.read(
                  source.original.storageKey,
                  pageSource.source,
                  signal,
                );
                return await services.pdfPages.redraw(
                  {
                    bytes,
                    source: pageSource.source,
                    manifest: pageSource.manifest,
                    page: segment.page,
                  },
                  signal,
                );
              } catch (error) {
                if (isLlmOperationError(error) && !error.closed)
                  throw new LlmObjectOwnershipUnprovenError(pageSource.jobId);
                throw error;
              }
            },
          );
          if (!drive && services.inputMode === "leased-local-v2") {
            const ended = await container.unitOfWorkProvider.run((u) =>
              u.llmConversions.find(fixed.jobId),
            );
            if (
              !ended ||
              ended.selection !== "fixed" ||
              ended.preparationVersion !== 4 ||
              ended.sourceMemoryBytes !== 0 ||
              ended.inputReceipt?.state !== "closed" ||
              ended.owner.token !== owner.token ||
              ended.owner.runtimeId !== owner.runtimeId ||
              JSON.stringify(ended.manifest) !== JSON.stringify(fixed.manifest)
            )
              throw unproven();
            claimed = ended;
            fixed = ended;
          }
          input = {
            kind: "pdf-page",
            ...raster,
            ordinal: segment.page.ordinal,
            pages: fixed.manifest.total,
          };
        }
        const id = container.idGenerator.next();
        const credential = await container.unitOfWorkProvider.run(async (u) => {
          const ready = await currentLlmSource(
            u,
            claimed,
            container.clock.now(),
          );
          if (ready.current.selection !== "fixed") throw unproven();
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
          await replaceLlm(u, ready.current, {
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
          generation(model, input, {
            dispatchId: id,
            credential,
            instruction: claimed.instruction,
          }),
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
          if (ready.current.selection !== "fixed") throw unproven();
          if (!(await u.llmDispatches.response(id, owner.token, response)))
            throw unproven();
          const last = segment === planned[planned.length - 1];
          if (last && ready.current.preparationVersion === 5) {
            if (ready.current.audioPlan.kind !== "structuring")
              throw unproven();
            if (
              !(await u.llmConversions.sealAudio({
                jobId: ready.current.jobId,
                expectedVersion: ready.current.version,
                ownerToken: owner.token,
                runtimeId: owner.runtimeId,
                plan: {
                  ...ready.current.audioPlan,
                  kind: "responses-complete",
                },
                now: container.clock.now(),
              }))
            )
              throw unproven();
          } else
            await replaceLlm(u, ready.current, {
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
      return (await u.llmDispatches.list(claimed.jobId)).filter(
        (row) => row.stage !== "transcribe",
      );
    });
    if (
      responses.length !== planned.length ||
      responses.some((row) => row.state !== "response")
    )
      throw unproven();
    const media = (prepared.kind === "text-blocks" ? prepared.media : []).map(
      (item) => {
        const match = source.media.find(
          (candidate) => candidate.placeholder === item.placeholder,
        );
        if (!match)
          throw new LlmOperationError("LLM_SOURCE_CHANGED", "possible", true);
        return { ...item, assetUrl: match.assetUrl, kind: match.kind };
      },
    );
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
    if (
      !drive &&
      fixed.preparationVersion === 5 &&
      services.inputMode === "leased-local-v2"
    ) {
      await services.inputStage.finish(claimed);
      const ended = await container.unitOfWorkProvider.run((u) =>
        u.llmConversions.find(claimed.jobId),
      );
      if (
        !ended ||
        ended.selection !== "fixed" ||
        ended.sourceMemoryBytes !== 0 ||
        ended.inputReceipt?.state !== "closed"
      )
        throw unproven();
      claimed = ended;
      fixed = ended;
    }
    if (drive) {
      claimed = await drive.finalizeDrive(claimed, signal);
      if (claimed.selection !== "fixed") throw unproven();
      fixed = claimed;
    }
    const commit = async (
      u: HollowUnitOfWorkContext,
      recorder?: DriveLlmRecorder,
    ) => {
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
      if (recorder) await recorder.beforeWrite();
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
        prepared.preparationVersion === 1 || prepared.preparationVersion === 5
          ? prepared.notices.map((message) => ({
              code: "LLM_SOURCE_NOTICE",
              location: "document",
              message,
            }))
          : prepared.preparationVersion === 3
            ? [
                {
                  code: "LLM_IMAGE_NORMALIZED",
                  location: "image",
                  message:
                    "単一画像の全画素を縮小・切り抜きせずに入力しました。向き・色を整え、透明部分を白背景にしています。文字認識や内容には誤りがあり得るため、原本を確認してください。",
                },
              ]
            : prepared.preparationVersion === 4
              ? [
                  {
                    code: "LLM_PDF_PAGES",
                    location: "document",
                    message:
                      "全ページの表示内容を画像として入力しました。読み取り結果や順序には誤りがあり得るため、原本を確認してください。",
                  },
                ]
              : prepared.notices.map((notice) => ({
                  code: notice.code,
                  location: `unit:${notice.unit}`,
                  message:
                    notice.code === "OFFICE_MEDIA_UNINTERPRETED"
                      ? `文字・構造を取り込みました。画像・図など${notice.count}件の内容は解釈していません。`
                      : `非表示の内容${notice.count}件も本文準備に含めました。`,
                })),
      );
      const outcome = { kind: "succeeded" as const, noteVersion: note.version };
      await applyImportPublication(container, u, claimed.jobId);
      const now = container.clock.now();
      if (recorder) await recorder.terminal(ready.current, outcome, now);
      await completeLlm(container, u, ready.current, outcome, now);
    };
    if (drive) await drive.commitDrive(claimed, commit);
    else await container.unitOfWorkProvider.run((u) => commit(u));
  } catch (error) {
    if (
      services.inputMode !== "legacy-local" &&
      claimed.sourceMemoryBytes !== 0 &&
      services.inputStage.lease(claimed)
    ) {
      try {
        await services.inputStage.finish(claimed);
        const ended = await container.unitOfWorkProvider.run((u) =>
          u.llmConversions.find(claimed.jobId),
        );
        if (ended) claimed = ended;
      } catch {
        error = unproven();
      }
    }
    if (
      drive &&
      error instanceof BusinessRuleError &&
      error.code === "REGENERATION_SOURCE_INVALID"
    ) {
      try {
        await drive.finish(claimed);
        const ended = await container.unitOfWorkProvider.run(async (u) => {
          const value = await u.llmConversions.find(claimed.jobId);
          if (
            !value ||
            !leasedDrive(value) ||
            !sameInputSource(value, claimed) ||
            value.owner.state !== "active" ||
            value.owner.token !== owner.token ||
            value.owner.runtimeId !== owner.runtimeId ||
            value.sourceMemoryBytes !== 0 ||
            value.inputReceipt?.state !== "closed" ||
            value.inputReceipt.generation !==
              claimed.inputReceipt?.generation ||
            value.access.origin !== "drive-record" ||
            !(
              await u.regenerationAttempts.forBinding(value.access.bindingId)
            ).every(attemptReleased)
          )
            throw unproven();
          const dispatches = await u.llmDispatches.list(value.jobId);
          return {
            value,
            possible: dispatches.some(
              (row) => row.state !== "prepared" && row.state !== "not-sent",
            ),
          };
        });
        claimed = ended.value;
        error = new LlmOperationError(
          "LLM_SOURCE_CHANGED",
          ended.possible ? "possible" : "not-sent",
          true,
        );
      } catch {
        error = unproven();
      }
    }
    const failure = isLlmOperationError(error)
      ? error
      : isLlmObjectOwnershipUnprovenError(error)
        ? unproven()
        : unproven();
    if (
      drive &&
      (!failure.closed || failure.code === "LLM_OWNERSHIP_UNKNOWN")
    ) {
      await container.unitOfWorkProvider.run(async (u) => {
        const current = await u.llmConversions.find(claimed.jobId);
        if (
          !current ||
          current.owner.token !== owner.token ||
          current.owner.runtimeId !== owner.runtimeId
        )
          throw unproven();
        if (dispatchId)
          await u.llmDispatches.fail(dispatchId, owner.token, failure.delivery);
        await recordLlmUse(u, current, container.clock.now());
      });
      throw unproven();
    }
    let committed = false;
    try {
      const reject = async (
        u: HollowUnitOfWorkContext,
        recorder?: DriveLlmRecorder,
      ) => {
        const current = await u.llmConversions.find(claimed.jobId);
        if (
          !current ||
          current.owner.token !== owner.token ||
          current.owner.runtimeId !== owner.runtimeId
        )
          throw unproven();
        if (current.phase === "terminal" && current.owner.state === "closed") {
          if (drive) throw unproven();
          committed = true;
          return;
        }
        if (recorder) await recorder.beforeWrite();
        if (dispatchId)
          await u.llmDispatches.fail(dispatchId, owner.token, failure.delivery);
        if (!failure.closed) {
          await recordLlmUse(u, current, container.clock.now());
          await replaceLlm(u, current, {
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
        const now = container.clock.now();
        if (recorder) await recorder.terminal(current, outcome, now);
        await completeLlm(container, u, current, outcome, now);
      };
      if (drive) await drive.commitDrive(claimed, reject);
      else await container.unitOfWorkProvider.run((u) => reject(u));
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
    if (service.inputMode !== "legacy-local") {
      for (const proof of service.ownership.pendingInputProofs(predecessor)) {
        if (proof.receipt.consumer.kind === "pdf-preview") {
          if (service.inputMode !== "leased-local-v2") throw unproven();
          const saved = await container.unitOfWorkProvider.run((u) =>
            u.llmPdfPreviews.find(proof.receipt.consumer.id),
          );
          if (
            saved &&
            saved.sourceMemoryBytes === 0 &&
            saved.owner.state === "closed" &&
            ["failed", "cancelled", "expired", "ready", "consumed"].includes(
              saved.state,
            ) &&
            service.ownership.verifyPredecessorInput(proof, saved)
          )
            service.ownership.consumePredecessorInput(proof);
        } else {
          const saved = await container.unitOfWorkProvider.run((u) =>
            u.llmConversions.find(proof.receipt.consumer.id),
          );
          if (
            saved &&
            saved.sourceMemoryBytes === 0 &&
            saved.owner.state === "closed" &&
            (saved.phase === "terminal" || saved.phase === "response-ready") &&
            service.ownership.verifyPredecessorInput(proof, saved)
          )
            service.ownership.consumePredecessorInput(proof);
        }
      }
    }
    const inputProofs: import("./ports").LlmPredecessorInputProof[] = [];
    await container.unitOfWorkProvider.run(async (u) => {
      inputProofs.push(
        ...(await recoverPdfPreviews(
          u,
          predecessor,
          container.clock.now(),
          service.inputMode === "leased-local-v2"
            ? service.ownership
            : undefined,
        )),
      );
      for (const owned of await u.llmConversions.owned(predecessor)) {
        let current = owned;
        if (current.inputReceipt !== null && current.sourceMemoryBytes !== 0) {
          if (service.inputMode === "legacy-local") throw unproven();
          const proof = service.ownership.inputPredecessor(current);
          if (
            !proof ||
            !service.ownership.verifyPredecessorInput(proof, current)
          )
            throw unproven();
          if (current.owner.state === "idle") throw unproven();
          if (current.owner.state !== "closed") {
            await replaceLlm(u, current, {
              ...current,
              owner: { ...current.owner, state: "closed" },
            });
            const closed = await u.llmConversions.find(current.jobId);
            if (!closed) throw unproven();
            current = closed;
          }
          await replaceLlm(u, current, {
            ...current,
            inputReceipt: proof.receipt,
            sourceMemoryBytes: 0,
          });
          const ended = await u.llmConversions.find(current.jobId);
          if (!ended || !service.ownership.verifyPredecessorInput(proof, ended))
            throw unproven();
          current = ended;
          inputProofs.push(proof);
        }
        if (current.owner.state === "idle") throw unproven();
        const dispatches = await u.llmDispatches.list(current.jobId);
        const allResponses =
          current.selection === "fixed" &&
          dispatches.length > 0 &&
          dispatches.every((row) => row.state === "response") &&
          (current.preparationVersion !== 5 ||
            (current.audioPlan.kind === "responses-complete" &&
              audioResponsesComplete(current.audioPlan, dispatches))) &&
          (current.preparationVersion !== 4 ||
            (dispatches.length === current.manifest.total &&
              dispatches.every((row, ordinal) => {
                const page = current.manifest.pages[ordinal];
                return (
                  page !== undefined &&
                  row.input.kind === "prepared-pdf-page" &&
                  row.input.ordinal === ordinal &&
                  row.input.sha256 ===
                    container.tokens.hash(
                      JSON.stringify([
                        "pdf-page-v4",
                        current.manifest.sha256,
                        ordinal,
                        page.sha256,
                      ]),
                    )
                );
              }))) &&
          (current.phase === "response-ready" ||
            current.phase === "finalizing");
        if (
          allResponses &&
          current.selection === "fixed" &&
          current.cancelGeneration === 0 &&
          current.deadlineAt > container.clock.now()
        ) {
          await replaceLlm(u, current, {
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
          await completeLlm(
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
    if (service.inputMode !== "legacy-local")
      for (const proof of inputProofs)
        service.ownership.consumePredecessorInput(proof);
    await service.ownership.acknowledge(predecessor);
  }
  service.ownership.assertReady();
}

export async function sweepLlm(
  container: HollowContainer,
  options: Readonly<{ admit?: boolean }> = {},
): Promise<void> {
  const service = container.llm;
  if (!service) return;
  service.ownership.assertReady();
  if (service.inputMode === "leased-local-v2" && service.sourceMode === "drive")
    await service.inputStage.recoverDriveCompletions();
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
          await currentLlmSource(
            u,
            value,
            container.clock.now(),
            service.inputMode !== "legacy-local" &&
              value.sourceMemoryBytes !== 0
              ? service.inputStage
              : undefined,
          );
          return true;
        } catch (error) {
          if (isLlmOperationError(error)) return false;
          throw error;
        }
      });
      if (!valid) service.execution.cancel(value.jobId);
    }
  }
  if (options.admit === false) return;
  const resumed =
    service.inputMode !== "legacy-local"
      ? await service.inputStage.resume()
      : [];
  for (const claim of resumed) {
    if (
      !service.execution.start(
        claim.value.jobId,
        claim.value.accountId,
        claim.value.deadlineAt,
        (signal) => process(container, claim.value, signal),
      )
    ) {
      if (service.inputMode !== "legacy-local" && claim.lease)
        await service.inputStage.finish(claim.value);
      throw unproven();
    }
  }
  for (let index = 0; index < LLM_LIMITS.concurrency; index++) {
    const value =
      service.inputMode !== "legacy-local"
        ? ((await service.inputStage.claim())?.value ?? null)
        : await container.unitOfWorkProvider.run((u) =>
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
    ) {
      if (
        service.inputMode !== "legacy-local" &&
        service.inputStage.lease(value)
      )
        await service.inputStage.finish(value);
      throw unproven();
    }
  }
}
