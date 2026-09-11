import { parentPort, workerData } from "node:worker_threads";
import { createClient } from "@libsql/client";

const client = createClient({ url: workerData.databaseUrl });
const transaction = await client.transaction("read");
try {
  await transaction.execute("PRAGMA query_only=ON");
  await transaction.execute(
    "WITH RECURSIVE n(x) AS (VALUES(0) UNION ALL SELECT x+1 FROM n WHERE x<1000000000) SELECT sum(x) FROM n",
  );
} finally {
  transaction.close();
  client.close();
  parentPort.close();
}
