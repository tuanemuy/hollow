import type { Mail } from "./mailer";
export interface InvitationMailer {
  send(id: string, mail: Mail, signal: AbortSignal): Promise<void>;
}
