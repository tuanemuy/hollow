import { EventId } from "@repo/core/domain/common/event";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { WorkspaceRole } from "@repo/core/domain/workspace/entity";
import {
  CONTINUATION_LIFETIME,
  INVITATION_LIFETIME,
  type Invitation,
  invitationActive,
  invitationRecipients,
  terminalInvitation,
} from "@repo/core/domain/workspace/invitation";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError, NotFoundError } from "../errors";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { invitationMailSnapshot } from "./invitationMail";
import type { InvitationLandingView, InvitationView } from "./invitationViews";
import { requireWorkspaceOwner } from "./membership";

const invalid = () =>
  new NotFoundError(
    "INVITATION_INVALID",
    "招待リンクが無効または期限切れです。オーナーに再発行を依頼してください。",
  );
export function requireInvitationDelivery(c: HollowContainer) {
  if (!c.invitationDelivery)
    throw new BusinessRuleError(
      "INVITATION_KEY_UNAVAILABLE",
      "招待の保護・配送設定を確認してください。通常の認証と招待の取消は利用できます。",
    );
  return c.invitationDelivery;
}
export async function activeInvitation(
  c: HollowUnitOfWorkContext,
  row: Invitation | null,
  now: Date,
) {
  if (
    !row ||
    !invitationActive(row, now) ||
    (await c.workspaces.role(row.workspaceId, row.issuerId)) !== "owner"
  )
    throw invalid();
  return row;
}
function verifyProtectedInvitation(
  container: HollowContainer,
  row: Invitation,
) {
  if (!row.envelope) throw invalid();
  const raw = requireInvitationDelivery(container).protector.reveal(
    row.envelope,
    { invitationId: row.id, generation: row.generation },
  );
  if (container.tokens.hash(raw) !== row.tokenHash) throw invalid();
}
const view = (r: Invitation, now: Date): InvitationView => ({
  id: r.id,
  email: r.email,
  role: r.role,
  generation: r.generation,
  state: r.state === "pending" && r.expiresAt <= now ? "expired" : r.state,
  issuedAt: r.issuedAt.toISOString(),
  expiresAt: r.expiresAt.toISOString(),
  deliveryState: r.deliveryState,
  attempts: r.attempts,
  failure: r.deliveryFailure,
  canCopy: invitationActive(r, now),
  canResend: now.getTime() - r.issuedAt.getTime() >= 60_000,
});
export async function listInvitations(
  container: HollowContainer,
  token: string | null,
  input: { workspaceId: string; cursor?: string },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    await requireWorkspaceOwner(c, input.workspaceId, a.id);
    const rows = await c.invitations.list(input.workspaceId, input.cursor, 51);
    const page = rows.slice(0, 50);
    return {
      items: page.map((r) => view(r, container.clock.now())),
      nextCursor: rows.length > 50 ? (page.at(-1)?.id ?? null) : null,
    };
  });
}
type IssueInput = {
  workspaceId: string;
  emails: readonly string[];
  role: WorkspaceRole;
  ownerConfirmed: boolean;
  requestId: string;
};
async function issue(
  c: HollowUnitOfWorkContext,
  container: HollowContainer,
  actorId: string,
  input: IssueInput,
  onlyId?: string,
) {
  const emails = invitationRecipients(input.emails);
  const now = container.clock.now();
  const workspace = await requireWorkspaceOwner(c, input.workspaceId, actorId);
  if (input.role === "owner" && !input.ownerConfirmed)
    throw new BusinessRuleError(
      "WORKSPACE_OWNER_CONFIRM",
      "オーナーは招待・設定・メンバー管理ができます。付与を確認してください。",
    );
  const digest = container.tokens.hash(
    JSON.stringify({
      workspaceId: input.workspaceId,
      emails,
      role: input.role,
      onlyId: onlyId ?? null,
    }),
  );
  const receipt = await c.invitations.receipt(actorId, input.requestId);
  if (receipt && receipt.expiresAt > now) {
    if (receipt.digest !== digest)
      throw new ConflictError(
        "INVITATION_REQUEST_CHANGED",
        "同じ受付IDの内容が変わりました。新しく確認してください。",
      );
    return { ids: [...receipt.ids], skipped: receipt.skipped };
  }
  const targets: { email: string; old: Invitation | null }[] = [];
  let skipped = 0;
  for (const email of emails) {
    const account = await c.accounts.findByEmail(email);
    if (account && (await c.workspaces.role(input.workspaceId, account.id))) {
      skipped++;
      continue;
    }
    const old = await c.invitations.byEmail(input.workspaceId, email);
    if (onlyId && old?.id !== onlyId) throw invalid();
    if (old && now.getTime() - old.issuedAt.getTime() < 60_000)
      throw new BusinessRuleError(
        "INVITATION_RESEND_RATE",
        "同じ宛先への再送は60秒お待ちください。",
      );
    targets.push({ email, old });
  }
  const rate = await c.invitations.rate(input.workspaceId, actorId, now);
  if (rate.workspace + targets.length > 100 || rate.actor + targets.length > 20)
    throw new BusinessRuleError(
      "INVITATION_RATE",
      "招待の送信上限です。時間をおいてください。今回の招待は送信していません。",
    );
  const ids: string[] = [];
  for (const { email, old } of targets) {
    const id = old?.id ?? container.idGenerator.next();
    const generation = (old?.generation ?? 0) + 1;
    const raw = container.tokens.generate();
    const envelope = requireInvitationDelivery(container).protector.protect(
      raw,
      {
        invitationId: id,
        generation,
      },
    );
    if (old) await c.invitations.archive(old, now);
    await c.invitations.save({
      id,
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      issuerId: actorId,
      generation,
      tokenHash: container.tokens.hash(raw),
      envelope,
      deliverySnapshot: invitationMailSnapshot({
        name: workspace.name,
        email,
        role: input.role,
        expiresAt: new Date(now.getTime() + INVITATION_LIFETIME),
        appUrl: container.appUrl,
      }),
      state: "pending",
      createdAt: old?.createdAt ?? now,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + INVITATION_LIFETIME),
      terminalAt: null,
      acceptedBy: null,
      deliveryState: "pending",
      attempts: 0,
      firstAttemptAt: null,
      nextAttemptAt: now,
      leaseToken: null,
      leaseUntil: null,
      deliveryFailure: null,
    });
    await c.invitations.countSend(
      container.idGenerator.next(),
      input.workspaceId,
      actorId,
      now,
    );
    c.collectEvents([
      {
        id: EventId.create(container.idGenerator.next()),
        type: "InvitationQueued",
        aggregateId: id,
        occurredAt: now,
        payload: { invitationId: id, generation },
      },
    ]);
    ids.push(id);
  }
  await c.invitations.saveReceipt({
    actorId,
    requestId: input.requestId,
    digest,
    ids,
    skipped,
    expiresAt: new Date(now.getTime() + 86400_000),
  });
  return { ids, skipped };
}
export async function issueInvitations(
  container: HollowContainer,
  token: string | null,
  input: IssueInput,
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    return issue(c, container, a.id, input);
  });
  container.invitationDelivery?.wake();
  return result;
}
export async function resendInvitation(
  container: HollowContainer,
  token: string | null,
  input: {
    workspaceId: string;
    id: string;
    requestId: string;
    ownerConfirmed: boolean;
  },
) {
  const result = await container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    await requireWorkspaceOwner(c, input.workspaceId, a.id);
    const old = await c.invitations.find(input.id);
    if (!old || old.workspaceId !== input.workspaceId) throw invalid();
    return issue(
      c,
      container,
      a.id,
      { ...input, emails: [old.email], role: old.role },
      old.id,
    );
  });
  container.invitationDelivery?.wake();
  return result;
}
export async function cancelInvitation(
  container: HollowContainer,
  token: string | null,
  input: { workspaceId: string; id: string; generation: number },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    await requireWorkspaceOwner(c, input.workspaceId, a.id);
    const row = await c.invitations.find(input.id);
    if (
      !row ||
      row.workspaceId !== input.workspaceId ||
      row.generation !== input.generation
    )
      throw invalid();
    if (row.state !== "pending") return;
    const terminal = terminalInvitation(
      row,
      "cancelled",
      container.clock.now(),
    );
    await c.invitations.save(terminal);
    await c.invitations.archive(terminal, container.clock.now());
  });
}
export function invitationUrl(c: HollowContainer, token: string) {
  const url = new URL("/invitations", c.appUrl);
  url.searchParams.set("token", token);
  return url.href;
}
export async function copyInvitation(
  container: HollowContainer,
  token: string | null,
  input: { workspaceId: string; id: string; generation: number },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const a = await requireAccount(container, c.accounts, token);
    await requireWorkspaceOwner(c, input.workspaceId, a.id);
    const row = await activeInvitation(
      c,
      await c.invitations.find(input.id),
      container.clock.now(),
    );
    if (
      row.workspaceId !== input.workspaceId ||
      row.generation !== input.generation ||
      !row.envelope
    )
      throw invalid();
    return {
      url: invitationUrl(
        container,
        requireInvitationDelivery(container).protector.reveal(row.envelope, {
          invitationId: row.id,
          generation: row.generation,
        }),
      ),
    };
  });
}
export async function beginInvitation(
  container: HollowContainer,
  raw: string,
  browserToken: string,
  previousId?: string,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const now = container.clock.now();
    const row = await activeInvitation(
      c,
      await c.invitations.byToken(container.tokens.hash(raw)),
      now,
    );
    verifyProtectedInvitation(container, row);
    const previous = previousId
      ? await c.invitations.continuation(previousId)
      : null;
    if (
      previous &&
      previous.browserHash === container.tokens.hash(browserToken) &&
      previous.invitationId === row.id &&
      previous.generation === row.generation &&
      previous.expiresAt > now
    )
      return { id: previous.id, expiresAt: previous.expiresAt };
    const continuation = {
      id: container.tokens.generate(),
      browserHash: container.tokens.hash(browserToken),
      invitationId: row.id,
      generation: row.generation,
      createdAt: now,
      expiresAt: new Date(
        Math.min(
          now.getTime() + CONTINUATION_LIFETIME,
          row.expiresAt.getTime(),
        ),
      ),
    };
    await c.invitations.saveContinuation(continuation);
    return { id: continuation.id, expiresAt: continuation.expiresAt };
  });
}
export type ContinuationInput = {
  continuationId: string;
  browserToken: string;
  expected?: { id: string; generation: number };
};
export async function invitationFromContinuation(
  container: HollowContainer,
  c: HollowUnitOfWorkContext,
  input: ContinuationInput,
  allowAccepted = false,
) {
  const now = container.clock.now();
  const continuation = await c.invitations.continuation(input.continuationId);
  if (
    !continuation ||
    continuation.expiresAt <= now ||
    continuation.browserHash !== container.tokens.hash(input.browserToken)
  )
    throw invalid();
  if (
    input.expected &&
    (input.expected.id !== continuation.invitationId ||
      input.expected.generation !== continuation.generation)
  )
    throw new BusinessRuleError(
      "INVITATION_SELECTION_CHANGED",
      "別の招待が開かれました。操作したい招待メールのリンクを開き直してください。",
    );
  const row = await c.invitations.find(continuation.invitationId);
  if (!row || row.generation !== continuation.generation) throw invalid();
  if (allowAccepted && row.state === "accepted") return row;
  const active = await activeInvitation(c, row, now);
  verifyProtectedInvitation(container, active);
  return active;
}
export async function getInvitationLanding(
  container: HollowContainer,
  token: string | null,
  input: ContinuationInput,
): Promise<InvitationLandingView> {
  return container.unitOfWorkProvider.run(async (c) => {
    const row = await invitationFromContinuation(container, c, input, true);
    const session = token
      ? await c.accounts.findSession(container.tokens.hash(token))
      : null;
    const account =
      session && session.expiresAt > container.clock.now()
        ? await c.accounts.findById(session.accountId)
        : null;
    const verified = account?.status === "verified" ? account : null;
    const member = verified
      ? await c.workspaces.role(row.workspaceId, verified.id)
      : null;
    if (
      row.state === "accepted" &&
      (!verified || row.acceptedBy !== verified.id || !member)
    )
      throw invalid();
    const w = await c.workspaces.find(row.workspaceId);
    if (!w || w.state !== "active") throw invalid();
    return {
      id: row.id,
      generation: row.generation,
      workspaceId: w.id,
      name: w.name,
      description: w.description,
      role: row.role,
      issuer: (await c.accounts.findById(row.issuerId))?.email ?? "招待者",
      expiresAt: row.expiresAt.toISOString(),
      status: row.state === "accepted" ? "joined" : "pending",
      signedIn: verified !== null,
      emailMatches: verified?.email === row.email,
      accountEmail: verified?.email ?? null,
    };
  });
}
export async function joinInvitation(
  container: HollowContainer,
  token: string | null,
  input: ContinuationInput & { confirmDifferentEmail: boolean },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const row = await invitationFromContinuation(container, c, input, true);
    if (row.state === "accepted") {
      if (
        row.acceptedBy === account.id &&
        (await c.workspaces.role(row.workspaceId, account.id))
      )
        return { workspaceId: row.workspaceId };
      throw invalid();
    }
    if (account.email !== row.email && !input.confirmDifferentEmail)
      throw new BusinessRuleError(
        "INVITATION_EMAIL_CONFIRM",
        "招待先と異なるメールアドレスです。このアカウントで参加することを確認してください。",
      );
    const now = container.clock.now();
    await c.workspaces.join(row.workspaceId, account.id, row.role, now);
    const terminal = terminalInvitation(row, "accepted", now, account.id);
    await c.invitations.save(terminal);
    await c.invitations.archive(terminal, now);
    return { workspaceId: row.workspaceId };
  });
}
export async function declineInvitation(
  container: HollowContainer,
  _token: string | null,
  input: ContinuationInput,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const row = await invitationFromContinuation(container, c, input);
    const now = container.clock.now();
    const terminal = terminalInvitation(row, "declined", now);
    await c.invitations.save(terminal);
    await c.invitations.archive(terminal, now);
  });
}
