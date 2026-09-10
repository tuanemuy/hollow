import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type { InvitationMailer } from "@repo/core/application/ports/invitationMailer";
import type { Mail } from "@repo/core/application/ports/mailer";
import { BusinessRuleError } from "@repo/core/domain/error";
export class LocalInvitationMailer implements InvitationMailer {
  constructor(private readonly directory: string | undefined) {}
  async send(id: string, mail: Mail, signal: AbortSignal) {
    if (!this.directory)
      throw new BusinessRuleError(
        "INVITATION_DELIVERY_CONFIGURATION",
        "招待メール配送が未設定です。",
      );
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
      throw new SystemError(
        SystemErrorCode.DataIntegrityError,
        "Invalid delivery ID",
      );
    signal.throwIfAborted();
    const target = join(this.directory, `invitation-${id}.json`);
    const temporary = join(this.directory, `.invitation-${randomUUID()}.tmp`);
    const payload = JSON.stringify(mail, null, 2);
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await writeFile(temporary, payload, { flag: "wx", mode: 0o600, signal });
      signal.throwIfAborted();
      try {
        await link(temporary, target);
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            error.code === "EEXIST"
          )
        )
          throw error;
        if ((await readFile(target, { encoding: "utf8", signal })) !== payload)
          throw new SystemError(
            SystemErrorCode.DataIntegrityError,
            "Delivery ID payload mismatch",
          );
      }
    } catch (cause) {
      if (cause instanceof SystemError) throw cause;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "ローカル招待メールを保存できませんでした。",
        cause,
      );
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }
}
