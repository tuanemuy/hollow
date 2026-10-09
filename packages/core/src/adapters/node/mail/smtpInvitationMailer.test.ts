import { performance } from "node:perf_hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  invitationMail,
  invitationMailSnapshot,
} from "../../../application/workspace/invitationMail";
import { startSmtpFixture } from "./__tests__/smtpFixture";
import { NodeSmtpInvitationMailer } from "./smtpInvitationMailer";

const externalError = {
  code: "EXTERNAL_API_ERROR",
  message: "招待メールを送信できませんでした。",
};
const snapshot = invitationMailSnapshot({
  name: "日本語😀 ワークスペース",
  email: "invitee@fixture.invalid",
  role: "editor",
  expiresAt: new Date("2026-10-23T05:00:00Z"),
  appUrl: "https://hollow.fixture.invalid",
});
const mail = invitationMail(snapshot, "synthetic-invitation-token");
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});
async function fixture(
  behavior: Parameters<typeof startSmtpFixture>[1] = {},
  deadlineMs = 30_000,
) {
  const server = await startSmtpFixture("starttls", behavior);
  cleanup.push(() => server.close());
  const sender = new NodeSmtpInvitationMailer(server.config, {
    ca: server.ca,
    deadlineMs,
  });
  cleanup.push(() => sender.stop());
  return { server, sender };
}
async function closed(
  server: Awaited<ReturnType<typeof startSmtpFixture>>,
  count: number,
) {
  await vi.waitFor(() => expect(server.closedConnections).toBe(count));
  expect(server.nativeRawClosedConnections).toBe(count);
  expect(server.nativeTlsClosedConnections).toBe(count);
}

