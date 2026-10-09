"use client";
import { useEffect, useRef, useState } from "react";
import { batchKindLabel, batchStateLabel } from "@/components/batch/model";
import { pdfJson, pdfListSchema } from "@/components/pdf/client";
import { zipListSchema, zipRead, zipStateLabel } from "@/components/zip/client";
import { listBatchesFn } from "@/presentation/batchServerFn";
import { driveBackupActivityFn } from "@/presentation/driveBackupServerFn";
import { listEmptyTrashFn } from "@/presentation/hollowEmptyTrash";
import { listImportsFn } from "@/presentation/hollowImports";
import { listNotePurgesFn } from "@/presentation/hollowPurge";
import { listReferenceJobsFn } from "@/presentation/hollowReferences";
import { workspaceDeletionHistoryFn } from "@/presentation/workspaceDeletionServerFn";
import { emptyStateLabel } from "./EmptyTrashState";
import { jobDuration } from "./importSelection";
import {
  type TimelineKind,
  type TimelineRow,
  timelinePage,
  timelineSource,
} from "./jobTimelineMerge";
import { purgeStateLabel } from "./PurgeState";
import { useSharingActor } from "./SharingActorProvider";

const targets: Record<TimelineKind, string> = {
  conversion: "job-conversions",
  reference: "job-references",
  batch: "job-batches",
  purge: "job-purges",
  emptyTrash: "job-empty-trash",
  workspaceDeletion: "job-workspace-deletions",
  pdf: "job-pdf",
  zip: "job-zip",
  driveBackup: "job-drive-backups",
};
const active = (state: string) => state === "queued" || state === "running";
const jobStatus = {
  queued: "待機中",
  running: "処理中",
  succeeded: "完了",
  failed: "失敗",
  cancelled: "取消済み",
} as const;
function sources(actorId: string) {
  return [
    timelineSource(
      async () => {
        const value = await listImportsFn({ data: {} });
        return {
          items: value.batches
            .flatMap((batch) => batch.jobs)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          next: null,
        };
      },
      (job) => ({
        kind: "conversion",
        id: job.id,
        title: job.name,
        label:
          job.machine || job.llm?.operation === "regenerate"
            ? "本文再生成"
            : "取り込み",
        state: jobStatus[job.state],
        createdAt: job.createdAt,
        endedAt: active(job.state) ? null : job.updatedAt,
        active: active(job.state),
      }),
    ),
    timelineSource(
      async () => ({ items: await listReferenceJobsFn(), next: null }),
      (job) => ({
        kind: "reference",
        id: job.id,
        title: job.name,
        label: "参照取得",
        state: jobStatus[job.state],
        createdAt: job.createdAt,
        endedAt: active(job.state) ? null : job.updatedAt,
        active: active(job.state),
      }),
    ),
    ...(["unfinished", "completed"] as const).flatMap((scope) => [
      timelineSource(
        async (before: { at: string; id: string } | null) => {
          const value = await listBatchesFn({
            data: { scope, ...(before ? { before } : {}) },
          });
          return { items: value.items, next: value.next };
        },
        (job) => ({
          kind: "batch",
          id: job.id,
          title: `ノート ${job.total}件`,
          label: batchKindLabel[job.kind],
          state: batchStateLabel[job.state],
          createdAt: job.createdAt,
          endedAt:
            job.counts.queued + job.counts.running ? null : job.updatedAt,
          active: job.counts.queued + job.counts.running > 0,
        }),
      ),
      timelineSource(
        async (cursor: { at: string; id: string } | null) => {
          const value = await listNotePurgesFn({
            data: { scope, ...(cursor ? { cursor } : {}) },
          });
          return { items: value.items, next: value.nextCursor };
        },
        (job) => ({
          kind: "purge",
          id: job.id,
          title: job.title,
          label: "完全削除",
          state: purgeStateLabel(job),
          createdAt: job.createdAt,
          endedAt: active(job.state) ? null : job.updatedAt,
          active: active(job.state),
        }),
      ),
      timelineSource(
        async (cursor: { at: string; id: string } | null) => {
          const value = await listEmptyTrashFn({
            data: { scope, ...(cursor ? { cursor } : {}) },
          });
          return { items: value.items, next: value.nextCursor };
        },
        (job) => ({
          kind: "emptyTrash",
          id: job.id,
          title: `ノート ${job.counts.total}件`,
          label: "ゴミ箱を空にする",
          state: emptyStateLabel(job),
          createdAt: job.createdAt,
          endedAt:
            job.counts.active + job.counts.waiting ? null : job.updatedAt,
          active: job.counts.active + job.counts.waiting > 0,
        }),
      ),
    ]),
    timelineSource(
      async (before: { at: string; requestId: string } | null) => {
        const value = await workspaceDeletionHistoryFn({
          data: before ? { before } : {},
        });
        if (value.actorId !== actorId) throw Error("timeline-actor");
        return { items: value.items, next: value.nextCursor };
      },
      (job) => ({
        kind: "workspaceDeletion",
        id: job.requestId,
        title: job.name,
        label: "ワークスペース削除",
        state: job.state === "succeeded" ? "完了" : "回収中",
        createdAt: job.acceptedAt,
        endedAt: job.completedAt,
        active: job.state !== "succeeded",
      }),
    ),
    timelineSource(
      async (cursor: { at: string; id: string } | null) => {
        const query = cursor ? `?${new URLSearchParams(cursor)}` : "";
        const { response, value } = await pdfJson(`/api/pdf-requests${query}`);
        if (!response.ok) throw Error("timeline-pdf");
        const page = pdfListSchema.parse(value);
        if (page.actorId !== actorId) throw Error("timeline-actor");
        return { items: page.items, next: page.nextCursor };
      },
      (job) => ({
        kind: "pdf",
        id: job.id,
        title: job.title,
        label: "PDF書き出し",
        state: jobStatus[job.state],
        createdAt: job.createdAt,
        endedAt: active(job.state) ? null : job.updatedAt,
        active: active(job.state),
      }),
    ),
    timelineSource(
      async (
        cursor: {
          acceptedAt: string;
          requestId: string;
          generation: number;
        } | null,
      ) => {
        const query = cursor
          ? `?${new URLSearchParams({ at: cursor.acceptedAt, id: cursor.requestId, generation: String(cursor.generation) })}`
          : "";
        const value = await zipRead(`/api/zip/requests${query}`, zipListSchema);
        if (value.items.some((job) => job.actorId !== actorId))
          throw Error("timeline-actor");
        return { items: value.items, next: value.next };
      },
      (job) => ({
        kind: "zip",
        id: `${job.id}:${job.generation}`,
        title: `ノート ${job.total}件`,
        label: "ZIP書き出し",
        state: zipStateLabel[job.state],
        createdAt: job.acceptedAt,
        endedAt: job.finishedAt,
        active: ["queued", "running", "assembling", "stopping"].includes(
          job.state,
        ),
      }),
    ),
    timelineSource(
      async (
        cursor: { id: string; createdAt: string; digest: string } | null,
      ) => {
        const value = await driveBackupActivityFn({
          data: cursor ? { cursor } : {},
        });
        if (value.actor.accountId !== actorId) throw Error("timeline-actor");
        return { items: value.rows, next: value.next };
      },
      (job) => ({
        kind: "driveBackup",
        id: job.id,
        title: `${job.title} · ${job.count}件`,
        label: "Driveバックアップ",
        state: job.state === "processing" ? "処理中" : jobStatus[job.state],
        createdAt: job.createdAt,
        endedAt: job.terminalAt,
        active: job.active > 0,
      }),
    ),
  ];
}
export function JobTimeline({ refreshKey }: { refreshKey: string }) {
  const context = useSharingActor();
  return context?.actor ? (
    <Timeline
      key={`${context.actor.id}:${context.actor.epoch}`}
      actorId={context.actor.id}
      epoch={context.actor.epoch}
      refreshKey={refreshKey}
    />
  ) : null;
}
function Timeline({
  actorId,
  epoch,
  refreshKey,
}: {
  actorId: string;
  epoch: number;
  refreshKey: string;
}) {
  const actor = useSharingActor();
  const [page, setPage] = useState<{
    rows: readonly TimelineRow[];
    more: boolean;
  } | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const feeds = useRef<ReturnType<typeof sources> | null>(null);
  const mounted = useRef(false);
  const read = useRef<(append: boolean) => Promise<void>>(async () => {});
  read.current = async (append) => {
    const ticket = ++sequence.current;
    const current = () =>
      mounted.current &&
      ticket === sequence.current &&
      actor?.currentActor()?.id === actorId &&
      actor.currentActor()?.epoch === epoch;
    if (!current()) return;
    setPending(true);
    if (!append || !feeds.current) feeds.current = sources(actorId);
    try {
      const result = await timelinePage(feeds.current, current);
      if (result && current()) {
        setPage((previous) => ({
          rows: append
            ? [...(previous?.rows ?? []), ...result.rows]
            : result.rows,
          more: result.more,
        }));
        setError(false);
      }
    } catch {
      if (current()) {
        feeds.current = null;
        setPage(null);
        setError(true);
      }
    } finally {
      if (current()) setPending(false);
    }
  };
  useEffect(() => {
    void revision;
    void refreshKey;
    mounted.current = true;
    void read.current(false);
    return () => {
      mounted.current = false;
      sequence.current++;
      feeds.current = null;
    };
  }, [revision, refreshKey]);
  useEffect(() => {
    if (
      !page?.rows.some((row) => row.active) ||
      page.rows.length > 50 ||
      pending
    )
      return;
    const timer = setTimeout(() => {
      void read.current(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [page, pending]);
  const current = actor?.currentActor();
  if (current?.id !== actorId || current.epoch !== epoch) return null;
  return (
    <section aria-label="種別を横断した処理履歴" className="hollow-original">
      <h2>すべての処理を新しい順に</h2>
      <p>
        自分の処理を開始日時順に表示します。詳細・子ごとの結果と操作は各処理の履歴で確認できます。
      </p>
      {error && (
        <p role="alert">
          全体の順序を確認できませんでした。最新状態を確認し直してください。
        </p>
      )}
      {!page && !error && <p role="status">処理履歴を確認しています…</p>}
      {page && !page.rows.length && <p>処理履歴はありません。</p>}
      <ol>
        {page?.rows.map((row) => (
          <li key={`${row.kind}:${row.id}`}>
            <strong>
              {row.label} · {row.title}
            </strong>
            <p>{row.state}</p>
            <p>
              開始{" "}
              <time dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString("ja-JP")}
              </time>{" "}
              · 所要時間{" "}
              {row.endedAt
                ? jobDuration(row.createdAt, row.endedAt)
                : row.active
                  ? "処理中"
                  : "記録なし"}
            </p>
            <a href={`#${targets[row.kind]}`}>詳細と操作を確認</a>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={pending}
        onClick={() => setRevision((value) => value + 1)}
      >
        すべての処理の最新状態を確認
      </button>
      {page?.more && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void read.current(true);
          }}
        >
          次の50件を表示
        </button>
      )}
    </section>
  );
}
