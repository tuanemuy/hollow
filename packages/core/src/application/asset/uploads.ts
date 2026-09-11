import {
  assetUrl,
  MEDIA_LIMITS,
  type MediaUpload,
  validateMediaUpload,
} from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  capacityLimit,
  selectedScope,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { SystemError, SystemErrorCode } from "../errors";
import { importContext } from "../import/context";
import { withObjectOwner } from "../import/withObjectOwner";
import { requireNote, requireScope } from "../workspace/access";
import { assetNotFound, requireDraft } from "./access";

export async function createMediaDraft(
  container: HollowContainer,
  token: string | null,
  noteId?: string,
  workspaceId?: string,
) {
  return container.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(container, context.accounts, token);
    const scope = noteId
      ? (
          await requireNote(
            context,
            await context.notes.findById(noteId),
            account.id,
            "edit",
          )
        ).owner
      : await requireScope(
          context,
          selectedScope(account.id, { workspaceId }),
          account.id,
          "edit",
        );
    const draft = {
      workspaceId: scope.kind === "workspace" ? scope.workspaceId : null,
      id: container.idGenerator.next(),
      accountId: account.id,
      noteId: noteId ?? null,
      expiresAt: new Date(
        container.clock.now().getTime() + MEDIA_LIMITS.draftMs,
      ),
    };
    await context.assets.insertDraft(draft);
    return { id: draft.id, expiresAt: draft.expiresAt.toISOString() };
  });
}
export async function beginMediaUpload(
  container: HollowContainer,
  token: string | null,
  input: { draftId: string; name: string; bytes: number },
) {
  validateMediaUpload(input.name, input.bytes);
  return container.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(container, context.accounts, token);
    const now = container.clock.now();
    const draft = await requireDraft(context, input.draftId, account.id, now);
    const scope = draft.noteId
      ? (
          await requireNote(
            context,
            await context.notes.findById(draft.noteId),
            account.id,
            "edit",
          )
        ).owner
      : selectedScope(account.id, {
          workspaceId: draft.workspaceId ?? undefined,
        });
    const used = await context.capacity.usedBytes(scope, now);
    if (used + input.bytes > capacityLimit(scope))
      throw new BusinessRuleError(
        "IMPORT_QUOTA",
        "原本・メディア・アップロード予約の合計がこのスペースの保存容量上限を超えます。",
      );
    const row: MediaUpload = {
      id: container.idGenerator.next(),
      accountId: account.id,
      draftId: input.draftId,
      name: input.name,
      bytes: input.bytes,
      state: "awaiting",
      storageCleaned: false,
      expiresAt: new Date(now.getTime() + 30 * 60_000),
    };
    await context.assets.insertUpload(row);
    return { uploadId: row.id };
  });
}
export async function acceptMediaUpload(
  container: HollowContainer,
  token: string | null,
  id: string,
  body: ReadableStream<Uint8Array>,
) {
  const storage = importContext(container).storage;
  const processor = container.inlineMedia;
  if (!processor)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "メディアの検査環境が設定されていません。",
    );
  const upload = await container.unitOfWorkProvider.run(async (context) => {
    const account = await requireAccount(container, context.accounts, token);
    const row = await context.assets.findUpload(id);
    if (
      !row ||
      row.accountId !== account.id ||
      row.expiresAt <= container.clock.now()
    )
      throw assetNotFound();
    await requireDraft(context, row.draftId, account.id, container.clock.now());
    if (!(await context.assets.transitionUpload(id, "awaiting", "uploading")))
      throw new BusinessRuleError(
        "MEDIA_UPLOAD_ENDED",
        "このアップロードは終了しています。再試行してください。",
      );
    return row;
  });
  return withObjectOwner(container, { kind: "media-upload", id }, async () => {
    const sourceKey = `${id}_source`;
    const safeKey = `${id}_safe`;
    try {
      let stored = await storage.put(sourceKey, body, upload.bytes);
      const result = await processor.inspect({
        body: await storage.stream(sourceKey),
        bytes: stored.bytes,
      });
      let storageKey = sourceKey;
      if (result.sanitizedSvg) {
        const bytes = result.sanitizedSvg;
        stored = await storage.put(
          safeKey,
          new ReadableStream({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          }),
          bytes.byteLength,
        );
        storageKey = safeKey;
        await storage.remove(sourceKey);
      }
      return await container.unitOfWorkProvider.run(async (context) => {
        const account = await requireAccount(
          container,
          context.accounts,
          token,
        );
        const now = container.clock.now();
        const draft = await requireDraft(
          context,
          upload.draftId,
          account.id,
          now,
        );
        const scope = draft.noteId
          ? (
              await requireNote(
                context,
                await context.notes.findById(draft.noteId),
                account.id,
                "edit",
              )
            ).owner
          : selectedScope(account.id, {
              workspaceId: draft.workspaceId ?? undefined,
            });
        const current = await context.assets.findUpload(id);
        if (
          !current ||
          current.state !== "uploading" ||
          current.expiresAt <= now
        )
          throw assetNotFound();
        const used = await context.capacity.usedBytes(scope, now);
        if (used - upload.bytes + stored.bytes > capacityLimit(scope))
          throw new BusinessRuleError(
            "IMPORT_QUOTA",
            "保存容量の上限を超えます。",
          );
        await context.assets.insert({
          id,
          accountId: account.id,
          draftId: upload.draftId,
          storageKey,
          ...stored,
          kind: result.kind,
          mime: result.mime,
          createdAt: now,
          unreferencedAt: now,
          committedToNote: false,
          state: "ready",
        });
        if (
          !(await context.assets.transitionUpload(id, "uploading", "accepted"))
        )
          throw assetNotFound();
        return {
          asset: {
            id,
            url: assetUrl({
              scope: "drafts",
              scopeId: upload.draftId,
              assetId: id,
            }),
            mime: result.mime,
            kind: result.kind,
            bytes: stored.bytes,
          },
          removed: result.removed,
        };
      });
    } catch (error) {
      await container.unitOfWorkProvider.run(({ assets }) =>
        assets.transitionUpload(id, "uploading", "failed"),
      );
      try {
        await storage.remove(sourceKey);
        await storage.remove(safeKey);
        await container.unitOfWorkProvider.run(({ assets }) =>
          assets.markUploadCleaned(id),
        );
      } catch (cleanupError) {
        container.logger.error("Media upload cleanup deferred", {
          cause: cleanupError,
        });
      }
      throw error;
    }
  });
}
