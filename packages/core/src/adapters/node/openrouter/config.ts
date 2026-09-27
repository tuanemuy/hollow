import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import type { OpenRouterServices } from "@repo/core/application/integration/openRouter/ports";
import type { LlmModelProfiles } from "@repo/core/application/llm/ports";
import type { Clock } from "@repo/core/application/ports/clock";
import { z } from "zod";
import { NodeOpenRouterExecution } from "./execution";
import { NodeOpenRouterProvider } from "./provider";
import { NodeOpenRouterSecretProtector } from "./secretProtector";

const configuration = z
  .object({ keyFile: z.string().min(1).max(4096) })
  .strict();
export async function readNodeOpenRouter(
  file: string | undefined,
  appUrl: string,
  clock: Clock,
): Promise<
  (OpenRouterServices & Readonly<{ profiles: LlmModelProfiles }>) | undefined
> {
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
    const protector = await NodeOpenRouterSecretProtector.load(value.keyFile);
    if (!protector.available()) return undefined;
    const provider = new NodeOpenRouterProvider(appUrl, clock);
    return {
      protector,
      authorization: provider,
      catalog: provider,
      profiles: provider,
      execution: new NodeOpenRouterExecution(),
    };
  } catch {
    return undefined;
  }
}
