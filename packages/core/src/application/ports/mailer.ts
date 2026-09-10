export type Mail = Readonly<{ to: string; subject: string; text: string }>;
export interface Mailer {
  send(mail: Mail): Promise<void>;
}
