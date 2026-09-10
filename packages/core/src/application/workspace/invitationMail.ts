import type { WorkspaceRole } from "@repo/core/domain/workspace/entity";
import type { InvitationDeliverySnapshot } from "@repo/core/domain/workspace/invitation";
import type { Mail } from "../ports/mailer";

export function invitationMailSnapshot(
  input: Readonly<{
    name: string;
    email: string;
    role: WorkspaceRole;
    expiresAt: Date;
    appUrl: string;
  }>,
): InvitationDeliverySnapshot {
  const link = new URL("/invitations", input.appUrl);
  return {
    to: input.email,
    subject: `${input.name} への招待 — Hollow`,
    beforeToken: `${input.name} への ${input.role} 招待です。リンクを開き、アカウントを確認して参加してください。期限: ${input.expiresAt.toISOString()}\n\n${link.href}?token=`,
    afterToken: "\n\n心当たりがなければ参加しないでください。",
  };
}

export function invitationMail(
  snapshot: InvitationDeliverySnapshot,
  token: string,
): Mail {
  return {
    to: snapshot.to,
    subject: snapshot.subject,
    text:
      snapshot.beforeToken + encodeURIComponent(token) + snapshot.afterToken,
  };
}
