import { join } from "node:path";
import type { Database } from "@repo/core/adapters/libsql/client";
import { NodeTagNormalizer } from "@repo/core/adapters/node/browse/tagNormalizer";
import { NodeSharePasswordWork } from "@repo/core/adapters/node/sharePasswordWork";
import { NodeShareTokenProtector } from "@repo/core/adapters/node/shareSecrets";
import { signIn } from "@repo/core/application/account/signIn";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { saveNote } from "@repo/core/application/note/saveNote";
import {
  getProfile,
  saveProfile,
} from "@repo/core/application/publication/profile";
import {
  getWorkspacePublication,
  setWorkspacePublication,
} from "@repo/core/application/publication/workspace";
import {
  changeSharing,
  getShareLink,
  getSharing,
} from "@repo/core/application/sharing/settings";
import { changeNoteTags } from "@repo/core/application/tag/usecases";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";

export async function seedSharing(
  db: Database,
  root: string,
  appUrl: string,
  workspaceId: string,
  referenceOrigin: string,
) {
  const base = createHollowContainer(db, appUrl, { async send() {} });
  const passwordWork = new NodeSharePasswordWork();
  const c = {
    ...base,
    sharing: {
      protector: await NodeShareTokenProtector.load({
        directory: join(root, "keys"),
        activeKeyId: "share",
        keyIds: ["share"],
      }),
      passwordWork,
    },
    tagging: {
      normalizer: NodeTagNormalizer,
      read: {
        async read(): Promise<never> {
          throw Error("Seed does not read tag pages");
        },
      },
    },
  };
  try {
    const sessions: Awaited<ReturnType<typeof signIn>>[] = [];
    for (const role of ["owner", "editor", "viewer"])
      sessions.push(
        await signIn(c, {
          email: `${role}@editing.fixture.invalid`,
          password: "local-editing-password-123",
        }),
      );
    const [owner, other, empty] = sessions;
    if (!owner || !other || !empty)
      throw Error("Local sharing identities missing");
    for (const [session, handle, name] of [
      [owner, "sharing-owner", "公開所有者"],
      [other, "sharing-other", "別の著者"],
      [empty, "sharing-empty", "公開0件利用者"],
    ] as const) {
      const profile = await getProfile(c, session.token);
      await saveProfile(c, session.token, {
        displayName: name,
        handle,
        bio: `${name}の自己紹介`,
        nameVersion: profile.nameVersion,
        profileVersion: profile.profileVersion,
        confirmHandleChange: false,
      });
    }
    const settings = await getWorkspaceSettings(c, owner.token, {
      workspaceId,
    });
    await updateWorkspaceSettings(c, owner.token, {
      workspaceId,
      settingsVersion: settings.settingsVersion,
      name: settings.name,
      description: "非公開WSの非公開メタ情報",
      slug: "sharing-private-ws",
    });
    const publicWs = await createWorkspace(c, owner.token, {
      name: "公開共有スペース",
      description: "公開WS説明",
      slug: "sharing-public-ws",
    });
    const emptyWs = await createWorkspace(c, owner.token, {
      name: "公開0件スペース",
      description: "ノート公開の案内",
      slug: "sharing-empty-ws",
    });
    for (const workspace of [publicWs, emptyWs]) {
      const publication = await getWorkspacePublication(
        c,
        owner.token,
        workspace.id,
      );
      await setWorkspacePublication(c, owner.token, {
        workspaceId: workspace.id,
        settingsVersion: publication.settingsVersion,
        publicationVersion: publication.publicationVersion,
        pagePublic: true,
      });
    }
    const notes: Record<
      string,
      {
        id: string;
        publicUrl: string | null;
        link: string | null;
        title: string;
      }
    > = {};
    for (const input of [
      {
        key: "ownerPublic",
        actor: owner,
        title: "東京駅 Cloudflare 公開",
        visibility: "public" as const,
        at: "2026-09-30T15:00:00Z",
      },
      {
        key: "otherPublic",
        actor: other,
        title: "別の東京駅記録",
        visibility: "public" as const,
        at: "2026-10-01T15:00:00Z",
      },
      {
        key: "workspacePublic",
        actor: owner,
        workspaceId: publicWs.id,
        title: "公開WS 東京駅 Cloudflare",
        visibility: "public" as const,
        at: "2026-10-02T00:00:00Z",
      },
      {
        key: "privateWsPublic",
        actor: owner,
        workspaceId,
        title: "非公開WSの個別公開東京駅",
        visibility: "public" as const,
        at: "2026-10-03T00:00:00Z",
      },
      {
        key: "limited",
        actor: owner,
        title: "限定東京駅 SECRET-LIMITED",
        visibility: "link" as const,
        at: "2026-10-04T00:00:00Z",
      },
      {
        key: "protected",
        actor: owner,
        title: "保護東京駅 SECRET-PROTECTED",
        visibility: "link" as const,
        password: "local-share-password",
        at: "2026-10-05T00:00:00Z",
      },
      {
        key: "private",
        actor: owner,
        title: "非公開東京駅 SECRET-PRIVATE",
        visibility: "private" as const,
        at: "2026-10-06T00:00:00Z",
      },
      {
        key: "workspaceLimited",
        actor: owner,
        workspaceId,
        title: "共同限定東京駅",
        visibility: "link" as const,
        at: "2026-10-07T00:00:00Z",
      },
    ]) {
      const dated = { ...c, clock: { now: () => new Date(input.at) } };
      const saved = await saveNote(dated, input.actor.token, {
        ...("workspaceId" in input ? { workspaceId: input.workspaceId } : {}),
        title: input.title,
        html: `<h1>${input.title}</h1><p>東京駅の記録 Cloudflare cloud computing</p><p>公開本文として読み返す。</p><img src="${referenceOrigin}/missing.png" alt="取得できない画像">`,
      });
      await changeNoteTags(dated, input.actor.token, {
        noteId: saved.note.id,
        expectedScope:
          "workspaceId" in input ? { workspaceId: input.workspaceId } : {},
        change: { kind: "create", name: "共通" },
      });
      if (input.key === "ownerPublic")
        await changeNoteTags(dated, input.actor.token, {
          noteId: saved.note.id,
          expectedScope: {},
          change: { kind: "create", name: "旅行" },
        });
      let sharing = await getSharing(dated, input.actor.token, saved.note.id);
      if ("password" in input)
        sharing = await changeSharing(dated, input.actor.token, {
          expected: sharing.expected,
          operation: { kind: "password", password: input.password },
        });
      if (input.visibility !== "private")
        sharing = await changeSharing(dated, input.actor.token, {
          expected: sharing.expected,
          operation:
            input.visibility === "public"
              ? {
                  kind: "visibility",
                  visibility: "public",
                  confirmPasswordRemoval: true,
                }
              : { kind: "visibility", visibility: "link" },
        });
      notes[input.key] = {
        id: saved.note.id,
        title: input.title,
        publicUrl: sharing.publicUrl,
        link: sharing.hasLink
          ? (await getShareLink(dated, input.actor.token, sharing.expected)).url
          : null,
      };
    }
    return {
      notes,
      publicWorkspaceId: publicWs.id,
      emptyWorkspaceId: emptyWs.id,
      privateWorkspaceId: workspaceId,
      profiles: ["sharing-owner", "sharing-other", "sharing-empty"],
    };
  } finally {
    await passwordWork.stop();
    await base.passwordHasher.stop();
  }
}