describe("NodeSmtpInvitationMailer owned SMTP delivery contract", () => {
  it.each([
    "owner",
    "editor",
    "viewer",
  ] as const)("preserves Japanese subject, %s role, expiry and exact invitation link over verified STARTTLS", async (role) => {
    const { server, sender } = await fixture();
    const expected = invitationMail(
      {
        ...snapshot,
        beforeToken: invitationMailSnapshot({
          name: "日本語😀 ワークスペース",
          email: snapshot.to,
          role,
          expiresAt: new Date("2026-10-23T05:00:00Z"),
          appUrl: "https://hollow.fixture.invalid",
        }).beforeToken,
      },
      "synthetic-invitation-token",
    );
    await sender.send(
      "invitation-one-1",
      expected,
      new AbortController().signal,
    );
    await closed(server, 1);
    expect(server.acceptedConnections).toBe(1);
    expect(server.authSecure).toEqual([true]);
    expect(server.tlsNames).toEqual(["smtp.fixture.invalid"]);
    expect(server.capturedMail()).toEqual([expected]);
    expect(server.messages[0]?.from).toBe(server.config.from);
    expect(expected.text).toContain(`${role} 招待`);
    expect(expected.text).toContain("期限: 2026-10-23T05:00:00.000Z");
    expect(expected.text).toContain(
      "https://hollow.fixture.invalid/invitations?token=synthetic-invitation-token",
    );
    expect(server.errors).toEqual([]);
  });

  it("supports verified implicit TLS with the same invitation port", async () => {
    const server = await startSmtpFixture("implicit");
    cleanup.push(() => server.close());
    const sender = new NodeSmtpInvitationMailer(server.config, {
      ca: server.ca,
    });
    cleanup.push(() => sender.stop());
    await sender.send("implicit-1", mail, new AbortController().signal);
    await closed(server, 1);
    expect(server.capturedMail()).toEqual([mail]);
    expect(server.authSecure).toEqual([true]);
  });

  it.each([
    { rejectAuth: true },
    { rejectRecipient: true },
    { rejectData: true },
  ])("translates rejection and never retries inside a delivery (%j)", async (behavior) => {
    const { server, sender } = await fixture(behavior);
    await expect(
      sender.send("rejected-1", mail, new AbortController().signal),
    ).rejects.toMatchObject(externalError);
    await closed(server, 1);
    expect(server.acceptedConnections).toBe(1);
    expect(server.messages).toHaveLength(behavior.rejectData ? 1 : 0);
  });

  it("reports DATA acknowledgement loss as failure without adapter resend or delivery-ID deduplication", async () => {
    const behavior = { loseAcknowledgement: true };
    const { server, sender } = await fixture(behavior);
    await expect(
      sender.send("ack-unknown-1", mail, new AbortController().signal),
    ).rejects.toMatchObject(externalError);
    await closed(server, 1);
    expect(server.acceptedConnections).toBe(1);
    expect(server.capturedMail()).toEqual([mail]);
    behavior.loseAcknowledgement = false;
    await sender.send("ack-unknown-1", mail, new AbortController().signal);
    await closed(server, 2);
    expect(server.acceptedConnections).toBe(2);
    expect(server.capturedMail()).toEqual([mail, mail]);
  });

  it.each([
    { stallAuth: true },
    { stallData: true },
  ])("bounds a complete invitation transaction and closes native sockets (%j)", async (behavior) => {
    const { server, sender } = await fixture(behavior, 1500);
    const started = performance.now();
    await expect(
      sender.send("deadline-1", mail, new AbortController().signal),
    ).rejects.toMatchObject(externalError);
    expect(performance.now() - started).toBeLessThan(2000);
    await closed(server, 1);
    expect(server.acceptedConnections).toBe(1);
    expect(server.messages).toHaveLength(behavior.stallData ? 1 : 0);
  });

  it("refuses a pre-aborted signal before composing or opening a connection", async () => {
    const { server, sender } = await fixture();
    await expect(
      sender.send(
        "aborted-1",
        mail,
        AbortSignal.abort(new Error("synthetic abort")),
      ),
    ).rejects.toMatchObject(externalError);
    expect(server.acceptedConnections).toBe(0);
    expect(server.messages).toEqual([]);
    await sender.send("following-1", mail, new AbortController().signal);
    await closed(server, 1);
    expect(server.capturedMail()).toEqual([mail]);
  });

  it.each([
    { stallAuth: true },
    { stallData: true },
  ])("aborts only the owned sender and waits for its native closure (%j)", async (behavior) => {
    const { server, sender } = await fixture(behavior);
    const controller = new AbortController();
    const sending = expect(
      sender.send("inflight-1", mail, controller.signal),
    ).rejects.toMatchObject(externalError);
    await (behavior.stallData ? server.dataReceived : server.authReceived);
    controller.abort(new Error("synthetic cancellation"));
    await sending;
    await closed(server, 1);
    expect(server.acceptedConnections).toBe(1);
  });

  it("does not let one invitation's abort stop a concurrent successful delivery", async () => {
    const behavior = { stallData: true };
    const { server, sender } = await fixture(behavior);
    const cancelled = new AbortController();
    const first = expect(
      sender.send("concurrent-a-1", mail, cancelled.signal),
    ).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(server.messages).toHaveLength(1));
    behavior.stallData = false;
    const other = { ...mail, to: "other@fixture.invalid" };
    const second = sender.send(
      "concurrent-b-1",
      other,
      new AbortController().signal,
    );
    await vi.waitFor(() => expect(server.authSecure).toEqual([true, true]));
    cancelled.abort();
    await Promise.all([first, second]);
    await closed(server, 2);
    expect(server.acceptedConnections).toBe(2);
    expect(server.capturedMail()).toEqual([mail, other]);
  });

  it("stop closes every owned sender, rejects their delivery and prevents future admission", async () => {
    const { server, sender } = await fixture({ stallAuth: true });
    const sends = ["stop-a-1", "stop-b-1"].map((id) =>
      expect(
        sender.send(id, mail, new AbortController().signal),
      ).rejects.toMatchObject(externalError),
    );
    await vi.waitFor(() => expect(server.authSecure).toEqual([true, true]));
    await sender.stop();
    await Promise.all(sends);
    await closed(server, 2);
    await expect(
      sender.send("stopped-1", mail, new AbortController().signal),
    ).rejects.toMatchObject(externalError);
    expect(server.acceptedConnections).toBe(2);
  });

  it.each([
    "",
    "bad\r\nid",
    "x".repeat(101),
  ])("rejects an invalid delivery ID before connection admission (%#)", async (id) => {
    const { server, sender } = await fixture();
    await expect(
      sender.send(id, mail, new AbortController().signal),
    ).rejects.toMatchObject({ code: "DATA_INTEGRITY_ERROR" });
    expect(server.acceptedConnections).toBe(0);
  });
});
