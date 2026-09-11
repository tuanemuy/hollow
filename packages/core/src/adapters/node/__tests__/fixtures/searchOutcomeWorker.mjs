import { parentPort, workerData } from "node:worker_threads";
import { createClient } from "@libsql/client";

const reply = () =>
  parentPort.postMessage({
    kind: "result",
    value: { kind: "tags", items: [], nextCursor: null },
  });
const mode = workerData.request.tagQuery;
if (mode === "exit") process.exit(7);
if (mode === "error") throw Error("synthetic worker error");
if (mode === "invalid") {
  parentPort.postMessage({
    kind: "diagnostic",
    stage: "unknown",
    remainingMs: 1,
  });
} else if (mode === "busy" || mode === "late" || mode === "readonly") {
  const client = createClient({ url: workerData.databaseUrl });
  const tx = await client.transaction("read");
  try {
    await tx.execute("PRAGMA query_only=ON");
    if (mode === "readonly") {
      let refused = false;
      try {
        await tx.execute("INSERT INTO accounts DEFAULT VALUES");
      } catch (error) {
        refused = error.code === "SQLITE_READONLY";
      }
      if (!refused) process.exit(8);
      reply();
    } else {
      if (mode === "late") reply();
      await tx.execute(
        "WITH RECURSIVE n(x) AS (VALUES(0) UNION ALL SELECT x+1 FROM n WHERE x<1000000000) SELECT sum(x) FROM n",
      );
    }
  } finally {
    try {
      tx.close();
    } finally {
      client.close();
    }
  }
} else if (mode === "wait") {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  reply();
} else reply();
parentPort.close();
