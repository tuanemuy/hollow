import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type Client, createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLibsqlClient } from "./client";
import { serializeLocalClient } from "./serializedClient";

describe("local client resource serialization", () => {
  let client: Client;
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "hollow-client-test-"));
    client = createLibsqlClient({ url: `file:${directory}/test.db` });
    await client.execute("CREATE TABLE item (id INTEGER PRIMARY KEY)");
  });
  afterEach(async () => {
    client.close();
    await rm(directory, { recursive: true, force: true });
  });
  it("holds standalone RETURNING writes until an interactive transaction commits", async () => {
    const tx = await client.transaction();
    await tx.execute("INSERT INTO item VALUES (1)");
    let settled = false;
    const outside = client
      .execute("INSERT INTO item VALUES (2) RETURNING id")
      .then((result) => {
        settled = true;
        return result;
      });
    await Promise.resolve();
    expect(settled).toBe(false);
    await tx.commit();
    expect((await outside).rows[0]?.id).toBe(2);
    const next = await client.transaction();
    tx.close();
    await next.execute("INSERT INTO item VALUES (3)");
    await next.commit();
    expect(
      (await client.execute("SELECT count(*) AS n FROM item")).rows[0]?.n,
    ).toBe(3);
  });
  it("does not release a failed commit until rollback and never repeats the callback", async () => {
    client.close();
    const raw = createClient({ url: `file:${directory}/test.db` });
    const begin = raw.transaction.bind(raw);
    vi.spyOn(raw, "transaction").mockImplementation(async () => {
      const transaction = await begin();
      vi.spyOn(transaction, "commit").mockRejectedValueOnce(
        new Error("injected commit failure"),
      );
      return transaction;
    });
    client = serializeLocalClient(raw);
    const tx = await client.transaction();
    await tx.execute("INSERT INTO item VALUES (999)");
    let outsideFinished = false;
    const outside = client.execute("INSERT INTO item VALUES (4)").then(() => {
      outsideFinished = true;
    });
    await expect(tx.commit()).rejects.toThrow("injected commit failure");
    expect(outsideFinished).toBe(false);
    await tx.rollback();
    await outside;
    expect(
      (await client.execute("SELECT count(*) AS n FROM item WHERE id=999"))
        .rows[0]?.n,
    ).toBe(0);
  });
  it("interleaves outbox-style returning statements and transactions without native busy failures", async () => {
    await Promise.all(
      Array.from({ length: 60 }, async (_, index) => {
        if (index % 2) {
          await client.execute({
            sql: "INSERT INTO item VALUES (?) RETURNING id",
            args: [index],
          });
        } else {
          const tx = await client.transaction();
          try {
            await tx.execute({
              sql: "INSERT INTO item VALUES (?)",
              args: [index],
            });
            await Promise.resolve();
            await tx.commit();
          } finally {
            tx.close();
          }
        }
      }),
    );
    expect(
      (await client.execute("SELECT count(*) AS n FROM item")).rows[0]?.n,
    ).toBe(60);
  });
});
