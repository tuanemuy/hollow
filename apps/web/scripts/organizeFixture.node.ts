import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Database } from "@repo/core/adapters/libsql/client";
import { NodeTagNormalizer } from "@repo/core/adapters/node/browse/tagNormalizer";
import { CoordinatedObjectStorage } from "@repo/core/adapters/node/coordinatedObjectStorage";
import {
  detectFormat,
  IsolatedDocumentExtractor,
} from "@repo/core/adapters/node/import/documentExtractor";
import { IsolatedMediaValidator } from "@repo/core/adapters/node/import/mediaValidator";
import { signIn } from "@repo/core/application/account/signIn";
import { createHollowContainer } from "@repo/core/application/di/serverHollow";
import { acceptUpload } from "@repo/core/application/import/acceptUpload";
import { beginUpload } from "@repo/core/application/import/beginUpload";
import { cancelImport } from "@repo/core/application/import/controlJobs";
import {
  commitImportResult,
  runImportJob,
} from "@repo/core/application/import/processJob";
import { saveNote } from "@repo/core/application/note/saveNote";
import { saveProfile } from "@repo/core/application/publication/profile";
import { changeNoteTags } from "@repo/core/application/tag/usecases";
import type { createOrganizeDriveFixture } from "./organizeDriveFixture.node";

