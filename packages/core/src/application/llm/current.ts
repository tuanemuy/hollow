import { assetUrl } from "@repo/core/domain/asset/entity";
import type { LlmConversion } from "@repo/core/domain/llm/entity";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { canScope } from "../workspace/access";
import { type LlmInputStage, LlmOperationError } from "./ports";

export async function currentLlmSource(
  u: HollowUnitOfWorkContext,
  value: LlmConversion,
  now: Date,
  input?: LlmInputStage,
) {
  const lease = input?.lease(value);
  const current = await u.llmConversions.find(value.jobId);
  const note = await u.notes.findById(value.noteId);
  const original = await u.imports.findOriginal(value.source.originalId);
  const account = await u.accounts.findById(value.accountId);
  const connection = await u.openRouterConnections.find(value.accountId);
  if (
    !current ||
    current.access.origin !== "local-original" ||
    value.access.origin !== "local-original" ||
    (input
      ? !lease ||
        current.sourceMemoryBytes !== 52_428_800 ||
        value.sourceMemoryBytes !== 52_428_800 ||
        current.owner.state !== "active" ||
        current.selection !== "fixed" ||
        current.preparationVersion !== 1 ||
        current.inputReceipt?.state !== "active" ||
        value.inputReceipt?.state !== "active" ||
        lease.receipt.consumer.kind !== "llm-conversion" ||
        lease.receipt.consumer.id !== current.jobId ||
        lease.receipt.runtimeId !== current.owner.runtimeId ||
        lease.receipt.token !== current.owner.token ||
        lease.receipt.generation !== current.inputReceipt.generation ||
        value.inputReceipt.generation !== current.inputReceipt.generation
      : current.sourceMemoryBytes !== 0 || value.sourceMemoryBytes !== 0) ||
    current.owner.token !== value.owner.token ||
    current.owner.runtimeId !== value.owner.runtimeId ||
    current.outcome.kind !== "pending" ||
    current.cancelGeneration > 0 ||
    current.cancelGeneration !== value.cancelGeneration ||
    now >= current.deadlineAt
  )
    throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
  if (
    !note ||
    note.lifecycle.kind !== "active" ||
    note.version !== value.noteVersion ||
    (value.sourceOwnershipGeneration !== null &&
      (await u.llmPdfPreviews.sourceGeneration(note.id)) !==
        value.sourceOwnershipGeneration) ||
    !account ||
    account.status !== "verified" ||
    !(await canScope(u, note.owner, value.accountId, "edit")) ||
    (note.owner.kind === "workspace" &&
      (await u.workspaces.find(note.owner.workspaceId))?.state !== "active")
  )
    throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
  if (
    !original ||
    original.noteId !== note.id ||
    original.sha256 !== value.source.sha256 ||
    original.bytes !== value.source.bytes ||
    original.format !== value.source.format ||
    original.activeJobId !== value.jobId
  )
    throw new LlmOperationError("LLM_SOURCE_CHANGED", "not-sent", true);
  if (
    !connection ||
    connection.state !== "linked" ||
    connection.epoch !== value.credentialEpoch ||
    (connection.keyExpiresAt && connection.keyExpiresAt <= now)
  )
    throw new LlmOperationError("LLM_CREDENTIAL_INVALID", "not-sent", true);
  const media: {
    sourceUrl: string;
    placeholder: string;
    assetId: string;
    assetUrl: string;
    kind: "image" | "video";
  }[] = [];
  for (const entry of await u.references.entries(note.id)) {
    if (
      !entry.current ||
      entry.state !== "acquired" ||
      !entry.assetId ||
      (entry.kind !== "image" && entry.kind !== "video")
    )
      continue;
    const asset = await u.assets.find(entry.assetId);
    if (
      !asset ||
      asset.state !== "ready" ||
      !(await u.assets.isReferenced(note.id, asset.id))
    )
      continue;
    const url = assetUrl({
      scope: "notes",
      scopeId: note.id,
      assetId: asset.id,
    });
    media.push({
      sourceUrl: entry.url,
      placeholder: `[[hollow-media:${entry.id}]]`,
      assetId: asset.id,
      assetUrl: url,
      kind: entry.kind,
    });
  }
  return { current, note, original, connection, media };
}
