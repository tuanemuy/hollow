import {
  type ScopeSelection,
  selectedScope,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import {
  canScope,
  requireNote,
  requireScope,
  scopeUsage,
  scopeView,
} from "../workspace/access";
import { importContext } from "./context";
import { importPublicationNotice } from "./publication";

export async function listImports(
  container: HollowContainer,
  token: string | null,
  input: ScopeSelection = {},
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const { accounts, imports, jobs, notes, purges } = c;
    const account = await requireAccount(container, accounts, token);
    const scope = selectedScope(account.id, input);
    await requireScope(c, scope, account.id, "read");
    const now = container.clock.now();
    const batches = await imports.listBatches(
      account.id,
      new Date(now.getTime() - 90 * 86400_000),
    );
    const items = [];
    const snapshots = (
      await purges.snapshots(
        account.id,
        new Date(now.getTime() - 90 * 86400_000),
      )
    ).filter((j) => j.kind === "conversion");
    for (const batch of batches) {
      const all = await jobs.listBatch(batch.id);
      const archived = snapshots.filter((j) => j.batchId === batch.id);
      const replaced = new Set([...all, ...archived].map((j) => j.retryOf));
      const children = [];
      for (const job of all.filter((j) => !replaced.has(j.id))) {
        const original = await imports.findOriginal(job.originalId);
        const target = await notes.findById(job.noteId);
        const llm = await c.llmConversions.find(job.id);
        const machine = await c.machineRegenerations.find(job.id);
        children.push({
          id: job.id,
          targetDeleted: false,
          targetAvailable:
            target?.lifecycle.kind === "active" &&
            (await canScope(c, target.owner, account.id, "edit")),
          noteId: job.noteId,
          name: original?.name ?? "原本",
          state: job.state,
          noteState: original?.state ?? "failed",
          failure: job.failure,
          attempt: job.attempt,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          coverage: original?.coverage ?? "no_text",
          publicationNotice: original
            ? importPublicationNotice(await imports.listNotices(original.id))
            : null,
          machine: machine
            ? {
                outcome: machine.outcome,
                ownershipUnconfirmed: machine.owner.state === "unknown",
                cancelRequested: machine.cancelGeneration > 0,
              }
            : null,
          llm: llm
            ? {
                operation: llm.operation,
                outcome: llm.outcome.kind,
                ownershipUnconfirmed: llm.owner.state === "unknown",
                cancelRequested: llm.cancelGeneration > 0,
                ...(llm.selection === "pdf-pending"
                  ? { pdfClassification: "pending" as const, modelId: null }
                  : { pdfClassification: null, modelId: llm.modelId }),
              }
            : null,
        });
      }
      for (const j of archived.filter((j) => !replaced.has(j.id)))
        children.push({
          id: j.id,
          targetDeleted: true,
          targetAvailable: false,
          noteId: "",
          name: j.name,
          state: j.state,
          noteState: "failed" as const,
          failure: j.failure,
          attempt: j.attempt,
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
          coverage: "no_text" as const,
          publicationNotice: null,
          machine: null,
          llm: null,
        });
      const uploads = (await imports.listReservations(batch.id))
        .filter((r) => r.state !== "accepted")
        .map((r) => ({
          id: r.id,
          name: r.name,
          bytes: r.bytes,
          state: r.state,
          failure: r.failure,
        }));
      items.push({
        id: batch.id,
        createdAt: batch.createdAt.toISOString(),
        cancelled: batch.cancelledAt !== null,
        active:
          children.some((j) => j.state === "queued" || j.state === "running") ||
          uploads.some(
            (u) => u.state === "awaiting" || u.state === "uploading",
          ),
        jobs: children.sort(
          (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        ),
        uploads,
      });
    }
    const usage = await scopeUsage(c, scope, now);
    return {
      batches: items,
      usedBytes: usage.usedBytes,
      quotaBytes: usage.limitBytes,
      usage,
      scope: await scopeView(c, scope, account.id),
    };
  });
}

export async function requireOriginal(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const { accounts, imports, notes } = c;
    const account = await requireAccount(container, accounts, token);
    const original = await imports.findOriginal(id);
    if (!original)
      throw new NotFoundError("ORIGINAL_NOT_FOUND", "原本が見つかりません。");
    const note = await notes.findById(original.noteId);
    if (!note || !(await canScope(c, note.owner, account.id)))
      throw new NotFoundError("ORIGINAL_NOT_FOUND", "原本が見つかりません。");
    await requireNote(c, note, account.id);
    return original;
  });
}
export async function originalDownload(
  container: HollowContainer,
  token: string | null,
  id: string,
) {
  const original = await requireOriginal(container, token, id);
  return {
    name: original.name,
    bytes: original.bytes,
    stream: await importContext(container).storage.stream(original.storageKey),
  };
}
