import { profileBio, publicHandle } from "@repo/core/domain/account/profile";
import { BusinessRuleError } from "@repo/core/domain/error";
import { displayName } from "@repo/core/domain/sharing/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type {
  HandleAvailability,
  ProfileView,
  SaveProfileInput,
} from "./views";

export const profileChanged = () =>
  new ConflictError(
    "PROFILE_CHANGED",
    "プロフィールが更新されました。現在の設定を確認してください。",
  );

export async function profileView(
  c: HollowUnitOfWorkContext,
  accountId: string,
): Promise<ProfileView> {
  const profile = await c.publicProfiles.find(accountId);
  const name = await c.displayNames.find(accountId);
  const icon = profile?.iconId
    ? await c.profileIcons.find(profile.iconId)
    : null;
  return {
    actorId: accountId,
    displayName: name.displayName,
    nameVersion: name.version,
    handle: profile?.handle ?? null,
    bio: profile?.bio ?? "",
    profileVersion: profile?.version ?? 0,
    url: profile?.handle ? `/@${profile.handle}` : null,
    icon:
      icon?.state === "ready" && icon.accountId === accountId
        ? { id: icon.id, url: `/api/profile/icons/${icon.id}` }
        : null,
  };
}

export async function getProfile(
  container: HollowContainer,
  token: string | null,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return profileView(c, account.id);
  });
}

export async function saveProfile(
  container: HollowContainer,
  token: string | null,
  input: SaveProfileInput,
): Promise<ProfileView> {
  const name = displayName(input.displayName);
  const handle = publicHandle(input.handle);
  const bio = profileBio(input.bio);
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await c.publicProfiles.ensure(account.id);
    const profile = await c.publicProfiles.find(account.id);
    const currentName = await c.displayNames.find(account.id);
    if (
      !profile ||
      profile.version !== input.profileVersion ||
      currentName.version !== input.nameVersion
    )
      throw profileChanged();
    if (profile.handle !== handle) {
      if (profile.handle && !input.confirmHandleChange)
        throw new BusinessRuleError(
          "PROFILE_HANDLE_CONFIRM",
          "プロフィールURLの変更を確認してください。ノートの公開URLは変わりません。",
        );
      if (!handle && (await c.publicProfiles.hasPublicNotes(account.id)))
        throw new BusinessRuleError(
          "PROFILE_PUBLIC_NOTES_REMAIN",
          "個人所有の公開ノートを非公開にしてからハンドルを解除してください。ゴミ箱のノートも対象です。",
        );
      if (handle && (await c.publicProfiles.handleExists(handle, account.id)))
        throw new BusinessRuleError(
          "PROFILE_HANDLE_TAKEN",
          "このハンドルは使われています。別の候補を選んでください。",
        );
    }
    if (
      currentName.displayName !== name &&
      !(await c.displayNames.save(account.id, input.nameVersion, name))
    )
      throw profileChanged();
    if (
      profile.handle !== handle ||
      profile.bio !== bio ||
      currentName.displayName !== name
    ) {
      if (
        !(await c.publicProfiles.save(
          { ...profile, handle, bio },
          input.profileVersion,
        ))
      )
        throw profileChanged();
    }
    return profileView(c, account.id);
  });
}

export async function checkHandle(
  container: HollowContainer,
  token: string | null,
  value: string,
): Promise<HandleAvailability> {
  const handle = publicHandle(value);
  if (!handle)
    throw new BusinessRuleError(
      "PROFILE_HANDLE_REQUIRED",
      "確認するハンドルを入力してください。",
    );
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const available = !(await c.publicProfiles.handleExists(
      handle,
      account.id,
    ));
    const candidates: string[] = [];
    if (!available)
      for (let i = 2; i <= 5; i++) {
        const candidate = `${handle.slice(0, 60).replace(/-+$/u, "")}-${i}`;
        if (!(await c.publicProfiles.handleExists(candidate, account.id)))
          candidates.push(candidate);
        if (candidates.length === 3) break;
      }
    return { actorId: account.id, handle, available, candidates };
  });
}
