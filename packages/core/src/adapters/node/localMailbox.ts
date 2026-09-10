import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { Mail, Mailer } from "@repo/core/application/ports/mailer";

export class LocalMailbox implements Mailer {
  constructor(private readonly directory: string) {}
  async send(mail: Mail): Promise<void> {
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await writeFile(
        path.join(this.directory, `${randomUUID()}.json`),
        JSON.stringify(mail, null, 2),
        { mode: 0o600, flag: "wx" },
      );
    } catch (cause) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "ローカルメールを保存できませんでした。",
        cause,
      );
    }
  }
}
