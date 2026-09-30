"use client";
import type { BackupActivityCursor } from "@repo/core/application/integration/drive/backup/activity";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  cancelDriveBackupParentFn,
  driveBackupActivityFn,
  driveBackupDetailFn,
  retryDriveBackupParentFn,
} from "@/presentation/driveBackupServerFn";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import { useDriveBackupActivity } from "./DriveBackupActivityProvider";
import { driveBackupFailureText } from "./DriveBackupPanel";
import { useSharingActor } from "./SharingActorProvider";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type Parent = Awaited<ReturnType<typeof driveBackupActivityFn>>["rows"][number];
type Detail = Awaited<ReturnType<typeof driveBackupDetailFn>>;
export function DriveBackupHistory() {
  const router = useRouter();
  const { watch, refresh: refreshActivity } = useDriveBackupActivity();
  const actor = useSharingActor();
  const currentActor = actor?.currentActor;
  const ticket = useAuthenticationOperation();
  const [rows, setRows] = useState<Parent[]>([]);
  const [next, setNext] = useState<BackupActivityCursor | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const queued = useRef(false);
  const life = useRef(true);
  const command = useRef<string | null>(null);
  const page = useRef<BackupActivityCursor | null>(null);
  const selected = useRef<{
    requestId: string;
    generation: number;
    after?: number;
  } | null>(null);
  const read = useCallback(() => {
    if (!life.current) return;
    if (busy.current) {
      queued.current = true;
      return;
    }
    busy.current = true;
    const valid = ticket();
    const expected = currentActor?.();
    const current = () => life.current && valid();
    const cursor = page.current;
    const locator = command.current;
    start(async () => {
      try {
        const value = await driveBackupActivityFn({
          data: {
            ...(cursor ? { cursor } : {}),
            ...(locator ? { commandId: locator } : {}),
          },
        });
        if (!current() || value.actor.accountId !== expected?.id) return;
        setRows((previous) =>
          cursor
            ? [
                ...new Map(
                  [...previous, ...value.rows].map((row) => [row.id, row]),
                ).values(),
              ]
            : value.rows,
        );
        setNext(value.next);
        if (locator && command.current === locator) {
          if (value.receipt) {
            watch(value.receipt.receiptId);
            command.current = null;
            setError("");
          } else
            setError("再試行の受付結果はまだ不明です。自動では再送しません。");
        } else setError("");
        const selection = selected.current;
        if (selection) {
          const latest = value.rows.find(
            (row) => row.id === selection.requestId,
          );
          if (latest && latest.generation !== selection.generation) {
            selected.current = {
              requestId: latest.id,
              generation: latest.generation,
            };
            setDetail(null);
          }
          const target = selected.current!;
          const result = await driveBackupDetailFn({ data: target });
          if (
            current() &&
            selected.current === target &&
            result.actor.accountId === expected?.id &&
            result.requestId === target.requestId &&
            result.generation === target.generation
          )
            setDetail((previous) =>
              target.after &&
              previous?.requestId === result.requestId &&
              previous.generation === result.generation
                ? {
                    ...result,
                    rows: [
                      ...new Map(
                        [...previous.rows, ...result.rows].map((row) => [
                          row.id,
                          row,
                        ]),
                      ).values(),
                    ],
                  }
                : result,
            );
        }
      } catch {
        if (current())
          setError(
            "原本バックアップ履歴を確認できません。現在の状態を再読してください。",
          );
      } finally {
        busy.current = false;
        if (queued.current) {
          queued.current = false;
          read();
        }
      }
    });
  }, [currentActor, ticket, watch]);
  useEffect(() => {
    life.current = true;
    read();
    return () => {
      life.current = false;
      queued.current = false;
    };
  }, [read]);
  useEffect(
    () =>
      router.subscribe("onResolved", () => {
        page.current = null;
        read();
      }),
    [read, router],
  );
  useEffect(() => {
    void actor?.actor?.id;
    void actor?.actor?.epoch;
    const clear = () => {
      setRows([]);
      setDetail(null);
      setNext(null);
      setError("");
      command.current = null;
      selected.current = null;
      page.current = null;
    };
    clear();
    window.addEventListener("hollow:signed-out", clear);
    return () => window.removeEventListener("hollow:signed-out", clear);
  }, [actor?.actor?.id, actor?.actor?.epoch]);
  const mutate = (row: Parent, retry: boolean) => {
    if (
      busy.current ||
      command.current ||
      !window.confirm(
        retry
          ? "失敗した子だけを再試行し、同じ親ジョブで進捗を再計算します。成功・取消済みは再送しません。続けますか？"
          : "未開始分を取り消します。開始済みは終了を待ち、その結果を保持します。続けますか？",
      )
    )
      return;
    busy.current = true;
    const valid = ticket();
    const expected = currentActor?.();
    const current = () =>
      life.current && valid() && currentActor?.()?.id === expected?.id;
    const commandId = retry ? crypto.randomUUID() : null;
    command.current = commandId;
    start(async () => {
      try {
        await bootstrapAuthenticationFn();
        if (!current()) return;
        if (commandId) {
          const value = await retryDriveBackupParentFn({
            data: {
              requestId: row.id,
              expectedGeneration: row.generation,
              commandId,
            },
          });
          if (!current()) return;
          watch(value.receiptId);
        } else {
          await cancelDriveBackupParentFn({
            data: { requestId: row.id, expectedGeneration: row.generation },
          });
          if (!current()) return;
        }
        setError("");
        page.current = null;
        await router.invalidate();
      } catch {
        if (current())
          setError("操作結果を確認してください。自動では再送しません。");
      } finally {
        busy.current = false;
        refreshActivity();
        if (life.current) {
          queued.current = false;
          read();
        }
      }
    });
  };
  return (
    <section
      aria-label="原本バックアップの履歴"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h2>原本バックアップの履歴</h2>
      <p>
        本人の直近90日を、親ジョブ単位・1ページ最大50件で表示します。存続ノートのバックアップ記録は履歴とは別に保持されます。
      </p>
      <p>
        未開始分の取消と、開始済みの終了待ちを区別します。失敗した子だけ再試行すると同じ親が再び処理中になります。取消済みは元の操作をやり直してください。
      </p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <h3>
              {row.title} —{" "}
              {row.kind === "bulk"
                ? "一括"
                : row.kind === "automatic"
                  ? "自動"
                  : "手動"}
              バックアップ
            </h3>
            <p>
              {row.createdAt} —{" "}
              {row.state === "processing"
                ? "処理中"
                : row.state === "failed"
                  ? "失敗を含む"
                  : row.state === "cancelled"
                    ? "取消を含む"
                    : "成功"}{" "}
              — {row.count}件（待機{row.counts.queued}・実行{row.counts.running}
              ・成功{row.counts.succeeded}・失敗{row.counts.failed}・取消
              {row.counts.cancelled}）
            </p>
            {row.cancellationRequested && row.active > 0 && (
              <p>取消を受け付けました。開始済みの終了を待っています。</p>
            )}
            {row.summary && (
              <p>
                固定選択{row.summary.selected}件、原本なし
                {row.summary.noOriginal}件、編集不可{row.summary.denied}
                件、処理中等{row.summary.processing}件を除外。保存済み
                {row.summary.recorded}件は送信不要です。
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                selected.current = {
                  requestId: row.id,
                  generation: row.generation,
                };
                setDetail(null);
                read();
              }}
            >
              子の結果を見る
            </button>
            {row.active > 0 && (
              <button
                type="button"
                disabled={
                  pending ||
                  Boolean(command.current) ||
                  row.cancellationRequested
                }
                onClick={() => mutate(row, false)}
              >
                未開始分を取り消す
              </button>
            )}
            {row.retryable && (
              <button
                type="button"
                disabled={pending || Boolean(command.current)}
                onClick={() => mutate(row, true)}
              >
                失敗した子だけ再試行
              </button>
            )}
          </li>
        ))}
      </ul>
      {!rows.length && !pending && (
        <p>表示できるバックアップ履歴はありません。</p>
      )}
      {detail && (
        <section aria-label="バックアップの子の結果">
          <ul>
            {detail.rows.map((row) => (
              <li key={row.id}>
                {row.title} —{" "}
                {row.state === "failed"
                  ? driveBackupFailureText(row.failure)
                  : row.state === "succeeded"
                    ? "成功"
                    : row.state === "cancelled"
                      ? "取消済み"
                      : row.state === "queued"
                        ? "待機中"
                        : "処理中"}{" "}
                — {row.bytes} bytes{" "}
                {row.link && (
                  <a href={row.link} target="_blank" rel="noreferrer">
                    Driveの原本を開く
                  </a>
                )}
              </li>
            ))}
          </ul>
          {detail.next !== null && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                selected.current = {
                  requestId: detail.requestId,
                  generation: detail.generation,
                  after: detail.next!,
                };
                read();
              }}
            >
              子の結果をさらに読む
            </button>
          )}
        </section>
      )}
      {next && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            page.current = next;
            read();
          }}
        >
          以前の親ジョブを読む
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          page.current = null;
          read();
        }}
      >
        原本バックアップ履歴を再読
      </button>
    </section>
  );
}
