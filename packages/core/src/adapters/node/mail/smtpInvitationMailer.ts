import { SystemError, SystemErrorCode } from "../../../application/errors";
import type { InvitationMailer } from "../../../application/ports/invitationMailer";
import type { Mail } from "../../../application/ports/mailer";
import type { NodeSmtpConfig } from "./config";
import { NodeSmtpMailer, type NodeSmtpMailerOptions } from "./smtpMailer";

const failed = () =>
  new SystemError(
    SystemErrorCode.ExternalApiError,
    "招待メールを送信できませんでした。",
  );

type OwnedDelivery = Readonly<{
  cancel: () => void;
  done: Promise<void>;
}>;

/** Owns a separate SMTP sender for each abortable invitation delivery. */
export class NodeSmtpInvitationMailer implements InvitationMailer {
  private readonly active = new Set<OwnedDelivery>();
  private stopped = false;
  private closureUnknown = false;

  constructor(
    private readonly config: NodeSmtpConfig,
    private readonly options: NodeSmtpMailerOptions = {},
  ) {}

  async send(id: string, mail: Mail, signal: AbortSignal): Promise<void> {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Invalid invitation delivery ID",
      );
    if (this.stopped || this.closureUnknown || signal.aborted) throw failed();
    const sender = new NodeSmtpMailer(this.config, this.options);
    let cancellation: Promise<void> | undefined;
    const cancel = () => {
      cancellation ??= sender.stop();
      void cancellation.catch(() => {});
    };
    let finish: () => void = () => {};
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const owned = { cancel, done };
    this.active.add(owned);
    signal.addEventListener("abort", cancel, { once: true });
    let delivered = false;
    let nativeClosed = false;
    try {
      if (signal.aborted) throw failed();
      await sender.send(mail);
      delivered = !signal.aborted;
    } catch {
      delivered = false;
    } finally {
      signal.removeEventListener("abort", cancel);
      try {
        await (cancellation ?? sender.stop());
        nativeClosed = true;
      } catch {
        this.closureUnknown = true;
      } finally {
        this.active.delete(owned);
        finish();
      }
    }
    if (!delivered || !nativeClosed) throw failed();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    const active = [...this.active];
    for (const delivery of active) delivery.cancel();
    await Promise.all(active.map((delivery) => delivery.done));
    if (this.closureUnknown) throw failed();
  }
}
