import { existsSync } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import { LibsqlBrowseReadSnapshot } from "@repo/core/adapters/libsql/browseReadSnapshot";
import { TemporalCivilDate } from "@repo/core/adapters/node/browse/civilDate";
import {
  assertTagNormalizerUnicodeVersion,
  NodeTagNormalizer,
} from "@repo/core/adapters/node/browse/tagNormalizer";
import { browseRequestSchema } from "@repo/core/adapters/node/browse/wire";
import { SystemClock } from "@repo/core/application/ports/clock";
import { isSerializableError } from "@repo/core/lib/error";
import { z } from "zod";

async function run() {
  const input = z
    .object({ request: browseRequestSchema, databaseUrl: z.string().max(4096) })
    .parse(workerData);
  if (
    !input.databaseUrl.startsWith("file:") ||
    !existsSync(input.databaseUrl.slice(5))
  )
    throw Error();
  assertTagNormalizerUnicodeVersion(process.versions.unicode);
  const snapshot = new LibsqlBrowseReadSnapshot(
    input.databaseUrl,
    SystemClock,
    TemporalCivilDate,
    NodeTagNormalizer,
  );
  return snapshot.read(input.request);
}
run()
  .then(
    (value) => parentPort?.postMessage({ kind: "result", value }),
    (error) => {
      const serialized = isSerializableError(error)
        ? error.toSerialized()
        : {
            kind: "system",
            code: "DATABASE_ERROR",
            message: "一覧を読み取れませんでした。",
          };
      parentPort?.postMessage({ kind: "failure", error: serialized });
    },
  )
  .finally(() => parentPort?.close());
