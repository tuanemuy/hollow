import type { Database } from "@repo/core/adapters/libsql/client";
import { signIn } from "@repo/core/application/account/signIn";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { changeWorkspaceMember } from "@repo/core/application/workspace/membership";
import type { createOrganizeDriveFixture } from "./organizeDriveFixture.node";

export async function seedRetirement(
  database: Database,
  origin: string,
  drive?: Awaited<ReturnType<typeof createOrganizeDriveFixture>>,
) {
  const c = createHollowContainer(database, origin, {
    send: async () => {
      throw new Error("Retirement seed does not send mail");
    },
  });
  try {
    const owner = await signIn(c, {
      email: "owner@editing.fixture.invalid",
      password: "local-editing-password-123",
    });
    const successor = await signIn(c, {
      email: "editor@editing.fixture.invalid",
      password: "local-editing-password-123",
    });
    const workspaces = await c.unitOfWorkProvider.run((u) =>
      u.workspaces.list(owner.user.id, undefined, 50),
    );
    for (const workspace of workspaces.filter((w) => w.role === "owner")) {
      let role = await c.unitOfWorkProvider.run((u) =>
        u.workspaces.role(workspace.id, successor.user.id),
      );
      if (!role) {
        await c.unitOfWorkProvider.run((u) =>
          u.workspaces.join(
            workspace.id,
            successor.user.id,
            "editor",
            c.clock.now(),
          ),
        );
        role = "editor";
      }
      await changeWorkspaceMember(c, owner.token, {
        workspaceId: workspace.id,
        accountId: successor.user.id,
        role: "owner",
        expectedRole: role,
        ownerConfirmed: true,
      });
    }
    if (drive) {
      await c.unitOfWorkProvider.run(async (u) => {
        const previous = await u.driveConnections.ensure(
          owner.user.id,
          c.clock.now(),
        );
        const now = c.clock.now();
        const epoch = previous.epoch + 1;
        const credentialVersion = previous.credentialVersion + 1;
        const subject = `local-${owner.user.id}`;
        const linked = {
          ...previous,
          state: "linked" as const,
          epoch,
          credentialVersion,
          settingsVersion: previous.settingsVersion + 1,
          version: previous.version + 1,
          autoBackup: false,
          folder: null,
          lastUsedAt: null,
          updatedAt: now,
          credential: {
            subject,
            email: null,
            envelope: drive.protector.protect(
              JSON.stringify({
                version: 1,
                accessToken: "local-access",
                refreshToken: "local-refresh",
              }),
              {
                purpose: "credential",
                accountId: owner.user.id,
                subject,
                epoch,
                credentialVersion,
              },
            ),
            scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
            accessExpiresAt: new Date(now.getTime() + 3600000),
            connectedAt: now,
          },
        };
        if (
          !(await u.driveConnections.replace(linked, previous.version, "adopt"))
        )
          throw new Error("Local Drive adoption rejected");
        if (
          !(await u.driveConnections.replace(
            {
              ...linked,
              folder: {
                id: drive.folderId,
                name: "ローカル原本バックアップ",
                driveId: null,
                resourceKeyEnvelope: null,
                checkedAt: now,
              },
              version: linked.version + 1,
              settingsVersion: linked.settingsVersion + 1,
            },
            linked.version,
            "folder",
          ))
        )
          throw new Error("Local Drive folder rejected");
      });
    }
    return {
      successor: "editor@editing.fixture.invalid",
      workspaces: workspaces.filter((w) => w.role === "owner").map((w) => w.id),
    };
  } finally {
    await c.passwordHasher.stop();
  }
}
