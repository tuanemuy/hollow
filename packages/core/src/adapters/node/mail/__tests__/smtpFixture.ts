import { once } from "node:events";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import type { Socket } from "node:net";
import { isAbsolute, join } from "node:path";
import { createSecureContext } from "node:tls";
import { SMTPServer } from "smtp-server";
import type { Mail } from "../../../../application/ports/mailer";
import type { NodeSmtpConfig } from "../config";
import {
  certificate,
  certificateAuthority,
  privateKey,
} from "./syntheticCertificates";

export type SmtpFixtureBehavior = Readonly<{
  rejectAuth?: boolean;
  rejectRecipient?: boolean;
  rejectData?: boolean;
  loseAcknowledgement?: boolean;
  stallAuth?: boolean;
  stallData?: boolean;
  disableStartTls?: boolean;
}>;

export type ReceivedMail = Readonly<{
  bytes: Buffer;
  from: string | false;
  to: readonly string[];
}>;

export function decodeMime(bytes: Buffer) {
  const message = bytes.toString("utf8");
  const separator = message.indexOf("\r\n\r\n");
  const headers = message.slice(0, separator).replace(/\r\n[ \t]+/g, " ");
  const encodedSubject = /^Subject: (.+)$/im.exec(headers)?.[1] ?? "";
  return {
    headers,
    subject: encodedSubject
      .replace(/(\?=)\s+(=\?)/g, "$1$2")
      .replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_value, data: string) =>
        Buffer.from(data, "base64").toString("utf8"),
      ),
    text: Buffer.from(message.slice(separator + 4), "base64")
      .toString("utf8")
      .replace(/\r\n/g, "\n")
      .trimEnd(),
  };
}

export async function fixtureDirectory(): Promise<string> {
  const root = process.env.TMPDIR;
  if (!root || !isAbsolute(root))
    throw new Error(
      "SMTP contract tests require the setup-owned persistent TMPDIR",
    );
  return mkdtemp(join(root, "smtp-contract-"));
}

export async function startSmtpFixture(
  mode: NodeSmtpConfig["tls"],
  behavior: SmtpFixtureBehavior = {},
) {
  const directory = await fixtureDirectory();
  const keyPath = join(directory, "smtp.key");
  const certificatePath = join(directory, "smtp.pem");
  const caPath = join(directory, "ca.pem");
  await Promise.all([
    writeFile(keyPath, privateKey, { mode: 0o600, flag: "wx" }),
    writeFile(certificatePath, certificate, { mode: 0o600, flag: "wx" }),
    writeFile(caPath, certificateAuthority, { mode: 0o600, flag: "wx" }),
  ]);
  const [key, cert, ca] = await Promise.all([
    readFile(keyPath),
    readFile(certificatePath),
    readFile(caPath),
  ]);
  const sockets = new Set<Socket>();
  const rawByPort = new Map<number, Socket>();
  const tlsByRaw = new Map<Socket, Socket>();
  const closedRaw = new Set<Socket>();
  const closedTls = new Set<Socket>();
  const messages: ReceivedMail[] = [];
  const tlsNames: string[] = [];
  const authSecure: boolean[] = [];
  const errors: Error[] = [];
  let acceptedConnections = 0;
  let dataStarted: () => void = () => {};
  const dataReceived = new Promise<void>((resolve) => {
    dataStarted = resolve;
  });
  let authStarted: () => void = () => {};
  const authReceived = new Promise<void>((resolve) => {
    authStarted = resolve;
  });
  const server = new SMTPServer({
    name: "smtp.fixture.invalid",
    secure: mode === "implicit",
    key,
    cert,
    minVersion: "TLSv1.2",
    SNICallback(servername, callback) {
      tlsNames.push(servername);
      callback(null, createSecureContext({ key, cert }));
    },
    logger: false,
    disableReverseLookup: true,
    allowInsecureAuth: false,
    authOptional: false,
    disabledCommands: behavior.disableStartTls ? ["STARTTLS"] : [],
    socketTimeout: 10_000,
    closeTimeout: 100,
    onSecure(socket, session, callback) {
      const raw = rawByPort.get(session.remotePort);
      if (!raw) {
        callback(new Error("Missing native SMTP connection"));
        return;
      }
      tlsByRaw.set(raw, socket);
      sockets.add(socket);
      socket.once("close", () => {
        closedTls.add(raw);
        sockets.delete(socket);
      });
      callback();
    },
    onAuth(auth, session, callback) {
      authSecure.push(session.secure);
      authStarted();
      if (behavior.stallAuth) return;
      if (
        behavior.rejectAuth ||
        !session.secure ||
        auth.username !== "synthetic-user" ||
        auth.password !== "synthetic-password"
      ) {
        callback(new Error("synthetic authentication denied"));
        return;
      }
      callback(null, { user: "synthetic-user" });
    },
    onRcptTo(_address, _session, callback) {
      callback(
        behavior.rejectRecipient
          ? new Error("synthetic recipient denied")
          : undefined,
      );
    },
    onData(stream, session, callback) {
      dataStarted();
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", (error: Error) => errors.push(error));
      stream.once("end", () => {
        messages.push({
          bytes: Buffer.concat(chunks),
          from: session.envelope.mailFrom && session.envelope.mailFrom.address,
          to: session.envelope.rcptTo.map((address) => address.address),
        });
        if (behavior.loseAcknowledgement) {
          for (const socket of sockets)
            if (socket.remotePort === session.remotePort) socket.destroy();
          return;
        }
        if (behavior.stallData) return;
        callback(
          behavior.rejectData ? new Error("synthetic DATA denied") : undefined,
        );
      });
    },
  });
  server.on("error", (error) => errors.push(error));
  server.server.on("connection", (socket: Socket) => {
    acceptedConnections++;
    sockets.add(socket);
    if (socket.remotePort !== undefined)
      rawByPort.set(socket.remotePort, socket);
    socket.on("error", (error) => errors.push(error));
    // STARTTLS removes every raw-socket listener; native emission survives that removal.
    const emit = socket.emit.bind(socket);
    socket.emit = (event: string | symbol, ...args: unknown[]) => {
      if (event === "close") {
        closedRaw.add(socket);
        sockets.delete(socket);
      }
      return emit(event, ...args);
    };
  });
  const listening = once(server.server, "listening");
  server.listen(0, "127.0.0.1");
  await listening;
  const bound = server.server.address();
  if (!bound || typeof bound === "string") throw new Error("Missing SMTP port");
  const config: NodeSmtpConfig = {
    host: "127.0.0.1",
    port: bound.port,
    tls: mode,
    serverName: "smtp.fixture.invalid",
    from: "sender@example.invalid",
    auth: { user: "synthetic-user", password: "synthetic-password" },
  };
  return {
    directory,
    config,
    ca,
    messages,
    tlsNames,
    authSecure,
    errors,
    dataReceived,
    authReceived,
    capturedMail(): readonly Mail[] {
      return messages.map((message) => {
        const decoded = decodeMime(message.bytes);
        return {
          to: message.to[0] ?? "",
          subject: decoded.subject,
          text: decoded.text,
        };
      });
    },
    get acceptedConnections() {
      return acceptedConnections;
    },
    get closedConnections() {
      return [...closedRaw].filter(
        (raw) => !tlsByRaw.has(raw) || closedTls.has(raw),
      ).length;
    },
    get nativeRawClosedConnections() {
      return closedRaw.size;
    },
    get nativeTlsClosedConnections() {
      return closedTls.size;
    },
    async close() {
      const closed = once(server.server, "close");
      server.close();
      for (const socket of sockets) socket.destroy();
      await closed;
    },
  };
}
