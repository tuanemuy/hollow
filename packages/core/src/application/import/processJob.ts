import type { ConversionJob } from "@repo/core/domain/job/entity";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import { editNote } from "@repo/core/domain/note/entity";
import { isSerializableError } from "@repo/core/lib/error";
import type { HollowContainer } from "../di/hollowTypes";
import { commitNote } from "../note/commitNote";
import type { Extraction } from "../ports/documentExtractor";
import { inspectDependencies } from "../reference/dependencies";
import { scheduleReferences } from "../reference/schedule";
import { canScope } from "../workspace/access";
import { importContext } from "./context";
import { applyImportPublication } from "./publication";
import { withObjectOwner } from "./withObjectOwner";

export type JobResult =
  | { kind: "extracted"; extraction: Extraction }
  | { kind: "failed"; reason: string };
export async function commitImportResult(
  container: HollowContainer,
  job: ConversionJob,
  result: JobResult,
) {
  if (job.state !== "running") return false;
  const document =
    result.kind === "extracted"
      ? container.referencing?.processor.prepare(result.extraction.html)
      : undefined;
  const inspections = document
    ? await inspectDependencies(container, document)
    : new Map<string, string>();
  const sanitized =
    result.kind === "extracted"
      ? container.htmlSanitizer.sanitize(
          document?.html ?? result.extraction.html,
        )
      : null;
  const snapshot =
    container.browsing && sanitized
      ? await container.unitOfWorkProvider.run(async (c) => ({
          note: await c.notes.findById(job.noteId),
          original: await c.imports.findOriginal(job.originalId),
        }))
      : null;
  const needsBody =
    result.kind === "extracted" &&
    !(
      result.extraction.coverage === "no_text" &&
      snapshot?.original &&
      !["html", "markdown", "text"].includes(snapshot.original.format)
    );
  const projection =
    snapshot?.note && sanitized && needsBody
      ? await container.browsing?.projection.project({
          title: snapshot.note.title,
          html: sanitized.html,
        })
      : undefined;
  return container.unitOfWorkProvider.run(async (context) => {
    const { accounts, notes, imports, jobs } = context;
    const now = container.clock.now();
    const current = await jobs.find(job.id);
    const original = await imports.findOriginal(job.originalId);
    const note = await notes.findById(job.noteId);
    const account = await accounts.findById(job.accountId);
    if (
      !current ||
      current.state !== "running" ||
      current.leaseToken !== job.leaseToken ||
      current.leaseUntil <= now
    )
      return false;
    if (
      !original ||
      original.activeJobId !== job.id ||
      !note ||
      note.lifecycle.kind !== "active" ||
      !(await canScope(context, note.owner, job.accountId, "edit")) ||
      note.version !== job.noteVersion ||
      account?.status !== "verified"
    ) {
      await jobs.finish(job.id, job.leaseToken, now, "cancelled");
      if (original?.activeJobId === job.id)
        await imports.saveOriginal({ ...original, state: "cancelled" });
      return false;
    }
    if (result.kind === "failed") {
      await commitNote(container, context, {
        previous: note,
        note: {
          ...note,
          display: completeDisplay(note.display, "conversion", job.id, false),
        },
        actor: { kind: "system", jobId: job.id },
        cause: "import",
      });
      await imports.replaceNotices(original.id, [
        { code: "IMPORT_FAILURE", location: "原本", message: result.reason },
      ]);
      await jobs.finish(job.id, job.leaseToken, now, "failed", result.reason);
      await imports.saveOriginal({ ...original, state: "failed" });
      return true;
    }
    const out = result.extraction;
    await imports.replaceNotices(original.id, out.notices);
    if (
      out.coverage === "no_text" &&
      !["html", "markdown", "text"].includes(original.format)
    ) {
      const noAi = !job.useAi;
      await commitNote(container, context, {
        previous: note,
        note: {
          ...note,
          display: completeDisplay(note.display, "conversion", job.id, false),
        },
        actor: { kind: "system", jobId: job.id },
        cause: "import",
      });
      if (noAi)
        await imports.replaceNotices(original.id, [
          ...out.notices.filter((notice) => notice.code !== "AI_REQUIRED"),
          {
            code: "LLM_DISABLED",
            location: "原本",
            message:
              "LLMなしでは取り込めません。LLMを使う設定で取り込み直してください。",
          },
        ]);
      await jobs.finish(
        job.id,
        job.leaseToken,
        now,
        noAi ? "failed" : "succeeded",
        noAi
          ? "LLMなしでは取り込めません。LLMを使う設定で取り込み直してください。"
          : undefined,
      );
      await imports.saveOriginal({
        ...original,
        state: noAi ? "failed" : "needs_ai",
        coverage: "no_text",
      });
      return true;
    }
    if (!sanitized) return false;
    let updated = editNote(note, note.title, sanitized.html, now);
    await imports.replaceNotices(original.id, [
      ...out.notices,
      ...sanitized.removed.map((message) => ({
        code: "SANITIZED",
        location: "本文",
        message,
      })),
    ]);
    await imports.saveOriginal({
      ...original,
      state: "ready",
      coverage: out.coverage,
    });
    await jobs.finish(job.id, job.leaseToken, now, "succeeded");
    const referenceJob = document
      ? await scheduleReferences(
          container,
          context,
          updated,
          job.accountId,
          { ...document, html: sanitized.html },
          undefined,
          null,
          inspections,
        )
      : null;
    const decorated =
      container.referencing?.processor.hasDecoration(sanitized.html) ?? false;
    const waiting =
      referenceJob &&
      (await context.references.entries(note.id)).some(
        (entry) =>
          entry.current &&
          entry.kind === "stylesheet" &&
          entry.state === "unattempted",
      );
    if (
      note.display.initialization.kind === "conversion" &&
      note.display.initialization.jobId === job.id
    )
      updated = {
        ...updated,
        display: waiting
          ? {
              style: "default",
              source: "automatic",
              initialization: {
                kind: "reference",
                jobId: referenceJob.id,
                decorated,
              },
            }
          : completeDisplay(note.display, "conversion", job.id, decorated),
      };
    await commitNote(container, context, {
      projection,
      previous: note,
      note: updated,
      actor: { kind: "system", jobId: job.id },
      cause: "import",
    });
    await applyImportPublication(container, context, job.id);
    return true;
  });
}

