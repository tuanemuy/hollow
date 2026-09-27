import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import type { GoogleAuthentication } from "@repo/core/application/account/ports";
import type { Clock } from "@repo/core/application/ports/clock";
import type { TokenGenerator } from "@repo/core/application/ports/tokenGenerator";
import { z } from "zod";
import { NodeAuthenticationExecution } from "../authenticationExecution";
import { NodeGoogleOidc } from "./googleOidc";
import { NodeAuthenticationSecretProtector } from "./secretProtector";

const configuration = z
  .object({
    clientId: z.string().min(1).max(1024),
    clientSecret: z.string().min(1).max(4096),
    pkceKeyFile: z.string().min(1).max(4096),
  })
  .strict();

export async function readNodeGoogleAuthentication(
  file: string | undefined,
  appUrl: string,
  deps: Readonly<{ clock: Clock; tokens: TokenGenerator }>,
): Promise<GoogleAuthentication | undefined> {
  if (!file || !isAbsolute(file)) return undefined;
  try {
    const parent = await lstat(dirname(file));
    if (
      !parent.isDirectory() ||
      parent.isSymbolicLink() ||
      parent.uid !== process.getuid?.() ||
      (parent.mode & 0o777) !== 0o700
    )
      return undefined;
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    let value: z.infer<typeof configuration>;
    try {
      const before = await handle.stat();
      if (
        !before.isFile() ||
        before.uid !== process.getuid?.() ||
        (before.mode & 0o777) !== 0o600 ||
        before.size > 16 * 1024
      )
        return undefined;
      const buffer = Buffer.alloc(16 * 1024 + 1);
      try {
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const after = await handle.stat();
        if (
          bytesRead !== before.size ||
          bytesRead > 16 * 1024 ||
          before.size !== after.size ||
          before.mtimeMs !== after.mtimeMs
        )
          return undefined;
        value = configuration.parse(
          JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(
              buffer.subarray(0, bytesRead),
            ),
          ),
        );
      } finally {
        buffer.fill(0);
      }
    } finally {
      await handle.close();
    }
    const protector = await NodeAuthenticationSecretProtector.load(
      value.pkceKeyFile,
    );
    if (!protector.available()) return undefined;
    return {
      protector,
      execution: new NodeAuthenticationExecution(),
      provider: new NodeGoogleOidc(
        {
          clientId: value.clientId,
          clientSecret: value.clientSecret,
          redirectUri: new URL("/auth/google/callback", appUrl).href,
        },
        deps,
      ),
    };
  } catch {
    return undefined;
  }
}
