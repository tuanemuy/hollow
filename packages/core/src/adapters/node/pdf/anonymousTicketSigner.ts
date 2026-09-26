import { createHmac, timingSafeEqual } from "node:crypto";
import { constants, type Stats } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";
import type {
  PdfAnonymousTicketClaims,
  PdfAnonymousTicketSigner,
} from "@repo/core/application/pdf/anonymousPorts";
import { BusinessRuleError } from "@repo/core/domain/error";
import { PDF_ANONYMOUS_TICKET_LIFETIME_MS } from "@repo/core/domain/pdf/anonymous";
import { z } from "zod";

const keyId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/);
const filePath = z
  .string()
  .min(1)
  .refine((value) => !/[\0\r\n]/.test(value));
const configuration = z.strictObject({
  activeKeyId: keyId,
  keys: z
    .array(z.strictObject({ id: keyId, path: filePath }))
    .min(1)
    .max(16),
});
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.number().int().nonnegative().safe();
const claimsSchema = z
  .strictObject({
    v: z.literal(1),
    purpose: z.literal("hollow-anonymous-pdf-v1"),
    kid: keyId,
    requestId: z.uuid(),
    ticketGeneration: z.number().int().positive().safe(),
    issuedAt: timestamp,
    expiresAt: timestamp,
    browserHash: digest,
    authorityDigest: digest,
  })
  .refine(
    (claims) =>
      claims.expiresAt - claims.issuedAt === PDF_ANONYMOUS_TICKET_LIFETIME_MS,
  );

function canonical(claims: PdfAnonymousTicketClaims) {
  return JSON.stringify({
    v: claims.v,
    purpose: claims.purpose,
    kid: claims.kid,
    requestId: claims.requestId,
    ticketGeneration: claims.ticketGeneration,
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
    browserHash: claims.browserHash,
    authorityDigest: claims.authorityDigest,
  });
}

const unavailable = () =>
  new BusinessRuleError(
    "PDF_NOT_CONFIGURED",
    "匿名PDFの署名設定を利用できません。",
  );
const invalidClaims = () =>
  new BusinessRuleError(
    "PDF_TICKET_INVALID",
    "匿名PDFの取得情報を確認できません。",
  );
const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino;
const privateMode = (info: Stats, mode: number, uid: number) =>
  info.uid === uid && (info.mode & 0o7777) === mode;

async function readPrivateFile(file: string, maximum: number, uid: number) {
  const parentPath = path.dirname(file);
  const parent = await open(
    parentPath,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  try {
    const directory = await parent.stat();
    if (
      !directory.isDirectory() ||
      !privateMode(directory, 0o700, uid) ||
      !sameFile(directory, await lstat(parentPath))
    )
      throw unavailable();
    const handle = await open(
      file,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const before = await handle.stat();
      if (
        !before.isFile() ||
        !privateMode(before, 0o600, uid) ||
        before.size > maximum ||
        !sameFile(before, await lstat(file))
      )
        throw unavailable();
      const bytes = Buffer.alloc(maximum + 1);
      let offset = 0;
      while (offset < bytes.length) {
        const read = await handle.read(
          bytes,
          offset,
          bytes.length - offset,
          offset,
        );
        if (!read.bytesRead) break;
        offset += read.bytesRead;
      }
      const after = await handle.stat();
      const currentParent = await lstat(parentPath);
      if (
        offset > maximum ||
        offset !== before.size ||
        after.size !== before.size ||
        after.mtimeMs !== before.mtimeMs ||
        after.ctimeMs !== before.ctimeMs ||
        !privateMode(after, 0o600, uid) ||
        !sameFile(before, await lstat(file)) ||
        !sameFile(directory, currentParent) ||
        !privateMode(currentParent, 0o700, uid)
      )
        throw unavailable();
      return bytes.subarray(0, offset);
    } finally {
      await handle.close();
    }
  } finally {
    await parent.close();
  }
}

export class NodePdfAnonymousTicketSigner implements PdfAnonymousTicketSigner {
  private constructor(
    private readonly active: string | null,
    private readonly keys: ReadonlyMap<string, Buffer>,
  ) {}

  static async load(
    fileName: string | undefined,
  ): Promise<NodePdfAnonymousTicketSigner> {
    try {
      const uid = process.getuid?.();
      if (
        !fileName ||
        uid === undefined ||
        !filePath.safeParse(fileName).success
      )
        return new NodePdfAnonymousTicketSigner(null, new Map());
      const file = path.resolve(fileName);
      const bytes = await readPrivateFile(file, 16 * 1024, uid);
      const config = configuration.parse(
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      );
      const ids = new Set(config.keys.map((key) => key.id));
      if (ids.size !== config.keys.length || !ids.has(config.activeKeyId))
        throw unavailable();
      const keys = new Map<string, Buffer>();
      for (const key of config.keys) {
        const value = await readPrivateFile(
          path.resolve(path.dirname(file), key.path),
          32,
          uid,
        );
        if (value.length !== 32) throw unavailable();
        keys.set(key.id, value);
      }
      return new NodePdfAnonymousTicketSigner(config.activeKeyId, keys);
    } catch {
      return new NodePdfAnonymousTicketSigner(null, new Map());
    }
  }

  activeKeyId(): string | null {
    return this.active;
  }

  sign(input: PdfAnonymousTicketClaims): string {
    if (this.active === null) throw unavailable();
    const parsed = claimsSchema.safeParse(input);
    if (!parsed.success) throw invalidClaims();
    const key = this.keys.get(parsed.data.kid);
    if (!key) throw invalidClaims();
    const json = Buffer.from(canonical(parsed.data), "utf8");
    if (json.length > 1024) throw invalidClaims();
    const message = `v1.${json.toString("base64url")}`;
    return `${message}.${createHmac("sha256", key).update(message).digest("base64url")}`;
  }

  verify(ticket: string): PdfAnonymousTicketClaims | null {
    if (
      this.active === null ||
      typeof ticket !== "string" ||
      ticket.length > 1413
    )
      return null;
    const parts = /^v1\.([A-Za-z0-9_-]{1,1366})\.([A-Za-z0-9_-]{43})$/.exec(
      ticket,
    );
    if (!parts) return null;
    try {
      const payload = parts[1];
      const signature = parts[2];
      if (!payload || !signature) return null;
      const bytes = Buffer.from(payload, "base64url");
      if (bytes.length > 1024 || bytes.toString("base64url") !== payload)
        return null;
      const parsed = claimsSchema.safeParse(
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      );
      if (
        !parsed.success ||
        Buffer.from(canonical(parsed.data)).toString("base64url") !== payload
      )
        return null;
      const key = this.keys.get(parsed.data.kid);
      if (!key) return null;
      const mac = Buffer.from(signature, "base64url");
      if (mac.length !== 32 || mac.toString("base64url") !== signature)
        return null;
      const expected = createHmac("sha256", key)
        .update(`v1.${payload}`)
        .digest();
      return timingSafeEqual(expected, mac) ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
