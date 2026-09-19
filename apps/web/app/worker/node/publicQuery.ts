import { existsSync } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import { LibsqlPublicDiscoverySnapshot } from "@repo/core/adapters/libsql/publicDiscoverySnapshot";
import { assertTagNormalizerUnicodeVersion } from "@repo/core/adapters/node/browse/tagNormalizer";
import { publicRequestSchema } from "@repo/core/adapters/node/publication/wire";
import { isSerializableError } from "@repo/core/lib/error";
import { z } from "zod";

async function run() {
  const input = z
    .object({
      request: publicRequestSchema,
      databaseUrl: z.string().max(4096),
      workerPath: z.string().max(4096),
    })
    .strict()
    .parse(workerData);
  if (
    !input.databaseUrl.startsWith("file:") ||
    !existsSync(input.databaseUrl.slice(5))
  )
    throw Error();
  assertTagNormalizerUnicodeVersion(process.versions.unicode);
  return new LibsqlPublicDiscoverySnapshot(input.databaseUrl).read(
    input.request,
  );
}
run()
  .then(
    (value) => parentPort?.postMessage({ kind: "result", value }),
    (error) =>
      parentPort?.postMessage({
        kind: "failure",
        error: isSerializableError(error)
          ? error.toSerialized()
          : {
              kind: "system",
              code: "PUBLIC_SEARCH_BUSY",
              message: "公開一覧を読み取れませんでした。再試行してください。",
            },
      }),
  )
  .finally(() => parentPort?.close());