export async function runImportJob(
  container: HollowContainer,
  job: ConversionJob,
) {
  if (job.state !== "running") return;
  return withObjectOwner(
    container,
    { kind: "conversion-job", id: job.id },
    () => runOwnedImportJob(container, job),
  );
}
async function runOwnedImportJob(
  container: HollowContainer,
  job: ConversionJob,
) {
  const allowed = await container.unitOfWorkProvider.run(async (c) => {
    const current = await c.jobs.find(job.id);
    const note = await c.notes.findById(job.noteId);
    const actor = await c.accounts.findById(job.accountId);
    const now = container.clock.now();
    if (
      current?.state !== "running" ||
      current.leaseToken !== job.leaseToken ||
      current.leaseUntil <= now
    )
      return false;
    if (
      note?.lifecycle.kind === "active" &&
      note.version === job.noteVersion &&
      actor?.status === "verified" &&
      (await canScope(c, note.owner, job.accountId, "edit"))
    )
      return true;
    await c.jobs.finish(job.id, current.leaseToken, now, "cancelled");
    const original = await c.imports.findOriginal(job.originalId);
    if (original?.activeJobId === job.id)
      await c.imports.saveOriginal({ ...original, state: "cancelled" });
    return false;
  });
  if (!allowed) return;
  const io = importContext(container);
  let result: JobResult;
  try {
    if (
      job.attempt > 3 ||
      container.clock.now().getTime() - job.createdAt.getTime() > 30 * 60_000
    )
      result = {
        kind: "failed",
        reason: "処理がタイムアウトしました。再試行してください。",
      };
    else {
      const source = await container.unitOfWorkProvider.run(({ imports }) =>
        imports.findOriginal(job.originalId),
      );
      if (!source)
        result = {
          kind: "failed",
          reason: "原本を読み取れませんでした。取り込み直してください。",
        };
      else if (source.format === "audio" || source.format === "image") {
        await io.mediaValidator.validate({
          body: await io.storage.stream(source.storageKey),
          bytes: source.bytes,
          format: source.format,
        });
        result = {
          kind: "extracted",
          extraction: {
            html: "",
            coverage: "no_text",
            notices: [
              {
                code: "AI_REQUIRED",
                location: "原本",
                message: "本文の生成にはAI連携が必要です。",
              },
            ],
          },
        };
      } else
        result = {
          kind: "extracted",
          extraction: await io.extractor.extract({
            bytes: await io.storage.read(source.storageKey),
            format: source.format,
          }),
        };
    }
  } catch (error) {
    const serialized = isSerializableError(error) ? error.toSerialized() : null;
    result = {
      kind: "failed",
      reason:
        serialized?.kind === "business"
          ? serialized.message
          : "変換中にエラーが発生しました。再試行してください。",
    };
    container.logger.error("Import conversion failed", {
      jobId: job.id,
      cause: error,
    });
  }
  return commitImportResult(container, job, result);
}
