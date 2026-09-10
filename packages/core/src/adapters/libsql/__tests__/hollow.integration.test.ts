import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { LocalMailbox } from "@repo/core/adapters/node/localMailbox";
import {
  currentUser,
  SESSION_LIFETIME_MS,
  signOut,
} from "@repo/core/application/account/session";
import { signIn } from "@repo/core/application/account/signIn";
import {
  resendVerification,
  signUp,
  VERIFICATION_LIFETIME_MS,
} from "@repo/core/application/account/signUp";
import { verifyEmail } from "@repo/core/application/account/verifyEmail";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { getNote } from "@repo/core/application/note/getNote";
import { listNotes } from "@repo/core/application/note/listNotes";
import { saveNote } from "@repo/core/application/note/saveNote";
import type { Mail } from "@repo/core/application/ports/mailer";
import { MAX_HTML_BYTES } from "@repo/core/domain/note/entity";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibsqlClient, getDatabase } from "../client";
import { accounts, sessions } from "../hollowSchema";
import { createTestContainer, type TestContainer } from "./helpers";

describe("Hollow account and private notes", () => {
  let base: TestContainer;
  let container: HollowContainer;
  let now: Date;
  let mail: Mail[];
  const password = "correct-password-123";
  beforeEach(async () => {
    base = await createTestContainer();
    now = new Date("2026-09-06T00:00:00Z");
    mail = [];
    container = {
      ...createHollowContainer(base.db, "http://localhost:3000", {
        async send(message) {
          mail.push(message);
        },
      }),
      clock: { now: () => now },
    };
  });
  afterEach(() => base.close());

  it("passes cross-module application errors unchanged and releases the transaction", async () => {
    const error: unknown =
      runInNewContext(`new (class ForbiddenError extends Error {
      code = 'VERIFICATION_USED';
      toSerialized() { return {kind:'forbidden',code:this.code,message:'already used'}; }
    })()`);
    await expect(
      container.unitOfWorkProvider.run(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    await expect(
      container.unitOfWorkProvider.run(async ({ accounts }) =>
        accounts.findByEmail("nobody@example.test"),
      ),
    ).resolves.toBeNull();
  });

  it("queues overlapping interactive transactions without blocking the lock holder", async () => {
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const order: number[] = [];
    const first = container.unitOfWorkProvider.run(async () => {
      order.push(1);
      await barrier;
      order.push(2);
    });
    const second = container.unitOfWorkProvider.run(async () => {
      order.push(3);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(order).toEqual([1]);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2, 3]);
  });

  function lastToken(): string {
    const body = mail.at(-1)?.text ?? "";
    const link = body.match(
      /http:\/\/localhost:3000\/verify-email\?token=\S+/,
    )?.[0];
    if (!link) throw new Error("No confirmation mail");
    return new URL(link).searchParams.get("token") ?? "";
  }
  async function verified(email = "reader@example.test") {
    const registered = await signUp(container, {
      email,
      password,
      termsAccepted: true,
    });
    const session = await verifyEmail(
      container,
      lastToken(),
      registered.browserToken,
    );
    if (!session) throw new Error("Expected same-browser session");
    return session;
  }

  it("rejects weak credentials and missing terms consent before registration", async () => {
    await expect(
      signUp(container, {
        email: "reader@example.test",
        password: "weak",
        termsAccepted: true,
      }),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD" });
    await expect(
      signUp(container, {
        email: "reader@example.test",
        password,
        termsAccepted: false,
      }),
    ).rejects.toMatchObject({ code: "TERMS_REQUIRED" });
    expect(await base.db.select().from(accounts)).toEqual([]);
    expect(mail).toEqual([]);
  });

  it("consumes a verification only once when requests arrive together", async () => {
    const registered = await signUp(container, {
      email: "reader@example.test",
      password,
      termsAccepted: true,
    });
    const token = lastToken();
    const results = await Promise.allSettled([
      verifyEmail(container, token, registered.browserToken),
      verifyEmail(container, token, registered.browserToken),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await base.db.select().from(sessions)).toHaveLength(1);
  });

  it("registers, verifies in the requesting browser, signs out and signs in", async () => {
    const registered = await signUp(container, {
      email: "Reader@EXAMPLE.test",
      password,
      termsAccepted: true,
    });
    expect(registered.email).toBe("reader@example.test");
    await expect(
      signIn(container, { email: registered.email, password }),
    ).rejects.toMatchObject({ code: "EMAIL_UNVERIFIED" });
    const session = await verifyEmail(
      container,
      lastToken(),
      registered.browserToken,
    );
    expect(session?.user.email).toBe(registered.email);
    expect(await currentUser(container, session?.token ?? null)).toEqual(
      session?.user,
    );
    await signOut(container, session?.token ?? null);
    expect(await currentUser(container, session?.token ?? null)).toBeNull();
    expect(
      (await signIn(container, { email: registered.email, password })).user
        .email,
    ).toBe(registered.email);
    const [account] = await base.db.select().from(accounts);
    const [storedSession] = await base.db.select().from(sessions);
    expect(account?.passwordHash).not.toContain(password);
    expect(storedSession?.tokenHash).not.toBe(session?.token);
  });

  it("verifies on a different browser without signing that browser in", async () => {
    await signUp(container, {
      email: "other@example.test",
      password,
      termsAccepted: true,
    });
    const token = lastToken();
    expect(await verifyEmail(container, token, "different-browser")).toBeNull();
    expect(await base.db.select().from(sessions)).toHaveLength(0);
    await expect(verifyEmail(container, token, null)).rejects.toMatchObject({
      code: "VERIFICATION_USED",
    });
    expect(
      (await signIn(container, { email: "other@example.test", password })).user
        .email,
    ).toBe("other@example.test");
  });

  it("rejects invalid and expired tokens and throttles resends", async () => {
    const registered = await signUp(container, {
      email: "reader@example.test",
      password,
      termsAccepted: true,
    });
    const oldToken = lastToken();
    await expect(
      verifyEmail(container, "tampered", registered.browserToken),
    ).rejects.toMatchObject({ code: "VERIFICATION_INVALID" });
    await expect(
      resendVerification(container, registered.email),
    ).rejects.toMatchObject({ code: "MAIL_RATE_LIMITED" });
    now = new Date(now.getTime() + VERIFICATION_LIFETIME_MS);
    await expect(
      verifyEmail(container, oldToken, registered.browserToken),
    ).rejects.toMatchObject({ code: "VERIFICATION_EXPIRED" });
    const resent = await resendVerification(container, registered.email);
    await expect(
      verifyEmail(container, oldToken, registered.browserToken),
    ).rejects.toMatchObject({ code: "VERIFICATION_INVALID" });
    expect(
      await verifyEmail(container, lastToken(), resent.browserToken),
    ).not.toBeNull();
  });

  it("does not replace an existing account password or expose registration existence", async () => {
    await verified();
    now = new Date(now.getTime() + 60_000);
    const duplicate = await signUp(container, {
      email: "reader@example.test",
      password: "another-password-321",
      termsAccepted: true,
    });
    expect(duplicate.email).toBe("reader@example.test");
    expect(duplicate.browserToken).toBeNull();
    expect(mail.at(-1)?.text).toContain("既に登録済み");
    expect(await base.db.select().from(accounts)).toHaveLength(1);
    expect(
      (await signIn(container, { email: duplicate.email, password })).user
        .email,
    ).toBe(duplicate.email);
  });

  it("expires sessions after exactly 30 days without sliding renewal", async () => {
    const session = await verified();
    const issued = now.getTime();
    now = new Date(issued + SESSION_LIFETIME_MS - 1);
    expect(await currentUser(container, session.token)).not.toBeNull();
    now = new Date(issued + SESSION_LIFETIME_MS);
    expect(await currentUser(container, session.token)).toBeNull();
    await expect(listNotes(container, session.token)).rejects.toMatchObject({
      code: "SESSION_REQUIRED",
    });
  });

  it("persists progressive delay and lockout for both known and unknown emails", async () => {
    await verified();
    for (const email of ["reader@example.test", "missing@example.test"]) {
      for (let attempt = 1; attempt <= 8; attempt++) {
        await expect(
          signIn(container, { email, password: "wrong" }),
        ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
        if (attempt >= 3) {
          await expect(
            signIn(container, { email, password }),
          ).rejects.toMatchObject({
            code: attempt === 8 ? "SIGNIN_LOCKED" : "SIGNIN_WAIT",
          });
        }
        if (attempt < 8) now = new Date(now.getTime() + 33_000);
      }
      now = new Date(now.getTime() + 15 * 60_000);
    }
    expect(
      (await signIn(container, { email: "reader@example.test", password })).user
        .email,
    ).toBe("reader@example.test");
  });

  it("saves and reloads notes, lets the latest same-user edit win, and denies another user", async () => {
    const alice = await verified("alice@example.test");
    const bob = await verified("bob@example.test");
    const created = await saveNote(container, alice.token, {
      title: "",
      html: "<h1>はじめのノート</h1><p>本文</p>",
    });
    expect(created.note.title).toBe("はじめのノート");
    expect(
      (await listNotes(container, alice.token)).map((note) => note.id),
    ).toEqual([created.note.id]);
    expect(await listNotes(container, bob.token)).toEqual([]);
    await expect(
      getNote(container, bob.token, created.note.id),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await expect(
      saveNote(container, bob.token, {
        id: created.note.id,
        title: "攻撃",
        html: "<p>変更</p>",
      }),
    ).rejects.toMatchObject({ code: "NOTE_NOT_FOUND" });
    await saveNote(container, alice.token, {
      id: created.note.id,
      version: 0,
      title: "変更1",
      html: "<p>変更1</p>",
    });
    const updated = await saveNote(container, alice.token, {
      id: created.note.id,
      version: 0,
      title: "変更2",
      html: "<p>変更2</p>",
    });
    expect(updated.note.version).toBe(2);
    expect((await getNote(container, alice.token, created.note.id)).html).toBe(
      "<p>変更2</p>",
    );
  });

  it("sanitizes dangerous HTML and reports removed elements, attributes, and URLs", async () => {
    const session = await verified();
    const result = await saveNote(container, session.token, {
      title: "HTML",
      html: '<style>body{background: red}</style><p class="kept" style="color: blue" onclick="attack()">安全</p><script>attack()</script><a href="jav&#x61;script:attack()">リンク</a><iframe src="https://example.test"></iframe><img src="x" onerror="attack()">',
    });
    expect(result.note.html).not.toMatch(
      /<script|onclick|onerror|javascript:|<iframe/i,
    );
    expect(result.note.html).toMatch(
      /<style>body\{background:\s*red\}<\/style>/,
    );
    expect(result.note.html).toContain('class="kept"');
    expect(result.removed.join(" ")).toMatch(/script.*|onclick/);
    expect(result.removed.join(" ")).toContain("危険な href URL");
  });

  it("rejects blank drafts and size overflow without creating records", async () => {
    const session = await verified();
    await expect(
      saveNote(container, session.token, { title: "", html: "<p><br></p>" }),
    ).rejects.toMatchObject({ code: "EMPTY_DRAFT" });
    await expect(
      saveNote(container, session.token, {
        title: "a".repeat(201),
        html: "<p>x</p>",
      }),
    ).rejects.toMatchObject({ code: "TITLE_TOO_LONG" });
    await expect(
      saveNote(container, session.token, {
        title: "x",
        html: "a".repeat(MAX_HTML_BYTES + 1),
      }),
    ).rejects.toMatchObject({ code: "HTML_TOO_LARGE" });
    expect(await listNotes(container, session.token)).toEqual([]);
  });

  it("keeps account and note writes atomic when a unit of work fails", async () => {
    const session = await verified();
    await expect(
      container.unitOfWorkProvider.run(async ({ accounts: repository }) => {
        const account = await repository.findById(session.user.id);
        if (!account) throw new Error("Missing account");
        await repository.save({ ...account, email: "changed@example.test" });
        throw new Error("rollback");
      }),
    ).rejects.toThrow();
    expect((await currentUser(container, session.token))?.email).toBe(
      "reader@example.test",
    );
  });
});

it("persists through a database close/reopen and writes confirmation mail only to a local file", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "hollow-persistence-"),
  );
  const url = `file:${path.join(directory, "app.db")}`;
  const client = createLibsqlClient({ url });
  let reopened: ReturnType<typeof createLibsqlClient> | undefined;
  try {
    const db = getDatabase(client);
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
    });
    const container = createHollowContainer(
      db,
      "http://localhost:3000",
      new LocalMailbox(path.join(directory, "mailbox")),
    );
    const registered = await signUp(container, {
      email: "persist@example.test",
      password: "correct-password-123",
      termsAccepted: true,
    });
    const [filename] = await readdir(path.join(directory, "mailbox"));
    const mail = JSON.parse(
      await readFile(path.join(directory, "mailbox", filename ?? ""), "utf8"),
    ) as Mail;
    const token =
      new URL(
        mail.text.match(
          /http:\/\/localhost:3000\/verify-email\?token=\S+/,
        )?.[0] ?? "",
      ).searchParams.get("token") ?? "";
    const session = await verifyEmail(
      container,
      token,
      registered.browserToken,
    );
    if (!session) throw new Error("No session");
    const saved = await saveNote(container, session.token, {
      title: "再起動",
      html: "<p>残る本文</p>",
    });
    client.close();
    reopened = createLibsqlClient({ url });
    const next = createHollowContainer(
      getDatabase(reopened),
      "http://localhost:3000",
      new LocalMailbox(path.join(directory, "mailbox")),
    );
    expect((await getNote(next, session.token, saved.note.id)).html).toBe(
      "<p>残る本文</p>",
    );
  } finally {
    client.close();
    reopened?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
