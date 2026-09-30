"use client";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  cancelDriveBackupFn,
  driveBackupFn,
  requestDriveBackupFn,
} from "@/presentation/driveBackupServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type View = Awaited<ReturnType<typeof driveBackupFn>>;
export function driveBackupFailureText(code: string | null): string {
  if (code === "DRIVE_BACKUP_FOLDER_TRASHED")
    return "保存先はゴミ箱にあります。復元、保存先の再選択、または新規作成を確認してください。";
  if (
    code === "DRIVE_BACKUP_FOLDER_UNAVAILABLE" ||
    code === "DRIVE_BACKUP_FOLDER_CHANGED"
  )
    return "保存先を確認できません。削除とは断定できないため、保存先の再選択・新規作成を確認してください。";
  if (code === "DRIVE_BACKUP_DENIED")
    return "保存先へのアクセス権限を確認してください。";
  if (code === "DRIVE_BACKUP_QUOTA")
    return "Google Driveの空き容量を確認してください。";
  if (code === "DRIVE_BACKUP_RATE_LIMIT")
    return "Google Driveが混み合っています。時間をおいて結果を確認してください。";
  if (code === "DRIVE_BACKUP_REFRESH_REQUIRED")
    return "Drive連携を確認してください。";
  if (
    code === "DRIVE_BACKUP_SOURCE_CHANGED" ||
    code === "DRIVE_BACKUP_SOURCE_INVALID" ||
    code === "DRIVE_BACKUP_SOURCE_UNAVAILABLE"
  )
    return "原本の内容または読み取り状態を確認できず停止しました。";
  if (code === "DRIVE_BACKUP_CANCELLED" || code === "DRIVE_BACKUP_CHANGED")
    return "取消またはノート・権限・連携状態の変更により停止しました。";
  if (code === "DRIVE_BACKUP_CONFLICT")
    return "Drive上の同じファイルを確認できません。別ファイルは作成していません。";
  if (code === "DRIVE_BACKUP_EXPIRED")
    return "処理時間の上限に達しました。結果を確認してください。";
  return "結果を確定できません。自動で別ファイルを作成せず、原本と送信先の記録を保持しています。";
}
export function DriveBackupPanel({
  noteId,
  actorId,
}: {
  noteId: string;
  actorId: string;
}) {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const reading = useRef(false);
  const queued = useRef(false);
  const command = useRef<string | null>(null);
  const life = useRef({ mounted: false, generation: 0 });
  const read = useCallback(async () => {
    if (reading.current) {
      queued.current = true;
      return;
    }
    reading.current = true;
    let errorCurrent = () => false;
    try {
      do {
        queued.current = false;
        const valid = ticket();
        const generation = life.current.generation;
        errorCurrent = () =>
          life.current.mounted &&
          generation === life.current.generation &&
          valid();
        const next = await driveBackupFn({
          data: {
            noteId,
            ...(command.current ? { commandId: command.current } : {}),
          },
        });
        if (
          !life.current.mounted ||
          generation !== life.current.generation ||
          !valid()
        )
          continue;
        if (next.actor.accountId !== actorId || next.noteId !== noteId) {
          setView(null);
          setError("認証状態が変わりました。画面を再読してください。");
          continue;
        }
        setView(next);
        setError("");
        if (next.receipt) {
          command.current = null;
          setUncertain(false);
        }
      } while (queued.current && life.current.mounted);
    } catch {
      if (errorCurrent())
        setError(
          "バックアップ状況を確認できません。結果の確認は再送しません。",
        );
    } finally {
      reading.current = false;
    }
  }, [ticket, noteId, actorId]);
  useEffect(() => {
    life.current.mounted = true;
    const href = router.state.location.href;
    void read();
    const resolved = router.subscribe("onResolved", () => {
      if (!busy.current && router.state.location.href === href) void read();
    });
    const clear = () => {
      life.current.generation++;
      command.current = null;
      queued.current = false;
      setView(null);
      setUncertain(false);
    };
    window.addEventListener("hollow:signed-out", clear);
    return () => {
      life.current.mounted = false;
      life.current.generation++;
      queued.current = false;
      resolved();
      window.removeEventListener("hollow:signed-out", clear);
    };
  }, [read, router]);
  const mutate = (work: () => Promise<unknown>, creates: boolean) => {
    if (busy.current || reading.current) return;
    busy.current = true;
    const valid = ticket();
    start(async () => {
      try {
        await work();
      } catch (cause) {
        if (valid()) {
          setError(displayError(cause));
          if (creates) setUncertain(true);
        }
      } finally {
        busy.current = false;
        if (valid()) {
          try {
            await router.invalidate();
          } catch {
            if (life.current.mounted)
              setError("現在の状態を再読してください。");
          }
          if (life.current.mounted) void read();
        }
      }
    });
  };
  const request = () => {
    if (
      busy.current ||
      reading.current ||
      !view ||
      command.current ||
      view.processing.length ||
      !view.configured ||
      !view.linked ||
      !view.folderName
    )
      return;
    const commandId = crypto.randomUUID();
    command.current = commandId;
    mutate(
      () =>
        requestDriveBackupFn({
          data: {
            commandId,
            noteId,
            expectedEpoch: view.epoch,
            expectedSettingsVersion: view.settingsVersion,
          },
        }),
      true,
    );
  };
  return (
    <section
      aria-label="原本のDriveバックアップ"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h2>原本のDriveバックアップ</h2>
      <p>
        取り込み時の原本だけを、本人のGoogle
        Driveへ保存します。編集したMarkdownは対象外です。同じ原本の重複保存は行いません。
      </p>
      {error && <p role="alert">{error}</p>}
      {uncertain && (
        <p role="status">
          受付結果を確認できません。自動再送はしていません。「バックアップ結果を確認」で確認してください。
        </p>
      )}
      {view && (
        <>
          <p>
            {view.folderName
              ? `保存先：${view.folderName}`
              : "Google Drive設定で連携と保存先を確認してください。"}
          </p>
          {!view.configured && (
            <p>この環境では原本バックアップが構成されていません。</p>
          )}
          <button
            type="button"
            disabled={
              pending ||
              uncertain ||
              !view.configured ||
              !view.linked ||
              !view.folderName ||
              !view.hasOriginal ||
              view.processing.length > 0
            }
            onClick={request}
          >
            {pending ? "受付中…" : "原本をDriveにバックアップ"}
          </button>
          <ul>
            {view.processing.map((row, index) => (
              <li key={row.jobId ?? index}>
                処理中 {row.bytes} / {row.total} bytes
                {row.owner === "unknown" && " — 実終了を確認中・原本を保全"}
                {row.jobId && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "バックアップを取り消しますか？終了確認まで原本は保全されます。",
                        )
                      )
                        mutate(
                          () =>
                            cancelDriveBackupFn({
                              data: { jobId: row.jobId! },
                            }),
                          false,
                        );
                    }}
                  >
                    バックアップを取り消す
                  </button>
                )}
              </li>
            ))}
          </ul>
          {view.receipt?.jobs.map((job) => (
            <p role="status" key={job.id}>
              {job.state === "succeeded"
                ? "バックアップ済み"
                : job.state === "failed"
                  ? driveBackupFailureText(job.failure)
                  : job.state === "cancelled"
                    ? "バックアップ取消済み"
                    : "バックアップ受付済み"}
            </p>
          ))}
          <ul>
            {view.records.map((record) => (
              <li key={record.id}>
                バックアップ済み — {record.createdAt} — {record.bytes} bytes{" "}
                {record.link && (
                  <a
                    href={record.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Driveの原本を開く
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" disabled={pending} onClick={() => void read()}>
        バックアップ結果を確認
      </button>
      <a href="/settings/drive">Google Drive設定へ</a>
    </section>
  );
}
