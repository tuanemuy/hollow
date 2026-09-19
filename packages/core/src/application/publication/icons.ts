import { BusinessRuleError } from "@repo/core/domain/error";
import { capacityLimit } from "@repo/core/domain/workspace/entity";
import {
  ICON_OUTPUT_BYTES,
  ICON_TIMEOUT_MS,
  validateIconInput,
} from "@repo/core/domain/workspace/icon";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { NotFoundError } from "../errors";
import { importContext } from "../import/context";
import { profileChanged, profileView } from "./profile";

const unavailable = () =>
  new NotFoundError(
    "PROFILE_ICON_NOT_FOUND",
    "現在のアイコンを確認できません。プロフィールを開き直してください。",
  );
function quota(
  used: number,
  replacing: number,
  bytes: number,
  accountId: string,
) {
  if (used - replacing + bytes > capacityLimit({ kind: "personal", accountId }))
    throw new BusinessRuleError(
      "QUOTA_EXCEEDED",
      "個人の保存容量が不足しています。不要な容量を整理して再試行してください。",
    );
}
export async function beginProfileIcon(
  container: HollowContainer,
  token: string | null,
  input: { profileVersion: number; bytes: number; mime: string },
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
    if (!token) throw unavailable();
    await c.publicProfiles.ensure(account.id);
    const profile = await c.publicProfiles.find(account.id);
    if (profile?.version !== input.profileVersion) throw profileChanged();
    const now = container.clock.now();
    quota(
      await c.capacity.usedBytes(
        { kind: "personal", accountId: account.id },
        now,
      ),
      0,
      input.bytes,
      account.id,
    );
    const id = container.idGenerator.next();
    await c.profileIcons.create({
      id,
      accountId: account.id,
      sessionHash: container.tokens.hash(token),
      profileVersion: profile.version,
      inputBytes: input.bytes,
      mime,
      bytes: input.bytes,
      storageKey: `profile-icon-${id}`,
      state: "awaiting",
      output: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 600_000),
      nextAttemptAt: now,
    });
    return { id, uploadUrl: `/api/profile-icon-uploads/${id}` };
  });
}
export async function acceptProfileIcon(
  container: HollowContainer,
  token: string | null,
  id: string,
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
) {
  const processor = container.workspaceIcon?.processor;
  const storage = importContext(container).storage;
  if (!processor || !storage.withOwner || !token) throw unavailable();
  const sessionHash = container.tokens.hash(token);
  const initial = await container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    const row = await c.profileIcons.find(id);
    if (
      !row ||
      row.accountId !== a.id ||
      row.sessionHash !== sessionHash ||
      row.state !== "awaiting" ||
      row.expiresAt <= container.clock.now()
    )
      throw unavailable();
    if ((await c.publicProfiles.find(a.id))?.version !== row.profileVersion)
      throw profileChanged();
    if (
      !(await c.profileIcons.processing(
        id,
        new Date(container.clock.now().getTime() + ICON_TIMEOUT_MS),
      ))
    )
      throw profileChanged();
    return row;
  });
  const deadline = AbortSignal.timeout(ICON_TIMEOUT_MS);
  const activeSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  try {
    return await storage.withOwner(
      { kind: "profile-icon-upload", id },
      async () => {
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
          const row = await c.profileIcons.find(id);
          if (
            !row ||
            row.accountId !== a.id ||
            row.sessionHash !== sessionHash ||
            row.state !== "processing" ||
            row.expiresAt <= container.clock.now() ||
            (await c.publicProfiles.find(a.id))?.version !== row.profileVersion
          )
            throw profileChanged();
          quota(
            await c.capacity.usedBytes(
              { kind: "personal", accountId: a.id },
              container.clock.now(),
            ),
            row.bytes,
            result.data.length,
            a.id,
          );
          if (
            !(await c.profileIcons.writing(id, {
              bytes: result.data.length,
              sha256: result.sha256,
              width: result.width,
              height: result.height,
            }))
          )
            throw profileChanged();
        });
        const saved = await storage.putBounded(
          initial.storageKey,
          new ReadableStream({
            start(controller) {
              controller.enqueue(result.data);
              controller.close();
            },
          }),
          result.data.length,
          activeSignal,
        );
        return container.unitOfWorkProvider.run(async (c) => {
          const a = await requireAccount(container, c.accounts, token);
          const row = await c.profileIcons.find(id);
          if (
            activeSignal.aborted ||
            !row ||
            row.accountId !== a.id ||
            row.sessionHash !== sessionHash ||
            row.state !== "writing" ||
            saved.bytes !== row.bytes ||
            saved.sha256 !== row.output.sha256 ||
            (await c.publicProfiles.find(a.id))?.version !== row.profileVersion
          )
            throw profileChanged();
          if (
            !(await c.profileIcons.adopt(
              id,
              a.id,
              row.profileVersion,
              container.clock.now(),
            ))
          )
            throw profileChanged();
          return profileView(c, a.id);
        });
      },
    );
  } finally {
    await container.unitOfWorkProvider.run(async (c) => {
      const row = await c.profileIcons.find(id);
      if (row && row.state !== "ready")
        await c.profileIcons.fence(id, container.clock.now());
    });
    container.workspaceIcon?.wake();
    if (!body.locked) await body.cancel().catch(() => {});
  }
}
export async function removeProfileIcon(
  container: HollowContainer,
  token: string | null,
  profileVersion: number,
) {
  const view = await container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    const profile = await c.publicProfiles.find(a.id);
    if ((profile?.version ?? 0) !== profileVersion) throw profileChanged();
    if (profile?.iconId) {
      if (
        !(await c.publicProfiles.save(
          { ...profile, iconId: null },
          profileVersion,
        ))
      )
        throw profileChanged();
      await c.profileIcons.fence(profile.iconId, container.clock.now());
    }
    return profileView(c, a.id);
  });
  container.workspaceIcon?.wake();
  return view;
}
export async function getProfileIcon(
  container: HollowContainer,
  token: string | null,
  input: { iconId: string; handle?: string },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const profile =
      input.handle !== undefined
        ? await c.publicProfiles.findByHandle(input.handle)
        : await c.publicProfiles.find(
            (await requireAccount(container, c.accounts, token)).id,
          );
    if (!profile || profile.iconId !== input.iconId) throw unavailable();
    const row = await c.profileIcons.find(input.iconId);
    if (!row || row.accountId !== profile.accountId || row.state !== "ready")
      throw unavailable();
    return {
      accountId: profile.accountId,
      iconId: row.id,
      storageKey: row.storageKey,
      bytes: row.bytes,
      sha256: row.output.sha256,
    };
  });
}
export async function sweepProfileIcons(container: HollowContainer) {
  const storage = importContext(container).storage;
  if (!storage.removeClaimed || !storage.recoverOwners) return;
  await storage.recoverOwners();
  const rows = await container.unitOfWorkProvider.run(async (c) => {
    await c.profileIcons.expire(container.clock.now());
    return c.profileIcons.cleanupCandidates(container.clock.now(), 20);
  });
  for (const row of rows)
    try {
      const claim = await storage.removeClaimed(row.storageKey);
      const finished = await container.unitOfWorkProvider.run((c) =>
        c.profileIcons.finishCleanup(row.id, claim.token),
      );
      if (!finished)
        await container.unitOfWorkProvider.run((c) =>
          c.profileIcons.retryCleanup(
            row.id,
            new Date(container.clock.now().getTime() + 30_000),
          ),
        );
    } catch {
      await container.unitOfWorkProvider.run((c) =>
        c.profileIcons.retryCleanup(
          row.id,
          new Date(container.clock.now().getTime() + 30_000),
        ),
      );
    }
}

export async function getPublicWorkspaceIcon(
  container: HollowContainer,
  slug: string,
  iconId: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const publication = await c.workspacePublications.resolve(slug);
    if (!publication) throw unavailable();
    const w = await c.workspaces.find(publication.workspaceId);
    const icon = await c.workspaceIcons.find(iconId);
    if (
      !w ||
      w.state !== "active" ||
      w.iconId !== iconId ||
      !icon ||
      icon.state !== "ready" ||
      icon.workspaceId !== w.id
    )
      throw unavailable();
    return {
      ...publication,
      iconId,
      storageKey: icon.storageKey,
      bytes: icon.bytes,
      sha256: icon.output.sha256,
    };
  });
}
