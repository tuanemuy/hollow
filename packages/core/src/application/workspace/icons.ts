import { BusinessRuleError } from "@repo/core/domain/error";
import { capacityLimit } from "@repo/core/domain/workspace/entity";
import {
  ICON_OUTPUT_BYTES,
  ICON_TIMEOUT_MS,
  validateIconInput,
} from "@repo/core/domain/workspace/icon";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import { importContext } from "../import/context";
import { invitationFromContinuation } from "./invitations";
import { requireWorkspaceOwner } from "./membership";

const unavailable = () =>
  new NotFoundError(
    "ICON_NOT_FOUND",
    "現在のアイコンを確認できません。設定を開き直してください。",
  );
const conflict = () =>
  new ConflictError(
    "WORKSPACE_SETTINGS_CHANGED",
    "設定が更新されたか権限が変わりました。現在の設定を確認して再試行してください。",
  );
function quota(
  used: number,
  replacing: number,
  bytes: number,
  workspaceId: string,
) {
  if (
    used - replacing + bytes >
    capacityLimit({ kind: "workspace", workspaceId })
  )
    throw new BusinessRuleError(
      "QUOTA_EXCEEDED",
      "ワークスペースの容量が不足しています。不要な容量を整理して再試行してください。",
    );
}
export async function beginWorkspaceIcon(
  container: HollowContainer,
  token: string | null,
  input: {
    workspaceId: string;
    settingsVersion: number;
    bytes: number;
    mime: string;
  },
) {
  validateIconInput(input.bytes, input.mime);
  const mime = input.mime;
  if (!container.workspaceIcon)
    throw new BusinessRuleError(
      "ICON_UNAVAILABLE",
      "画像処理を利用できません。",
    );
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const w = await requireWorkspaceOwner(c, input.workspaceId, account.id);
    if ((await c.workspaces.settingsVersion(w.id)) !== input.settingsVersion)
      throw conflict();
    const now = container.clock.now();
    const id = container.idGenerator.next();
    quota(
      await c.capacity.usedBytes({ kind: "workspace", workspaceId: w.id }, now),
      0,
      input.bytes,
      w.id,
    );
    await c.workspaceIcons.create({
      id,
      workspaceId: w.id,
      actorId: account.id,
      settingsVersion: input.settingsVersion,
      inputBytes: input.bytes,
      mime,
      bytes: input.bytes,
      storageKey: `icon-${id}`,
      state: "awaiting",
      output: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 600_000),
      nextAttemptAt: now,
    });
    return { id, uploadUrl: `/api/workspace-icon-uploads/${id}` };
  });
}
export async function acceptWorkspaceIcon(
  container: HollowContainer,
  token: string | null,
  id: string,
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
) {
  const processor = container.workspaceIcon?.processor;
  const storage = importContext(container).storage;
  if (!processor || !storage.withOwner) throw unavailable();
  const initial = await container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    const row = await c.workspaceIcons.find(id);
    if (
      !row ||
      row.actorId !== a.id ||
      row.state !== "awaiting" ||
      row.expiresAt <= container.clock.now()
    )
      throw unavailable();
    await requireWorkspaceOwner(c, row.workspaceId, a.id);
    if (
      (await c.workspaces.settingsVersion(row.workspaceId)) !==
      row.settingsVersion
    )
      throw conflict();
    if (
      !(await c.workspaceIcons.processing(
        id,
        new Date(container.clock.now().getTime() + ICON_TIMEOUT_MS),
      ))
    )
      throw conflict();
    return row;
  });
  const deadline = AbortSignal.timeout(ICON_TIMEOUT_MS);
  const activeSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    return await storage.withOwner({ kind: "icon-upload", id }, async () => {
      const result = await processor.process({
        body,
        bytes: initial.inputBytes,
        mime: initial.mime,
        signal: activeSignal,
      });
      if (activeSignal.aborted)
        throw new BusinessRuleError(
          "ICON_TIMEOUT",
          "画像処理が制限時間を超えました。再試行してください。",
        );
      if (result.data.length < 1 || result.data.length > ICON_OUTPUT_BYTES)
        throw new BusinessRuleError(
          "ICON_OUTPUT_SIZE",
          "変換後の画像が上限を超えています。別の画像を選択してください。",
        );
      await container.unitOfWorkProvider.run(async (c) => {
        const a = await requireAccount(container, c.accounts, token);
        await requireWorkspaceOwner(c, initial.workspaceId, a.id);
        const row = await c.workspaceIcons.find(id);
        if (
          !row ||
          row.actorId !== a.id ||
          row.state !== "processing" ||
          (await c.workspaces.settingsVersion(row.workspaceId)) !==
            row.settingsVersion
        )
          throw conflict();
        quota(
          await c.capacity.usedBytes(
            { kind: "workspace", workspaceId: row.workspaceId },
            container.clock.now(),
          ),
          row.bytes,
          result.data.length,
          row.workspaceId,
        );
        if (
          !(await c.workspaceIcons.writing(id, {
            bytes: result.data.length,
            sha256: result.sha256,
            width: result.width,
            height: result.height,
          }))
        )
          throw conflict();
      });
      const saved = await storage.putBounded(
        initial.storageKey,
        new ReadableStream({
          start(c) {
            c.enqueue(result.data);
            c.close();
          },
        }),
        result.data.length,
        activeSignal,
      );
      return container.unitOfWorkProvider.run(async (c) => {
        const a = await requireAccount(container, c.accounts, token);
        await requireWorkspaceOwner(c, initial.workspaceId, a.id);
        const row = await c.workspaceIcons.find(id);
        if (
          activeSignal.aborted ||
          !row ||
          row.actorId !== a.id ||
          row.state !== "writing" ||
          saved.bytes !== row.bytes ||
          saved.sha256 !== row.output.sha256 ||
          (await c.workspaces.settingsVersion(row.workspaceId)) !==
            row.settingsVersion
        )
          throw conflict();
        if (
          !(await c.workspaceIcons.adopt(
            id,
            row.workspaceId,
            row.settingsVersion,
            container.clock.now(),
          ))
        )
          throw conflict();
        return { iconId: id, settingsVersion: row.settingsVersion + 1 };
      });
    });
  } finally {
    await container.unitOfWorkProvider.run(async (c) => {
      const row = await c.workspaceIcons.find(id);
      if (row && row.state !== "ready")
        await c.workspaceIcons.fence(id, container.clock.now());
    });
    container.workspaceIcon?.wake();
    if (!body.locked) await body.cancel().catch(() => {});
  }
}
export async function getWorkspaceIcon(
  container: HollowContainer,
  token: string | null,
  input: {
    workspaceId: string;
    iconId: string;
    invitation?: Parameters<typeof invitationFromContinuation>[2];
  },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const w = await c.workspaces.find(input.workspaceId);
    if (!w || w.state !== "active" || w.iconId !== input.iconId)
      throw unavailable();
    if (input.invitation) {
      const invitation = await invitationFromContinuation(
        container,
        c,
        input.invitation,
      );
      if (invitation.workspaceId !== w.id) throw unavailable();
    } else {
      const a = await requireAccount(container, c.accounts, token);
      if (!(await c.workspaces.role(w.id, a.id))) throw unavailable();
    }
    const row = await c.workspaceIcons.find(input.iconId);
    if (!row || row.workspaceId !== w.id || row.state !== "ready")
      throw unavailable();
    return { storageKey: row.storageKey, bytes: row.bytes };
  });
}
export async function sweepWorkspaceIcons(container: HollowContainer) {
  const storage = importContext(container).storage;
  if (!storage.removeClaimed || !storage.recoverOwners) return;
  await storage.recoverOwners();
  const rows = await container.unitOfWorkProvider.run(async (c) => {
    await c.workspaceIcons.expire(container.clock.now());
    return c.workspaceIcons.cleanupCandidates(container.clock.now(), 20);
  });
  for (const row of rows)
    try {
      const claim = await storage.removeClaimed(row.storageKey);
      await container.unitOfWorkProvider.run((c) =>
        c.workspaceIcons.finishCleanup(row.id, claim.token),
      );
    } catch {
      await container.unitOfWorkProvider.run((c) =>
        c.workspaceIcons.retryCleanup(
          row.id,
          new Date(container.clock.now().getTime() + 30_000),
        ),
      );
    }
}