export async function seedOrganize(
  db: Database,
  root: string,
  appUrl: string,
  workspaceId: string,
  drive: Awaited<ReturnType<typeof createOrganizeDriveFixture>>,
  preserveProfile = false,
) {
  const base = createHollowContainer(db, appUrl, { async send() {} });
  const storage = new CoordinatedObjectStorage(
    join(root, "objects"),
    base.unitOfWorkProvider,
    base.clock,
  );
  await storage.recoverOwners();
  const container = {
    ...base,
    tagging: {
      normalizer: NodeTagNormalizer,
      read: {
        async read(): Promise<never> {
          throw new Error("Seed does not read tag pages");
        },
      },
    },
    importing: {
      storage,
      extractor: new IsolatedDocumentExtractor(),
      mediaValidator: new IsolatedMediaValidator(),
      detectFormat,
      wake() {},
    },
  };
  let completionTimer: ReturnType<typeof setTimeout> | undefined;
  let completion: Promise<unknown> | undefined;
  try {
    const actor = await signIn(container, {
      email: "owner@editing.fixture.invalid",
      password: "local-editing-password-123",
    });
    const profile = await container.unitOfWorkProvider.run(async (u) => {
      await u.publicProfiles.ensure(actor.user.id);
      const row = await u.publicProfiles.find(actor.user.id);
      const name = await u.displayNames.find(actor.user.id);
      if (!row) throw new Error("Local profile missing");
      return { row, name };
    });
    if (!preserveProfile)
      await saveProfile(container, actor.token, {
        displayName: "整理fixture所有者",
        handle: "organize-owner",
        bio: "ローカル整理確認",
        nameVersion: profile.name.version,
        profileVersion: profile.row.version,
        confirmHandleChange: false,
      });
    const notes: { id: string; title: string; workspaceId: string | null }[] =
      [];
    for (let i = 0; i < 56; i++) {
      const date = new Date(
        i === 0 ? "2026-09-30T15:30:00Z" : "2026-10-08T01:00:00Z",
      );
      const dated = { ...container, clock: { now: () => date } };
      const title =
        i === 0
          ? "月境界の東京駅 Cloudflare"
          : `整理ノート ${String(i).padStart(2, "0")}`;
      const saved = await saveNote(dated, actor.token, {
        title,
        html: `<h1>${title}</h1><p>東京駅から Cloudflare に向かう整理本文 ${i}</p>`,
      });
      notes.push({ id: saved.note.id, title, workspaceId: null });
      if (i < 4) {
        await changeNoteTags(container, actor.token, {
          noteId: saved.note.id,
          expectedScope: {},
          change: { kind: "create", name: "頻出" },
        });
        if (i < 2)
          await changeNoteTags(container, actor.token, {
            noteId: saved.note.id,
            expectedScope: {},
            change: { kind: "create", name: "共通" },
          });
      }
    }
    const long = await saveNote(container, actor.token, {
      title: "長い本文と目次",
      html: Array.from(
        { length: 120 },
        (_, i) =>
          `<h2>見出し ${i + 1}</h2><p>${"読み返すための長い本文。".repeat(40)}</p>`,
      ).join(""),
    });
    notes.push({ id: long.note.id, title: long.note.title, workspaceId: null });
    const ws = await saveNote(container, actor.token, {
      workspaceId,
      title: "移動先の同名タグ",
      html: "<p>ワークスペースの原文</p>",
    });
    await changeNoteTags(container, actor.token, {
      noteId: ws.note.id,
      expectedScope: { workspaceId },
      change: { kind: "create", name: "共通" },
    });
    const claim = () =>
      container.unitOfWorkProvider.run(({ jobs }) => {
        const now = container.clock.now();
        return jobs.claim(
          now,
          container.idGenerator.next(),
          new Date(now.getTime() + 5 * 60_000),
        );
      });
    let queued = await claim();
    while (queued) {
      await runImportJob(container, queued);
      queued = await claim();
    }
    const originals: string[] = [];
    for (const name of ["decorated.html", "organize.md"]) {
      const bytes = name.endsWith(".md")
        ? Buffer.from("# 一括原本 Markdown\n\n東京駅 Cloudflare\n")
        : await readFile(join(root, "editing-files", name));
      const batch = await beginUpload(container, actor.token, {
        files: [{ name, bytes: bytes.length }],
        useAi: false,
        importReferences: false,
      });
      const upload = batch.files[0];
      if (!upload) throw new Error("Local upload missing");
      const accepted = await acceptUpload(
        container,
        actor.token,
        upload.id,
        new ReadableStream({
          start(stream) {
            stream.enqueue(bytes);
            stream.close();
          },
        }),
      );
      if (!accepted.noteId) throw new Error("Local original note missing");
      originals.push(accepted.noteId);
    }
    queued = await claim();
    while (queued) {
      await runImportJob(container, queued);
      queued = await claim();
    }
    const states: Record<string, string> = {};
    for (const kind of [
      "failed",
      "needs_ai",
      "processing",
      ...(preserveProfile ? ["cancelled" as const] : []),
    ] as const) {
      const name = kind === "needs_ai" ? "media.png" : `${kind}.html`;
      const bytes =
        kind === "needs_ai"
          ? await readFile(join(root, "editing-files", name))
          : Buffer.from(
              `<h1>${kind} 状態の原本</h1><p>東京駅から Cloudflare</p>`,
            );
      const batch = await beginUpload(container, actor.token, {
        files: [{ name, bytes: bytes.length }],
        useAi: kind === "needs_ai",
        importReferences: false,
      });
      const upload = batch.files[0];
      if (!upload) throw new Error("State fixture upload missing");
      const accepted = await acceptUpload(
        container,
        actor.token,
        upload.id,
        new ReadableStream({
          start(stream) {
            stream.enqueue(bytes);
            stream.close();
          },
        }),
      );
      if (!accepted.noteId) throw new Error("Local state note missing");
      if (kind === "cancelled") {
        await cancelImport(container, actor.token, batch.batchId);
        states[kind] = accepted.noteId;
        continue;
      }
      const job = await claim();
      if (!job || job.noteId !== accepted.noteId)
        throw new Error("State fixture job missing");
      if (kind === "failed")
        await commitImportResult(container, job, {
          kind: "failed",
          reason:
            "ローカル変換fixtureで原本の読み取りに失敗しました。再試行できます。",
        });
      else if (kind === "needs_ai") await runImportJob(container, job);
      else {
        completionTimer = setTimeout(() => {
          const pending = runImportJob(container, job);
          completion = pending;
          void pending.catch((cause: unknown) =>
            console.error("Local processing fixture failed", cause),
          );
        }, 90_000);
        completionTimer.unref();
      }
      states[kind] = accepted.noteId;
    }
    await container.unitOfWorkProvider.run(async (u) => {
      const previous = await u.driveConnections.ensure(
        actor.user.id,
        container.clock.now(),
      );
      const now = container.clock.now();
      const epoch = previous.epoch + 1;
      const credentialVersion = previous.credentialVersion + 1;
      const subject = `local-${actor.user.id}`;
      const linked = {
        ...previous,
        state: "linked" as const,
        epoch,
        credentialVersion,
        settingsVersion: previous.settingsVersion + 1,
        version: previous.version + 1,
        autoBackup: false,
        folder: null,
        lastUsedAt: null,
        updatedAt: now,
        credential: {
          subject,
          email: null,
          envelope: drive.protector.protect(
            JSON.stringify({
              version: 1,
              accessToken: "local-access",
              refreshToken: "local-refresh",
            }),
            {
              purpose: "credential",
              accountId: actor.user.id,
              subject,
              epoch,
              credentialVersion,
            },
          ),
          scopes: ["openid", "https://www.googleapis.com/auth/drive.file"],
          accessExpiresAt: new Date(now.getTime() + 3600000),
          connectedAt: now,
        },
      };
      if (
        !(await u.driveConnections.replace(linked, previous.version, "adopt"))
      )
        throw new Error("Local Drive adoption rejected");
      if (
        !(await u.driveConnections.replace(
          {
            ...linked,
            folder: {
              id: drive.folderId,
              name: "ローカル原本バックアップ",
              driveId: null,
              resourceKeyEnvelope: null,
              checkedAt: now,
            },
            version: linked.version + 1,
            settingsVersion: linked.settingsVersion + 1,
          },
          linked.version,
          "folder",
        ))
      )
        throw new Error("Local Drive folder rejected");
    });
    return {
      notes,
      originals,
      states,
      longNoteId: long.note.id,
      workspaceTaggedNoteId: ws.note.id,
      async close() {
        clearTimeout(completionTimer);
        await completion;
      },
    };
  } finally {
    await base.passwordHasher.stop();
  }
}
