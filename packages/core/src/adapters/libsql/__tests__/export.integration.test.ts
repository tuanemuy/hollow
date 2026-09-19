import { signUp } from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import type { ExportOperation } from "@repo/core/application/export/ports";
import { saveNote } from "@repo/core/application/note/saveNote";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibsqlClient, getDatabase } from "../client";
import { createTestContainer, type TestContainer } from "./helpers";

describe("export operation ownership", () => {
  let base: TestContainer;
  let c: HollowContainer;
  let noteId: string;
  let accountId: string;
  const now = new Date("2026-09-19T13:00:00Z");
  beforeEach(async () => {
    base = await createTestContainer();
    const mails: string[] = [];
    c = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(m) {
          mails.push(m.text);
        },
      }),
      clock: { now: () => now },
    };
    const pending = await signUp(c, {
      email: "export@example.test",
      password: "test-password-1234",
      termsAccepted: true,
    });
    const link = mails.at(-1)?.match(/http[^\s]+/)?.[0];
    if (!link) throw Error("fixture mail");
    const auth = await verifyEmail(
      c,
      new URL(link).searchParams.get("token") ?? "",
      pending.browserToken,
    );
    if (!auth) throw Error("fixture session");
    accountId = auth.user.id;
    noteId = (
      await saveNote(c, auth.token, { title: "export", html: "<p>current</p>" })
    ).note.id;
  });
  afterEach(() => base.close());
  function op(id = c.idGenerator.next(), bytes = 10): ExportOperation {
    return {
      id,
      noteId,
      authority: { kind: "account", accountId, sessionHash: "fixture" },
      format: "html",
      sourceIdentity: "fixture-source",
      key: `exports/${id}`,
      reservedBytes: bytes,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 120000),
      generation: 1,
      nextCleanupAt: now,
      cleanupToken: null,
      cleanupUntil: null,
      state: "preparing",
      file: null,
    };
  }
  it("counts ready waiting and sending slots, rejects a second reader", async () => {
    const a = op();
    const b = op();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.exports.begin(a, 100);
      await u.exports.begin(b, 100);
      expect(
        await u.exports.ready(
          a.id,
          {
            filename: "a.html",
            mime: "text/html",
            bytes: 10,
            sha256: "hash",
            externalIdentity: "external",
          },
          now,
        ),
      ).toBe(true);
      expect(await u.exports.claimSend(a.id, now)).toBe(true);
      expect(await u.exports.claimSend(a.id, now)).toBe(false);
    });
    await expect(
      c.unitOfWorkProvider.run((u) => u.exports.begin(op(), 100)),
    ).rejects.toMatchObject({ code: "EXPORT_BUSY" });
  });
  it("keeps cleanup disk reserved until actual physical delete evidence", async () => {
    const a = op(undefined, 90);
    await c.unitOfWorkProvider.run(async (u) => {
      await u.exports.begin(a, 100);
      await u.exports.retire(a.id, now);
    });
    await expect(
      c.unitOfWorkProvider.run((u) => u.exports.begin(op(undefined, 11), 100)),
    ).rejects.toMatchObject({ code: "EXPORT_DISK_BUSY" });
    await expect(
      c.unitOfWorkProvider.run((u) => u.exports.begin(op(undefined, 101), 100)),
    ).rejects.toMatchObject({ code: "EXPORT_DISK_CONFIGURATION" });
    await c.unitOfWorkProvider.run(async (u) => {
      expect(
        (
          await u.exports.claimCleanup(
            now,
            "claim-a",
            new Date(now.getTime() + 1000),
          )
        )?.id,
      ).toBe(a.id);
      expect(await u.exports.finishCleanup(a.id, "claim-a", "delete")).toBe(
        false,
      );
      expect(
        await u.objectOperations.claimDelete(
          a.key,
          "delete",
          null,
          now,
          new Date(now.getTime() + 1000),
        ),
      ).toBe(true);
      await u.objectOperations.finishDelete(a.key, "delete");
      expect(await u.exports.finishCleanup(a.id, "old", "delete")).toBe(false);
      expect(await u.exports.finishCleanup(a.id, "claim-a", "delete")).toBe(
        true,
      );
    });
  });
  it("keeps active writer fenced by current lifecycle but not note ownership generation", async () => {
    const a = op();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.exports.begin(a, 100);
      await u.objectOperations.beginWrite(
        "writer",
        "runtime",
        { kind: "export-operation", id: a.id },
        now,
      );
      await u.objectOperations.registerKey("writer", a.key);
    });
    await base.db.run(
      sql`update notes set ownership_generation=ownership_generation+1 where id=${noteId}`,
    );
    await c.unitOfWorkProvider.run(async (u) => {
      expect(await u.objectOperations.canPublish("writer")).toBe(true);
      await u.exports.retire(a.id, now);
      expect(
        await u.exports.claimCleanup(
          now,
          "claim",
          new Date(now.getTime() + 1000),
        ),
      ).toBeNull();
      expect(await u.objectOperations.canPublish("writer")).toBe(false);
      await u.objectOperations.endWrite("writer");
      expect(
        (
          await u.exports.claimCleanup(
            now,
            "claim",
            new Date(now.getTime() + 1000),
          )
        )?.id,
      ).toBe(a.id);
    });
  });
  it("has fixed browser and global rate windows independent of share generations", async () => {
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 6; i++)
        expect(
          await u.exports.reserveDownload(
            noteId,
            "browser",
            new Date(now.getTime() + i),
          ),
        ).toBeNull();
      expect(
        await u.exports.reserveDownload(
          noteId,
          "browser",
          new Date(now.getTime() + 30000),
        ),
      ).toEqual(new Date(now.getTime() + 60000));
      expect(
        await u.exports.reserveDownload(
          noteId,
          "browser",
          new Date(now.getTime() + 59000),
        ),
      ).toEqual(new Date(now.getTime() + 60000));
      for (let i = 0; i < 24; i++)
        expect(
          await u.exports.reserveDownload(noteId, `browser-${i}`, now),
        ).toBeNull();
      expect(await u.exports.reserveDownload(noteId, "new", now)).toEqual(
        new Date(now.getTime() + 60000),
      );
      expect(
        await u.exports.reserveDownload(
          noteId,
          "browser",
          new Date(now.getTime() + 60000),
        ),
      ).toBeNull();
    });
  });
  it("serializes concurrent reservations and does not reset them on link reissue", async () => {
    await base.db.run(
      sql`update note_sharing set link_generation=1,token_hash='fixture-first',token_envelope='fixture-first',version=version+1 where note_id=${noteId}`,
    );
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () =>
        c.unitOfWorkProvider.run((u) =>
          u.exports.reserveDownload(noteId, "parallel-browser", now),
        ),
      ),
    );
    expect(reservations.filter((value) => value === null)).toHaveLength(6);
    expect(reservations.filter((value) => value !== null)).toHaveLength(2);
    await base.db.run(
      sql`update note_sharing set link_generation=link_generation+1,token_hash='fixture-second',token_envelope='fixture-second',version=version+1 where note_id=${noteId}`,
    );
    expect(
      await c.unitOfWorkProvider.run((u) =>
        u.exports.reserveDownload(
          noteId,
          "parallel-browser",
          new Date(now.getTime() + 1000),
        ),
      ),
    ).toEqual(new Date(now.getTime() + 60000));
  });
  it("persists fixed limits across connection restart and prunes at most 100 old keys", async () => {
    await c.unitOfWorkProvider.run(async (u) => {
      for (let i = 0; i < 6; i++)
        await u.exports.reserveDownload(noteId, "persisted-browser", now);
    });
    const files = await base.client.execute("pragma database_list");
    const file = String(files.rows.find((r) => r.name === "main")?.file);
    const connection = createLibsqlClient({ url: `file:${file}` });
    try {
      const resumed = {
        ...createHollowContainer(
          getDatabase(connection),
          "http://localhost:3000",
          { async send() {} },
        ),
        clock: { now: () => now },
      };
      expect(
        await resumed.unitOfWorkProvider.run((u) =>
          u.exports.reserveDownload(
            noteId,
            "persisted-browser",
            new Date(now.getTime() + 59000),
          ),
        ),
      ).toEqual(new Date(now.getTime() + 60000));
      for (let i = 0; i < 203; i++)
        await base.db.run(
          sql`insert into export_download_rates(note_id,kind,subject_hash,window_start,attempts) values(${noteId},'browser',${`prune-${i}`},${now.getTime() - 60000},1)`,
        );
      await resumed.unitOfWorkProvider.run((u) => u.exports.pruneRates(now));
      expect(
        Number(
          (
            await base.db.all<{ n: number }>(
              sql`select count(*) n from export_download_rates where window_start<=${now.getTime() - 60000}`,
            )
          )[0]?.n,
        ),
      ).toBe(103);
      expect(
        await resumed.unitOfWorkProvider.run((u) =>
          u.exports.reserveDownload(
            noteId,
            "persisted-browser",
            new Date(now.getTime() + 60000),
          ),
        ),
      ).toBeNull();
    } finally {
      connection.close();
    }
  });
  it("old cleanup claims cannot release a reclaimed operation", async () => {
    const a = op();
    await c.unitOfWorkProvider.run(async (u) => {
      await u.exports.begin(a, 100);
      await u.exports.retire(a.id, now);
      const first = await u.exports.claimCleanup(
        now,
        "first",
        new Date(now.getTime() + 1000),
      );
      const second = await u.exports.claimCleanup(
        new Date(now.getTime() + 1000),
        "second",
        new Date(now.getTime() + 2000),
      );
      expect(first?.generation).toBe(2);
      expect(second?.generation).toBe(3);
      await u.objectOperations.claimDelete(
        a.key,
        "delete",
        null,
        now,
        new Date(now.getTime() + 1000),
      );
      await u.objectOperations.finishDelete(a.key, "delete");
      expect(await u.exports.finishCleanup(a.id, "first", "delete")).toBe(
        false,
      );
      expect(await u.exports.finishCleanup(a.id, "second", "delete")).toBe(
        true,
      );
    });
  });
});
