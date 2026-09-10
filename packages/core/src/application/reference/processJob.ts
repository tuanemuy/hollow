import type { Account } from "@repo/core/domain/account/entity";
import {
  type Asset,
  assetUrl,
  parseAssetUrl,
} from "@repo/core/domain/asset/entity";
import { BusinessRuleError } from "@repo/core/domain/error";
import { IMPORT_LIMITS } from "@repo/core/domain/import/entity";
import { completeDisplay } from "@repo/core/domain/note/displayStyle";
import type { Note } from "@repo/core/domain/note/entity";
import { editNote, MAX_HTML_BYTES } from "@repo/core/domain/note/entity";
import type { ReferenceSettings } from "@repo/core/domain/reference/entity";
import {
  REFERENCE_LIMITS,
  type ReferenceEntry,
  type ReferenceJob,
  type ReferenceObject,
  referenceBytesAfterAcceptance,
} from "@repo/core/domain/reference/entity";
import { isSerializableError } from "@repo/core/lib/error";
import type { HollowContainer } from "../di/hollowTypes";
import { importContext } from "../import/context";
import { commitNote } from "../note/commitNote";
import { inspectDependencies, syncDependencies } from "./dependencies";
import { storageUsage } from "./quota";

export function resolveBundlePath(
  source: string,
  relative: string,
): string | null {
  if (/^[a-z][a-z\d+.-]*:|^\/|[\\\0]/i.test(relative)) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(relative.split(/[?#]/)[0] ?? "");
  } catch {
    return null;
  }
  if (/[\\\0]/.test(decoded)) return null;
  const parts = source.split("/").slice(0, -1);
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
const streamOf = (bytes: Uint8Array) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
type Stage = {
  entry: ReferenceEntry;
  asset: Asset | null;
  object: ReferenceObject | null;
  replacement: string | null;
  style: { url: string; css: string; finalUrl: string } | null;
};
function reason(error: unknown) {
  const s = isSerializableError(error) ? error.toSerialized() : null;
  return s?.kind === "business"
    ? s.message
    : "参照の取得に失敗しました。再試行できます。";
}

export async function runReferenceJob(
  container: HollowContainer,
  job: ReferenceJob,
  signal: AbortSignal,
) {
  if (
    job.state !== "running" ||
    !container.referencing ||
    !container.inlineMedia
  )
    return;
  const io = importContext(container);
  const ref = container.referencing;
  const now = () => container.clock.now();
  const source = await container.unitOfWorkProvider.run(async (c) => ({
    note: await c.notes.findById(job.noteId),
    settings: await c.references.settings(job.noteId),
    entries: await c.references.entries(job.noteId),
  }));
  if (!source.note) {
    await container.unitOfWorkProvider.run((c) =>
      c.references.finish(job.id, job.leaseToken, now(), "cancelled"),
    );
    return;
  }
  const targets = source.entries.filter(
    (e) =>
      e.current &&
      e.state !== "acquired" &&
      e.state !== "external" &&
      e.state !== "limited" &&
      (source.settings?.enabled !== false || e.url.startsWith("data:")),
  );
  const stages: Stage[] = [];
  const objects: ReferenceObject[] = [];
  let used = source.entries
    .filter((e) => e.current && e.state === "acquired")
    .reduce((n, e) => n + e.bytes, 0);
  let terminal: "succeeded" | "failed" | "cancelled" = "succeeded";
  let failure: string | undefined;
  const started = now().getTime();
  try {
    if (job.attempt > REFERENCE_LIMITS.claims)
      throw new BusinessRuleError(
        "REFERENCE_ATTEMPTS",
        "処理を3回再開しても完了しませんでした。再試行してください。",
      );
    for (const entry of targets) {
      const control: {
        job: ReferenceJob | null;
        settings: ReferenceSettings | null;
        note: Note | null;
        account: Account | null;
      } = await container.unitOfWorkProvider.run(async (c) => ({
        job: await c.references.job(job.id),
        settings: await c.references.settings(job.noteId),
        note: await c.notes.findById(job.noteId),
        account: await c.accounts.findById(job.accountId),
      }));
      if (
        control.job?.state !== "running" ||
        control.job.leaseToken !== job.leaseToken ||
        control.settings?.activeJobId !== job.id ||
        control.note?.version !== job.noteVersion ||
        control.note.owner.kind !== "personal" ||
        control.note.owner.accountId !== job.accountId ||
        control.account?.status !== "verified"
      ) {
        terminal = "cancelled";
        break;
      }
      if (control.job.cancelRequested) {
        terminal = "cancelled";
        break;
      }
      if (
        signal.aborted ||
        now().getTime() - started >= REFERENCE_LIMITS.executionMs
      ) {
        terminal = "failed";
        failure =
          "参照処理の実行時間上限（5分）です。取得済みを残して残りを再試行できます。";
        break;
      }
      const remaining = REFERENCE_LIMITS.bytes - used;
      if (remaining <= 0) {
        stages.push({
          entry: {
            ...entry,
            state: "limited",
            reason: "現在の参照は合計100 MBまでです。",
            updatedAt: now(),
          },
          asset: null,
          object: null,
          replacement: null,
          style: null,
        });
        continue;
      }
      let object: ReferenceObject | null = null;
      let body: ReadableStream<Uint8Array> | null = null;
      try {
        if (parseAssetUrl(entry.url) || /^\/api\//.test(entry.url))
          throw new BusinessRuleError(
            "REFERENCE_ASSET_SCOPE",
            "サービス内の別ノートの資産は取り込めません。",
          );
        const cap = Math.min(
          remaining,
          entry.kind === "stylesheet"
            ? REFERENCE_LIMITS.cssBytes
            : entry.kind === "image"
              ? 20 * 1024 * 1024
              : REFERENCE_LIMITS.bytes,
        );
        let finalUrl = entry.url;
        let data: Uint8Array | null = null;
        if (entry.url.startsWith("data:")) {
          const decoded = ref.processor.decodeDataUri(entry.url);
          data = decoded.bytes;
          if (data.length > cap)
            throw new BusinessRuleError(
              "REFERENCE_SIZE",
              "参照のサイズ上限を超えました。",
            );
          body = streamOf(data);
        } else if (!/^https?:\/\//i.test(entry.url)) {
          const path = source.settings?.sourcePath
            ? resolveBundlePath(source.settings.sourcePath, entry.url)
            : null;
          const companions = source.settings?.bundleId
            ? await container.unitOfWorkProvider.run((c) =>
                c.references.companions(source.settings?.bundleId ?? ""),
              )
            : [];
          const matches = companions.filter(
            (c) => c.accountId === job.accountId && c.path === path,
          );
          if (!path || matches.length !== 1)
            throw new BusinessRuleError(
              "REFERENCE_RELATIVE",
              matches.length > 1
                ? "同梱パスが重複しているため解決できません。"
                : "相対参照に対応する同梱ファイルがありません。",
            );
          const companion = matches[0];
          if (!companion || companion.bytes > cap)
            throw new BusinessRuleError(
              "REFERENCE_SIZE",
              "参照のサイズ上限を超えました。",
            );
          body = await io.storage.stream(companion.storageKey);
          finalUrl = `bundle:${path}`;
        } else {
          const fetched = await ref.fetcher.fetch(entry.url, {
            maxBytes: cap,
            signal,
          });
          body = fetched.body;
          finalUrl = fetched.finalUrl;
        }
        object = {
          id: container.idGenerator.next(),
          jobId: job.id,
          accountId: job.accountId,
          bytes: cap,
          state: "reserved",
          createdAt: now(),
        };
        await container.unitOfWorkProvider.run(async (c) => {
          const available =
            IMPORT_LIMITS.quotaBytes -
            (await storageUsage(c, job.accountId, now()));
          if (available <= 0)
            throw new BusinessRuleError(
              "REFERENCE_QUOTA",
              "保存容量5 GBを超えるため参照を取り込めません。",
            );
          object = {
            ...(object as ReferenceObject),
            bytes: Math.min(cap, available),
          };
          await c.references.saveObject(object as ReferenceObject);
        });
        objects.push(object);
        const stored = await io.storage.putBounded(
          object.id,
          body,
          object.bytes,
          signal,
        );
        object = { ...object, bytes: stored.bytes, state: "written" };
        objects[objects.length - 1] = object;
        await container.unitOfWorkProvider.run((c) =>
          c.references.saveObject(object as ReferenceObject),
        );
        let acceptedBytes = stored.bytes;
        if (entry.kind === "stylesheet") {
          const css = ref.processor.decodeCss(
            await io.storage.read(object.id, REFERENCE_LIMITS.cssBytes),
          );
          stages.push({
            entry: {
              ...entry,
              state: "acquired",
              reason: null,
              bytes: stored.bytes,
              finalUrl,
              updatedAt: now(),
            },
            asset: null,
            object,
            replacement: null,
            style: { url: entry.url, css, finalUrl },
          });
        } else {
          const inspected = await container.inlineMedia.inspect({
            body: await io.storage.stream(object.id),
            bytes: stored.bytes,
            signal,
          });
          if (inspected.kind !== entry.kind)
            throw new BusinessRuleError(
              "REFERENCE_TYPE",
              "参照先の内容形式が画像・動画の指定と一致しません。",
            );
          let accepted = stored;
          if (inspected.sanitizedSvg) {
            const finalBytes = inspected.sanitizedSvg.length;
            referenceBytesAfterAcceptance(used, finalBytes, cap);
            if (finalBytes > object.bytes) {
              const growth = finalBytes - object.bytes;
              await container.unitOfWorkProvider.run(async (c) => {
                if (
                  (await storageUsage(c, job.accountId, now())) + growth >
                  IMPORT_LIMITS.quotaBytes
                )
                  throw new BusinessRuleError(
                    "REFERENCE_QUOTA",
                    "安全化後の参照を保存すると容量5 GBを超えます。空き容量を確保して再試行してください。",
                  );
                object = { ...(object as ReferenceObject), bytes: finalBytes };
                await c.references.saveObject(object as ReferenceObject);
              });
              objects[objects.length - 1] = object;
            }
            await io.storage.remove(object.id);
            accepted = await io.storage.put(
              object.id,
              streamOf(inspected.sanitizedSvg),
              inspected.sanitizedSvg.length,
            );
            object = { ...object, bytes: accepted.bytes };
            objects[objects.length - 1] = object;
            await container.unitOfWorkProvider.run((c) =>
              c.references.saveObject(object as ReferenceObject),
            );
          }
          acceptedBytes = accepted.bytes;
          if (data && data.length <= 32 * 1024) {
            const safeBytes = inspected.sanitizedSvg ?? data;
            stages.push({
              entry: {
                ...entry,
                state: "acquired",
                reason: inspected.removed.join(" / ") || null,
                bytes: safeBytes.length,
                finalUrl: ref.processor.encodeDataUri(
                  safeBytes,
                  inspected.mime,
                ),
                updatedAt: now(),
              },
              asset: null,
              object,
              replacement: ref.processor.encodeDataUri(
                safeBytes,
                inspected.mime,
              ),
              style: null,
            });
          } else {
            const asset: Asset = {
              id: object.id,
              accountId: job.accountId,
              draftId: null,
              sourceNoteId: job.noteId,
              sourceJobId: job.id,
              storageKey: object.id,
              bytes: accepted.bytes,
              sha256: accepted.sha256,
              mime: inspected.mime,
              kind: inspected.kind,
              createdAt: now(),
              unreferencedAt: null,
              committedToNote: true,
              state: "ready",
            };
            stages.push({
              entry: {
                ...entry,
                state: "acquired",
                reason: inspected.removed.join(" / ") || null,
                bytes: accepted.bytes,
                finalUrl,
                assetId: asset.id,
                updatedAt: now(),
              },
              asset,
              object,
              replacement: assetUrl({
                scope: "notes",
                scopeId: job.noteId,
                assetId: asset.id,
              }),
              style: null,
            });
          }
        }
        used = referenceBytesAfterAcceptance(used, acceptedBytes, cap);
      } catch (error) {
        stages.push({
          entry: {
            ...entry,
            state: "failed",
            reason: reason(error),
            updatedAt: now(),
          },
          asset: null,
          object,
          replacement: null,
          style: null,
        });
      } finally {
        if (body && !body.locked) await body.cancel().catch(() => {});
      }
      await container.unitOfWorkProvider.run((c) =>
        c.references.heartbeat(
          job.id,
          job.leaseToken,
          now(),
          new Date(now().getTime() + REFERENCE_LIMITS.leaseMs),
          stages.length,
        ),
      );
    }
  } catch (error) {
    terminal = "failed";
    failure = reason(error);
  }
  if (signal.aborted) {
    terminal = "failed";
    failure =
      "参照処理の実行時間上限（5分）です。取得済みを残して残りを再試行できます。";
  }
  const replacements = new Map(
    stages.flatMap((s) =>
      s.replacement ? [[s.entry.url, s.replacement] as const] : [],
    ),
  );
  const prepared = ref.processor.rewrite(
    source.note.html,
    replacements,
    stages.flatMap((s) => (s.style ? [s.style] : [])),
  );
  let html = prepared.html;
  if (new TextEncoder().encode(html).length > MAX_HTML_BYTES) {
    html = ref.processor.rewrite(source.note.html, replacements, []).html;
    for (const stage of stages)
      if (stage.style) {
        stage.entry = {
          ...stage.entry,
          state: "limited",
          reason: "本文800 KB上限のため取得した装飾を適用しませんでした。",
        };
        stage.style = null;
      }
  }
  let committed = false;
  const finalDocument = ref.processor.prepare(html);
  const inspections = await inspectDependencies(
    container,
    finalDocument,
    signal,
  );
  try {
    committed = await container.unitOfWorkProvider.run(async (c) => {
      const current = await c.references.job(job.id);
      const settings = await c.references.settings(job.noteId);
      const note = await c.notes.findById(job.noteId);
      const account = await c.accounts.findById(job.accountId);
      if (
        current?.state !== "running" ||
        current.leaseToken !== job.leaseToken ||
        current.leaseUntil <= now()
      )
        return false;
      if (
        settings?.activeJobId !== job.id ||
        note?.version !== job.noteVersion ||
        note.owner.kind !== "personal" ||
        note.owner.accountId !== job.accountId ||
        account?.status !== "verified"
      ) {
        await c.references.finish(job.id, job.leaseToken, now(), "cancelled");
        return false;
      }
      if (current.cancelRequested && terminal === "succeeded")
        terminal = "cancelled";
      for (const stage of stages) {
        await c.references.saveEntry(stage.entry);
        if (stage.asset && stage.object) {
          await c.assets.insert(stage.asset);
          await c.references.saveObject({
            ...stage.object,
            state: "committed",
          });
        }
      }
      for (const entry of targets.filter(
        (e) => !stages.some((s) => s.entry.id === e.id),
      ))
        await c.references.saveEntry({
          ...entry,
          state: terminal === "cancelled" ? "cancelled" : "unattempted",
          reason:
            failure ??
            (terminal === "cancelled"
              ? "未開始の参照は取り消されました。"
              : null),
          updatedAt: now(),
        });
      for (const notice of prepared.notices)
        await c.references.saveEntry({
          id: container.idGenerator.next(),
          noteId: job.noteId,
          kind: "stylesheet",
          url: notice.source ?? "",
          location: notice.location,
          current: false,
          state: "limited",
          reason: notice.message,
          assetId: null,
          finalUrl: null,
          bytes: 0,
          createdAt: now(),
          updatedAt: now(),
        });
      await syncDependencies(
        container,
        c,
        job.noteId,
        finalDocument.candidates,
        inspections,
        await c.references.entries(job.noteId),
      );
      const display = completeDisplay(
        note.display,
        "reference",
        job.id,
        ref.processor.hasDecoration(html),
      );
      if (html !== note.html || display !== note.display) {
        await commitNote(container, c, {
          previous: note,
          note:
            html !== note.html || display.style !== note.display.style
              ? editNote({ ...note, display }, note.title, html, now())
              : { ...note, display },
          actor: { kind: "system", jobId: job.id },
          cause: "reference",
        });
      }
      await c.references.finish(
        job.id,
        job.leaseToken,
        now(),
        terminal,
        failure,
      );
      return true;
    });
  } finally {
    for (const object of objects) {
      if (committed && stages.some((s) => s.asset?.id === object.id)) continue;
      try {
        await io.storage.remove(object.id);
        await container.unitOfWorkProvider.run((c) =>
          c.references.saveObject({ ...object, state: "cleaned" }),
        );
      } catch (error) {
        container.logger.error("Reference object cleanup failed", {
          objectId: object.id,
          cause: error,
        });
      }
    }
  }
}
