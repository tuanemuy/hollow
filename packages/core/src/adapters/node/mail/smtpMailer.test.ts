import { createServer, type Socket } from "node:net";
import { performance } from "node:perf_hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mail } from "../../../application/ports/mailer";
import { decodeMime, startSmtpFixture } from "./__tests__/smtpFixture";
import type { NodeSmtpConfig } from "./config";
import { NodeSmtpMailer } from "./smtpMailer";

const mail: Mail = {
  to: "recipient@example.invalid",
  subject: "メールアドレスを確認してください",
  text: "確認リンクを開いてください。\nhttps://hollow.example.invalid/auth/verify?token=synthetic\n日本語の本文です。",
};
const externalError = {
  code: "EXTERNAL_API_ERROR",
  message: "メールを送信できませんでした。",
};
const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

describe("NodeSmtpMailer loopback TLS contract", () => {
  it.each([
    "implicit",
    "starttls",
  ] as const)("%s authenticates only over verified TLS and preserves Japanese mail", async (mode) => {
    const fixture = await startSmtpFixture(mode);
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    await sender.send(mail);
    await sender.send({ ...mail, subject: "確認メール再発行" });
    expect(fixture.acceptedConnections).toBe(2);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(2));
    expect(fixture.nativeRawClosedConnections).toBe(2);
    expect(fixture.nativeTlsClosedConnections).toBe(2);
    expect(fixture.authSecure).toEqual([true, true]);
    expect(fixture.tlsNames).toEqual([
      "smtp.fixture.invalid",
      "smtp.fixture.invalid",
    ]);
    expect(fixture.messages).toHaveLength(2);
    const received = fixture.messages[0];
    expect(received?.from).toBe(fixture.config.from);
    expect(received?.to).toEqual([mail.to]);
    const decoded = decodeMime(received?.bytes ?? Buffer.alloc(0));
    expect(decoded.subject).toBe(mail.subject);
    expect(decoded.text).toBe(mail.text);
    expect(decoded.headers).toContain(
      "Content-Type: text/plain; charset=utf-8",
    );
    expect(fixture.errors).toEqual([]);
  });

  it.each([
    "implicit",
    "starttls",
  ] as const)("%s refuses a certificate with an untrusted CA", async (mode) => {
    const fixture = await startSmtpFixture(mode);
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config);
    cleanup.push(() => sender.stop());
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    expect(fixture.authSecure).toEqual([]);
    expect(fixture.messages).toEqual([]);
  });

  it.each([
    "implicit",
    "starttls",
  ] as const)("%s validates the configured hostname before authentication", async (mode) => {
    const fixture = await startSmtpFixture(mode);
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(
      { ...fixture.config, serverName: "wrong.fixture.invalid" },
      { ca: fixture.ca },
    );
    cleanup.push(() => sender.stop());
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    expect(fixture.authSecure).toEqual([]);
    expect(fixture.messages).toEqual([]);
  });

  it("requires STARTTLS even when the peer does not advertise it", async () => {
    const fixture = await startSmtpFixture("starttls", {
      disableStartTls: true,
    });
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    expect(fixture.authSecure).toEqual([]);
    expect(fixture.messages).toEqual([]);
  });

  it.each([
    { rejectAuth: true },
    { rejectRecipient: true },
    { rejectData: true },
  ])("sanitizes SMTP rejection without retrying (%j)", async (behavior) => {
    const fixture = await startSmtpFixture("starttls", behavior);
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    expect(fixture.acceptedConnections).toBe(1);
    expect(fixture.messages).toHaveLength(behavior.rejectData ? 1 : 0);
  });

  it.each([
    "implicit",
    "starttls",
  ] as const)("%s does not resend when DATA is received but its acknowledgement is lost", async (mode) => {
    const fixture = await startSmtpFixture(mode, {
      loseAcknowledgement: true,
    });
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    expect(fixture.acceptedConnections).toBe(1);
    expect(fixture.messages).toHaveLength(1);
    expect(decodeMime(fixture.messages[0]?.bytes ?? Buffer.alloc(0)).text).toBe(
      mail.text,
    );
  });

  it.each([
    { stallAuth: true },
    { stallData: true },
  ])("bounds the entire transaction and closes native sockets (%j)", async (behavior) => {
    const fixture = await startSmtpFixture("implicit", behavior);
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, {
      ca: fixture.ca,
      deadlineMs: 1500,
    });
    cleanup.push(() => sender.stop());
    const started = performance.now();
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    expect(performance.now() - started).toBeLessThan(2000);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    expect(fixture.acceptedConnections).toBe(1);
    expect(fixture.authSecure).toEqual([true]);
    expect(fixture.messages).toHaveLength(behavior.stallData ? 1 : 0);
  });

  it("stop cancels an in-flight DATA and prevents any further connection", async () => {
    const fixture = await startSmtpFixture("starttls", { stallData: true });
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    const sending = expect(sender.send(mail)).rejects.toMatchObject(
      externalError,
    );
    await fixture.dataReceived;
    await sender.stop();
    await sending;
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(1));
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await sender.stop();
    expect(fixture.acceptedConnections).toBe(1);
  });

  it("stop before message composition settles never opens a connection", async () => {
    const fixture = await startSmtpFixture("implicit");
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    const sending = expect(sender.send(mail)).rejects.toMatchObject(
      externalError,
    );
    await sender.stop();
    await sending;
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(fixture.acceptedConnections).toBe(0);
  });

  it("stop waits for every concurrent delivery's native connection to close", async () => {
    const fixture = await startSmtpFixture("implicit", { stallAuth: true });
    cleanup.push(() => fixture.close());
    const sender = new NodeSmtpMailer(fixture.config, { ca: fixture.ca });
    cleanup.push(() => sender.stop());
    const sends = [
      expect(sender.send(mail)).rejects.toMatchObject(externalError),
      expect(sender.send(mail)).rejects.toMatchObject(externalError),
    ];
    await vi.waitFor(() => expect(fixture.authSecure).toEqual([true, true]));
    await sender.stop();
    await Promise.all(sends);
    await vi.waitFor(() => expect(fixture.closedConnections).toBe(2));
    expect(fixture.acceptedConnections).toBe(2);
  });

  it("closes a peer that never completes its TLS handshake within the deadline", async () => {
    const sockets = new Set<Socket>();
    let connections = 0;
    let closed = 0;
    const server = createServer((socket) => {
      connections++;
      sockets.add(socket);
      socket.on("error", () => {});
      socket.once("close", () => {
        closed++;
        sockets.delete(socket);
      });
      socket.resume();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    cleanup.push(
      () =>
        new Promise<void>((resolve, reject) => {
          for (const socket of sockets) socket.destroy();
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing port");
    const config: NodeSmtpConfig = {
      host: "127.0.0.1",
      port: address.port,
      tls: "implicit",
      serverName: "smtp.fixture.invalid",
      from: "sender@example.invalid",
      auth: { user: "synthetic-user", password: "synthetic-password" },
    };
    const sender = new NodeSmtpMailer(config, { deadlineMs: 500 });
    cleanup.push(() => sender.stop());
    await expect(sender.send(mail)).rejects.toMatchObject(externalError);
    await vi.waitFor(() => expect(closed).toBe(1));
    expect(connections).toBe(1);
  });
});
