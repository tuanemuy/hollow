import { Socket } from "node:net";
import { performance } from "node:perf_hooks";
import { type ConnectionOptions, connect as connectTls } from "node:tls";
import MailComposer from "nodemailer/lib/mail-composer";
import SMTPConnection from "nodemailer/lib/smtp-connection";
import { SystemError, SystemErrorCode } from "../../../application/errors";
import type { Mail, Mailer } from "../../../application/ports/mailer";
import type { NodeSmtpConfig } from "./config";

export type NodeSmtpMailerOptions = Readonly<{
  deadlineMs?: number;
  ca?: ConnectionOptions["ca"];
}>;

const failed = () =>
  new SystemError(
    SystemErrorCode.ExternalApiError,
    "メールを送信できませんでした。",
  );

type ActiveSend = Readonly<{
  abort: () => void;
  done: Promise<void>;
}>;

/** Each delivery owns one connection and waits for native socket closure. */
export class NodeSmtpMailer implements Mailer {
  private readonly deadlineMs: number;
  private readonly active = new Set<ActiveSend>();
  private stopped = false;
  private closureUnknown = false;

  constructor(
    private readonly config: NodeSmtpConfig,
    private readonly options: NodeSmtpMailerOptions = {},
  ) {
    this.deadlineMs = options.deadlineMs ?? 30_000;
    if (
      !Number.isInteger(this.deadlineMs) ||
      this.deadlineMs < 100 ||
      this.deadlineMs > 120_000
    )
      throw failed();
  }

  async send(mail: Mail): Promise<void> {
    if (this.stopped || this.closureUnknown) throw failed();
    const started = performance.now();
    const reserve = Math.min(1000, Math.floor(this.deadlineMs / 5));
    const socket = new Socket();
    let connection: SMTPConnection | undefined;
    const sockets = new Map<Socket, Promise<void>>();
    const track = (value: Socket) => {
      if (sockets.has(value)) return;
      sockets.set(
        value,
        value.closed
          ? Promise.resolve()
          : new Promise<void>((resolve) =>
              value.once("close", () => resolve()),
            ),
      );
    };
    track(socket);
    let rejectFailure: (error: SystemError) => void = () => {};
    const failure = new Promise<never>((_resolve, reject) => {
      rejectFailure = reject;
    });
    let cancelled = false;
    const abort = () => {
      cancelled = true;
      rejectFailure(failed());
      if (connection?._socket) track(connection._socket);
      for (const value of sockets.keys()) value.destroy();
    };
    socket.on("error", abort);
    let finish: () => void = () => {};
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const active = { abort, done };
    this.active.add(active);
    const timer = setTimeout(abort, this.deadlineMs - reserve);
    const step = <T>(operation: Promise<T>) =>
      Promise.race([operation, failure]);
    let delivered = false;
    let nativeClosed = false;
    try {
      const message = await step(
        new Promise<Buffer>((resolve, reject) => {
          new MailComposer({
            from: this.config.from,
            to: mail.to,
            subject: mail.subject,
            text: mail.text,
            encoding: "base64",
            textEncoding: "base64",
            newline: "win",
            disableFileAccess: true,
            disableUrlAccess: true,
          })
            .compile()
            .build((error, value) => {
              if (error || !value) reject(failed());
              else resolve(value);
            });
        }),
      );
      if (cancelled) throw failed();
      await step(
        new Promise<void>((resolve) => {
          socket.connect(
            {
              host: this.config.host,
              port: this.config.port,
              autoSelectFamily: false,
            },
            resolve,
          );
        }),
      );
      if (cancelled) throw failed();
      const tlsOptions: ConnectionOptions = {
        rejectUnauthorized: true,
        servername: this.config.serverName,
        minVersion: "TLSv1.2",
        ...(this.options.ca === undefined ? {} : { ca: this.options.ca }),
      };
      let transport: Socket = socket;
      if (this.config.tls === "implicit") {
        const secure = connectTls({ ...tlsOptions, socket });
        track(secure);
        secure.on("error", abort);
        await step(
          new Promise<void>((resolve) => secure.once("secureConnect", resolve)),
        );
        if (cancelled) throw failed();
        transport = secure;
      }
      connection = new SMTPConnection({
        host: this.config.host,
        port: this.config.port,
        connection: transport,
        secure: this.config.tls === "implicit",
        secured: this.config.tls === "implicit",
        requireTLS: this.config.tls === "starttls",
        opportunisticTLS: false,
        ignoreTLS: false,
        servername: this.config.serverName,
        tls: tlsOptions,
        name: "localhost",
        connectionTimeout: this.deadlineMs - reserve,
        greetingTimeout: this.deadlineMs - reserve,
        socketTimeout: this.deadlineMs - reserve,
        logger: false,
        debug: false,
        transactionLog: false,
      });
      connection.on("error", abort);
      connection.on("end", () => rejectFailure(failed()));
      const smtp = connection;
      await step(
        new Promise<void>((resolve, reject) => {
          smtp.connect((error) => {
            if (error) reject(failed());
            else resolve();
          });
        }),
      );
      if (cancelled) throw failed();
      if (smtp._socket) track(smtp._socket);
      if (!smtp.secure) throw failed();
      await step(
        new Promise<void>((resolve, reject) => {
          smtp.login(
            { user: this.config.auth.user, pass: this.config.auth.password },
            (error) => {
              if (error) reject(failed());
              else resolve();
            },
          );
        }),
      );
      if (cancelled) throw failed();
      await step(
        new Promise<void>((resolve, reject) => {
          smtp.send(
            { from: this.config.from, to: [mail.to] },
            message,
            (error, info) => {
              if (error || !info || info.accepted.length !== 1)
                reject(failed());
              else resolve();
            },
          );
        }),
      );
      delivered = true;
    } catch {
      delivered = false;
    } finally {
      clearTimeout(timer);
      if (connection?._socket) track(connection._socket);
      let closeTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        connection?.close();
        for (const value of sockets.keys()) value.destroy();
        await Promise.race([
          Promise.all(sockets.values()),
          new Promise<never>((_resolve, reject) => {
            closeTimer = setTimeout(
              () => reject(failed()),
              Math.max(1, this.deadlineMs - (performance.now() - started)),
            );
          }),
        ]);
        nativeClosed = true;
      } catch {
        this.closureUnknown = true;
      } finally {
        for (const value of sockets.keys()) value.destroy();
        clearTimeout(closeTimer);
        this.active.delete(active);
        finish();
      }
    }
    if (!delivered || !nativeClosed) throw failed();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    const active = [...this.active];
    for (const send of active) send.abort();
    await Promise.all(active.map((send) => send.done));
    if (this.closureUnknown) throw failed();
  }
}
