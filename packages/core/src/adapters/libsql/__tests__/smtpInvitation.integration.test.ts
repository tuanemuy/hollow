import { randomBytes } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fixtureDirectory,
  startSmtpFixture,
} from "@repo/core/adapters/node/mail/__tests__/smtpFixture";
import { NodeSmtpInvitationMailer } from "@repo/core/adapters/node/mail/smtpInvitationMailer";
import { NodeTokenProtector } from "@repo/core/adapters/node/tokenProtector";
import { issueSession } from "@repo/core/application/account/session";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { deliverOneInvitation } from "@repo/core/application/workspace/delivery";
import {
  copyInvitation,
  issueInvitations,
  resendInvitation,
} from "@repo/core/application/workspace/invitations";
import { updateWorkspaceSettings } from "@repo/core/application/workspace/membership";
import { createWorkspace } from "@repo/core/application/workspace/usecases";
import { createAccount, verifyAccount } from "@repo/core/domain/account/entity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContainer, type TestContainer } from "./helpers";

describe("SMTP invitation application retry contract", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let directory: string;
  let now: Date;
  let owner: { id: string; token: string };
  let workspaceId: string;
  let server: Awaited<ReturnType<typeof startSmtpFixture>>;
  let sender: NodeSmtpInvitationMailer;
  const behavior = { loseAcknowledgement: false, rejectRecipient: false };

  beforeEach(async () => {
    directory = await fixtureDirectory();
    base = await createTestContainer();
    now = new Date("2026-10-09T05:00:00Z");
    behavior.loseAcknowledgement = false;
    behavior.rejectRecipient = false;
    server = await startSmtpFixture("starttls", behavior);
    sender = new NodeSmtpInvitationMailer(server.config, { ca: server.ca });
    const key = join(directory, "synthetic-invitation.key");
    await writeFile(key, randomBytes(32), { mode: 0o600, flag: "wx" });
    container = {
      ...createHollowContainer(base.db, "https://hollow.fixture.invalid", {
        async send() {},
      }),
      clock: { now: () => now },
      invitationDelivery: {
        protector: await NodeTokenProtector.load(key),
        mailer: sender,
        wake() {},
      },
    };
    owner = await container.unitOfWorkProvider.run(async (context) => {
      const account = verifyAccount(
        createAccount(
          container.idGenerator.next(),
          "owner@fixture.invalid",
          "synthetic-hash",
          now,
        ),
        now,
      );
      await context.accounts.save(account);
      const session = await issueSession(container, context.accounts, account);
      return { id: account.id, token: session.token };
    });
    workspaceId = (
      await createWorkspace(container, owner.token, {
        name: "日本語😀 招待fixture",
        description: "",
      })
    ).id;
  });
  afterEach(async () => {
    await sender?.stop();
    await server?.close();
    base?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  async function issue() {
    const result = await issueInvitations(container, owner.token, {
      workspaceId,
      emails: ["invitee@fixture.invalid"],
      role: "editor",
      ownerConfirmed: false,
      requestId: container.idGenerator.next(),
    });
    const id = result.ids[0];
    if (!id) throw new Error("Synthetic invitation missing");
    return id;
  }
  const row = (id: string) =>
    container.unitOfWorkProvider.run((context) => context.invitations.find(id));
  async function closed(count: number) {
    await vi.waitFor(() => expect(server.closedConnections).toBe(count));
    expect(server.nativeRawClosedConnections).toBe(count);
    expect(server.nativeTlsClosedConnections).toBe(count);
  }

  it("retries an unknown SMTP acknowledgement only at application backoff with the immutable original mail and token", async () => {
    const id = await issue();
    const issued = await row(id);
    if (!issued) throw new Error("Synthetic invitation missing");
    const copied = await copyInvitation(container, owner.token, {
      workspaceId,
      id,
      generation: 1,
    });
    behavior.loseAcknowledgement = true;
    expect(await deliverOneInvitation(container)).toBe(true);
    await closed(1);
    expect(server.acceptedConnections).toBe(1);
    const first = server.capturedMail()[0];
    if (!first) throw new Error("SMTP did not receive the synthetic DATA");
    expect(first.subject).toBe("日本語😀 招待fixture への招待 — Hollow");
    expect(first.text).toContain("editor 招待");
    expect(first.text).toContain(issued.expiresAt.toISOString());
    expect(first.text).toContain(copied.url);
    expect(await row(id)).toMatchObject({
      generation: 1,
      attempts: 1,
      deliveryState: "pending",
      nextAttemptAt: new Date(now.getTime() + 60_000),
      leaseToken: null,
      leaseUntil: null,
      tokenHash: issued.tokenHash,
      envelope: issued.envelope,
      expiresAt: issued.expiresAt,
    });
    expect(await deliverOneInvitation(container)).toBe(false);
    expect(server.acceptedConnections).toBe(1);

    await updateWorkspaceSettings(container, owner.token, {
      workspaceId,
      settingsVersion: 0,
      name: "改名後のワークスペース",
      description: "",
    });
    now = new Date(now.getTime() + 59_999);
    expect(await deliverOneInvitation(container)).toBe(false);
    behavior.loseAcknowledgement = false;
    now = new Date(now.getTime() + 1);
    expect(
      await deliverOneInvitation({
        ...container,
        appUrl: "https://changed.fixture.invalid",
      }),
    ).toBe(true);
    await closed(2);
    expect(server.acceptedConnections).toBe(2);
    expect(server.capturedMail()).toEqual([first, first]);
    expect(await row(id)).toMatchObject({
      generation: 1,
      attempts: 2,
      deliveryState: "sent",
      tokenHash: issued.tokenHash,
      envelope: issued.envelope,
      deliverySnapshot: issued.deliverySnapshot,
      expiresAt: issued.expiresAt,
      leaseToken: null,
      leaseUntil: null,
    });
    expect(await deliverOneInvitation(container)).toBe(false);
    expect(
      (
        await container.unitOfWorkProvider.run((context) =>
          context.invitations.rate(workspaceId, owner.id, now),
        )
      ).workspace,
    ).toBe(1);
    expect(server.acceptedConnections).toBe(2);
  });

  it("caps actual SMTP rejections at six attempts and requires explicit resend before a new generation can deliver", async () => {
    const id = await issue();
    behavior.rejectRecipient = true;
    const delays = [60_000, 300_000, 900_000, 3_600_000, 14_400_000];
    for (let attempt = 1; attempt <= 6; attempt++) {
      expect(await deliverOneInvitation(container)).toBe(true);
      await closed(attempt);
      const rejected = await row(id);
      expect(rejected).toMatchObject({
        generation: 1,
        attempts: attempt,
        deliveryState: attempt === 6 ? "failed" : "pending",
        leaseToken: null,
        leaseUntil: null,
      });
      expect(server.acceptedConnections).toBe(attempt);
      expect(server.messages).toEqual([]);
      if (attempt < 6) {
        const delay = delays[attempt - 1];
        if (delay === undefined || !rejected)
          throw new Error("Retry metadata missing");
        expect(rejected.nextAttemptAt.getTime()).toBe(now.getTime() + delay);
        expect(await deliverOneInvitation(container)).toBe(false);
        now = rejected.nextAttemptAt;
      }
    }
    behavior.rejectRecipient = false;
    now = new Date(now.getTime() + 14_400_000);
    expect(await deliverOneInvitation(container)).toBe(false);
    expect(server.acceptedConnections).toBe(6);
    await resendInvitation(container, owner.token, {
      workspaceId,
      id,
      requestId: container.idGenerator.next(),
      ownerConfirmed: false,
    });
    expect(await row(id)).toMatchObject({
      generation: 2,
      attempts: 0,
      deliveryState: "pending",
    });
    expect(await deliverOneInvitation(container)).toBe(true);
    await closed(7);
    expect(await row(id)).toMatchObject({
      generation: 2,
      attempts: 1,
      deliveryState: "sent",
    });
    expect(server.messages).toHaveLength(1);
    expect(server.acceptedConnections).toBe(7);
    expect(
      (
        await container.unitOfWorkProvider.run((context) =>
          context.invitations.rate(workspaceId, owner.id, now),
        )
      ).workspace,
    ).toBe(2);
  });
});
