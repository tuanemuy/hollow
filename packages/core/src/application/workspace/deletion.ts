import { BusinessRuleError } from "@repo/core/domain/error";
import {
  WORKSPACE_DELETION_LEASE_MS,
  WORKSPACE_DELETION_RECEIPT_MS,
  WORKSPACE_DELETION_STEP_SIZE,
} from "@repo/core/domain/workspace/deletion";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError, SystemError, SystemErrorCode } from "../errors";
import { cancelDriveBackups } from "../integration/drive/backup/cancellation";
import { beginWorkspaceNotePurge } from "../note/purge";

export type RequestWorkspaceDeletion = Readonly<{
  workspaceId: string;
  requestId: string;
  confirmation: string;
}>;
export async function requestWorkspaceDeletion(
  container: HollowContainer,
  token: string | null,
  input: RequestWorkspaceDeletion,
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const now = container.clock.now();
    const receipt = await c.workspaceDeletions.receipt(
      actor.id,
      input.requestId,
      new Date(now.getTime() - WORKSPACE_DELETION_RECEIPT_MS),
    );
    if (receipt) {
      if (
        receipt.workspaceId !== input.workspaceId ||
        receipt.name !== input.confirmation
      )
        throw new BusinessRuleError(
          "WORKSPACE_DELETION_REQUEST_CHANGED",
          "同じ受付番号の確認内容が変わっています。",
        );
      return c.workspaceDeletions.result(receipt);
    }
    const workspace = await c.workspaces.find(input.workspaceId);
    if (
      !workspace ||
      (await c.workspaces.role(input.workspaceId, actor.id)) !== "owner"
    )
      throw new NotFoundError(
        "SCOPE_NOT_FOUND",
        "このスペースにはアクセスできません。個人のスペースへ戻ってください。",
      );
    if (workspace.name !== input.confirmation)
      throw new BusinessRuleError(
        "WORKSPACE_DELETION_NAME",
        "現在のワークスペース名を正確に入力してください。",
      );
    const id = container.idGenerator.next();
    await cancelDriveBackups(
      container,
      c,
      { kind: "workspace", workspaceId: workspace.id },
      now,
    );
    await c.workspaceDeletions.accept({
      id,
      workspaceId: workspace.id,
      accountId: actor.id,
      requestId: input.requestId,
      name: workspace.name,
      now,
    });
    return c.workspaceDeletions.result({
      accountId: actor.id,
      requestId: input.requestId,
      intentId: id,
      workspaceId: workspace.id,
      name: workspace.name,
      acceptedAt: now,
    });
  });
  container.purging?.wake();
  container.workspaceIcon?.wake();
  return result;
}
export async function getWorkspaceDeletionReceipt(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{ requestId: string }>,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const receipt = await c.workspaceDeletions.receipt(
      actor.id,
      input.requestId,
      new Date(container.clock.now().getTime() - WORKSPACE_DELETION_RECEIPT_MS),
    );
    return receipt ? c.workspaceDeletions.result(receipt) : null;
  });
}
export async function listWorkspaceDeletionReceipts(
  container: HollowContainer,
  token: string | null,
  input: Readonly<{ before?: Readonly<{ at: string; requestId: string }> }>,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const actor = await requireAccount(container, c.accounts, token);
    const rows = await c.workspaceDeletions.page(
      actor.id,
      new Date(container.clock.now().getTime() - WORKSPACE_DELETION_RECEIPT_MS),
      input.before
        ? { at: new Date(input.before.at), requestId: input.before.requestId }
        : undefined,
      51,
    );
    const page = rows.slice(0, 50);
    const items = [];
    for (const row of page) items.push(await c.workspaceDeletions.result(row));
    const last = page.at(-1);
    return {
      actorId: actor.id,
      items,
      nextCursor:
        rows.length > 50 && last
          ? { at: last.acceptedAt.toISOString(), requestId: last.requestId }
          : null,
    };
  });
}

export async function sweepWorkspaceDeletions(container: HollowContainer) {
  const storage = container.importing?.storage;
  if (!storage?.removeClaimed)
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      "回収ストレージが設定されていません。",
    );
  await container.unitOfWorkProvider.run((c) =>
    c.workspaceDeletions.pruneReceipts(
      new Date(container.clock.now().getTime() - WORKSPACE_DELETION_RECEIPT_MS),
      WORKSPACE_DELETION_STEP_SIZE,
    ),
  );
  for (let step = 0; step < 20; step++) {
    const now = container.clock.now();
    const token = container.tokens.generate();
    const intent = await container.unitOfWorkProvider.run((c) =>
      c.workspaceDeletions.claim(
        now,
        token,
        new Date(now.getTime() + WORKSPACE_DELETION_LEASE_MS),
      ),
    );
    if (!intent) break;
    try {
      const admitted = await container.unitOfWorkProvider.run(async (c) => {
        const candidates = await c.workspaceDeletions.noteCandidates(
          intent.id,
          token,
          container.clock.now(),
          WORKSPACE_DELETION_STEP_SIZE,
        );
        for (const noteId of candidates)
          await beginWorkspaceNotePurge(container, c, intent.id, noteId);
        const advanced = await c.workspaceDeletions.advance(
          intent.id,
          token,
          candidates.at(-1) ?? intent.admissionCursor,
          candidates.length < WORKSPACE_DELETION_STEP_SIZE,
          container.clock.now(),
        );
        if (!advanced)
          throw new BusinessRuleError(
            "WORKSPACE_DELETION_LEASE",
            "回収の担当が変わりました。現在の担当が再開します。",
          );
        return candidates.length;
      });
      const resources = await container.unitOfWorkProvider.run((c) =>
        c.workspaceDeletions.resources(
          intent.id,
          token,
          container.clock.now(),
          WORKSPACE_DELETION_STEP_SIZE,
        ),
      );
      for (const resource of resources) {
        if (
          !(await container.unitOfWorkProvider.run((c) =>
            c.workspaceDeletions.resourceReady(
              intent.id,
              token,
              resource,
              container.clock.now(),
            ),
          ))
        )
          continue;
        const deleted: { key: string; token: string }[] = [];
        for (const key of resource.keys)
          deleted.push({ key, ...(await storage.removeClaimed(key)) });
        await container.unitOfWorkProvider.run((c) =>
          c.workspaceDeletions.completeResource(
            intent.id,
            token,
            resource,
            deleted,
            container.clock.now(),
          ),
        );
      }
      const finished = await container.unitOfWorkProvider.run((c) =>
        c.workspaceDeletions.finishStep(
          intent.id,
          token,
          container.clock.now(),
          WORKSPACE_DELETION_STEP_SIZE,
        ),
      );
      if (!finished)
        await container.unitOfWorkProvider.run((c) =>
          c.workspaceDeletions.defer(
            intent.id,
            token,
            container.clock.now(),
            null,
            admitted === WORKSPACE_DELETION_STEP_SIZE ||
              resources.length === WORKSPACE_DELETION_STEP_SIZE,
          ),
        );
    } catch (cause) {
      await container.unitOfWorkProvider.run((c) =>
        c.workspaceDeletions.defer(
          intent.id,
          token,
          container.clock.now(),
          "回収を再試行しています。未回収の容量は保持しています。",
          false,
        ),
      );
      container.logger.error("Workspace deletion step failed", {
        intentId: intent.id,
        cause,
      });
    }
  }
}
