import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DELIVERY_DELAYS,
  invitationActive,
  terminalInvitation,
} from "@repo/core/domain/workspace/invitation";
import type { HollowContainer } from "../di/hollowTypes";
import { invitationMail, invitationMailSnapshot } from "./invitationMail";
import { requireInvitationDelivery } from "./invitations";

export async function deliverOneInvitation(
  container: HollowContainer,
): Promise<boolean> {
  const now = container.clock.now();
  const leaseToken = container.tokens.generate();
  const row = await container.unitOfWorkProvider.run((c) =>
    c.invitations.claim(now, leaseToken, new Date(now.getTime() + 90_000)),
  );
  if (!row) return false;
  try {
    const delivery = requireInvitationDelivery(container);
    if (!row.envelope)
      throw new BusinessRuleError(
        "INVITATION_KEY_UNAVAILABLE",
        "招待の保護設定を確認してください。",
      );
    const prepared = await container.unitOfWorkProvider.run(async (c) => {
      const current = await c.invitations.find(row.id);
      const at = container.clock.now();
      if (
        !current ||
        current.generation !== row.generation ||
        current.leaseToken !== leaseToken ||
        !current.leaseUntil ||
        current.leaseUntil <= at
      )
        return null;
      if (
        !invitationActive(current, at) ||
        (await c.workspaces.role(current.workspaceId, current.issuerId)) !==
          "owner"
      ) {
        await c.invitations.save(
          terminalInvitation(
            current,
            current.expiresAt <= at ? "expired" : "issuer_lost",
            at,
          ),
        );
        return null;
      }
      if (
        current.attempts >= 6 ||
        (current.firstAttemptAt &&
          at.getTime() >= current.firstAttemptAt.getTime() + 86400_000)
      ) {
        await c.invitations.save({
          ...current,
          deliveryState: "failed",
          deliveryFailure:
            "メール配送の試行上限です。リンクのコピーまたは明示再送を利用してください。",
          leaseToken: null,
          leaseUntil: null,
        });
        return null;
      }
      const workspace = await c.workspaces.find(current.workspaceId);
      if (!workspace) return null;
      if (!current.deliverySnapshot && current.attempts > 0) {
        await c.invitations.save({
          ...current,
          deliveryState: "failed",
          leaseToken: null,
          leaseUntil: null,
          deliveryFailure:
            "旧配送の内容を確認できません。リンクのコピーまたは明示再送を利用してください。",
        });
        return null;
      }
      const snapshot =
        current.deliverySnapshot ??
        invitationMailSnapshot({
          name: workspace.name,
          email: current.email,
          role: current.role,
          expiresAt: current.expiresAt,
          appUrl: container.appUrl,
        });
      const attempted = {
        ...current,
        deliverySnapshot: snapshot,
        attempts: current.attempts + 1,
        firstAttemptAt: current.firstAttemptAt ?? at,
      };
      await c.invitations.save(attempted);
      return {
        attempted,
        snapshot,
      };
    });
    if (!prepared) return true;
    if (
      !(await container.unitOfWorkProvider.run(async (c) => {
        const current = await c.invitations.find(row.id);
        return (
          current?.generation === row.generation &&
          current.leaseToken === leaseToken &&
          invitationActive(current, container.clock.now()) &&
          (await c.workspaces.role(current.workspaceId, current.issuerId)) ===
            "owner"
        );
      }))
    )
      return true;
    const token = delivery.protector.reveal(row.envelope, {
      invitationId: row.id,
      generation: row.generation,
    });
    const mail = invitationMail(prepared.snapshot, token);
    const remaining = Math.min(
      30_000,
      prepared.attempted.firstAttemptAt.getTime() +
        86400_000 -
        container.clock.now().getTime(),
    );
    const signal = AbortSignal.timeout(Math.max(1, remaining));
    let onAbort = () => {};
    try {
      await Promise.race([
        delivery.mailer.send(`${row.id}-${row.generation}`, mail, signal),
        new Promise<never>((_, reject) => {
          onAbort = () => reject(new Error("Delivery deadline"));
          signal.addEventListener("abort", onAbort, { once: true });
        }),
      ]);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    await container.unitOfWorkProvider.run(async (c) => {
      const current = await c.invitations.find(row.id);
      const at = container.clock.now();
      if (
        current?.generation === row.generation &&
        current.leaseToken === leaseToken &&
        current.leaseUntil &&
        current.leaseUntil > at &&
        invitationActive(current, at) &&
        (await c.workspaces.role(current.workspaceId, current.issuerId)) ===
          "owner"
      )
        await c.invitations.save({
          ...current,
          deliveryState: "sent",
          leaseToken: null,
          leaseUntil: null,
          deliveryFailure: null,
        });
    });
  } catch (error) {
    const configuration =
      error instanceof BusinessRuleError &&
      (error.code === "INVITATION_KEY_UNAVAILABLE" ||
        error.code === "INVITATION_DELIVERY_CONFIGURATION");
    await container.unitOfWorkProvider.run(async (c) => {
      const current = await c.invitations.find(row.id);
      const at = container.clock.now();
      if (
        !current ||
        current.generation !== row.generation ||
        current.leaseToken !== leaseToken ||
        current.state !== "pending"
      )
        return;
      const exhausted =
        current.attempts >= 6 ||
        !!(
          current.firstAttemptAt &&
          at.getTime() >= current.firstAttemptAt.getTime() + 86400_000
        );
      const consumedForConfiguration =
        configuration && current.attempts > row.attempts;
      await c.invitations.save({
        ...current,
        attempts: current.attempts - (consumedForConfiguration ? 1 : 0),
        firstAttemptAt:
          consumedForConfiguration && row.attempts === 0
            ? null
            : current.firstAttemptAt,
        deliveryState: configuration
          ? "configuration"
          : exhausted
            ? "failed"
            : "pending",
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: new Date(
          at.getTime() +
            (configuration
              ? 60_000
              : (DELIVERY_DELAYS[Math.max(0, current.attempts - 1)] ??
                14400_000)),
        ),
        deliveryFailure: configuration
          ? "招待メールの保護・配送設定待ちです。期限は延長されません。"
          : "メールを配送できませんでした。再試行待ちまたはリンクのコピーを利用してください。",
      });
    });
  }
  return true;
}
export async function sweepInvitations(container: HollowContainer) {
  await container.unitOfWorkProvider.run((c) =>
    c.invitations.expireAndPrune(container.clock.now(), 50),
  );
  for (let n = 0; n < 10; n++)
    if (!(await deliverOneInvitation(container))) break;
}
