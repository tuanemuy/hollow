"use client";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  cancelDriveBackupFn,
  driveBackupFn,
  previewDriveBackupRetargetFn,
  requestDriveBackupFn,
  retargetDriveBackupFn,
} from "@/presentation/driveBackupServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type View = Awaited<ReturnType<typeof driveBackupFn>>;
type Retarget = Awaited<ReturnType<typeof previewDriveBackupRetargetFn>>;
type RetargetOffer = Readonly<{
  view: View;
  preview: Extract<Retarget["preview"], { kind: "available" }>;
  current: () => boolean;
}>;
function retargetReason(
  reason: Extract<Retarget["preview"], { kind: "unavailable" }>["reason"],
): string {
  switch (reason) {
    case "same-destination":
      return "保存先は前回と同じです。同じファイルでの再試行とは別に、保存先の変更はGoogle Drive設定で確認してください。";
    case "resolve-old-result":
      return "前回の送信結果を確定できないため、新しい保存先には受け付けません。前回の結果を確認してください。";
    case "ownership-pending":
      return "前回の処理の終了を確認中です。新しい保存先にはまだ受け付けません。";
    case "reconnect":
    case "select-folder":
      return "Google Drive設定で連携と保存先を確認してください。";
    case "active":
      return "処理中のバックアップの終了後に結果を確認してください。";
    case "already-saved":
      return "保存済みの原本を新しい保存先へ重複保存しません。";
    case "changed":
      return "原本・権限・保存先の状態が変わりました。結果を再確認してください。";
  }
}
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
  const [retarget, setRetarget] = useState<RetargetOffer | null>(null);
  const [retargetMessage, setRetargetMessage] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const reading = useRef(false);
  const queued = useRef(false);
  const command = useRef<string | null>(null);
  const offer = useRef<RetargetOffer | null>(null);
  const life = useRef({ mounted: false, generation: 0 });
  const latestRead = useRef<(() => Promise<void>) | null>(null);
  const read = useCallback(async () => {
    if (reading.current) {
      queued.current = true;
      return;
    }
    reading.current = true;
    let errorCurrent = () => false;
    try {
      queued.current = false;
      offer.current = null;
      setRetarget(null);
      setRetargetMessage("");
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
        return;
      if (next.actor.accountId !== actorId || next.noteId !== noteId) {
        setView(null);
        setError("認証状態が変わりました。画面を再読してください。");
        return;
      }
      setView(next);
      setError("");
      if (next.receipt) {
        command.current = null;
        setUncertain(false);
      }
      if (
        next.configured &&
        next.linked &&
        next.folderName &&
        next.hasOriginal &&
        next.processing.length === 0 &&
        next.records.length === 0 &&
        !command.current &&
        (!next.receipt ||
          next.receipt.jobs.every(
            (job) =>
              (job.state === "failed" &&
                job.failure !== "DRIVE_BACKUP_UNKNOWN") ||
              job.state === "cancelled",
          ))
      ) {
        try {
          const result = await previewDriveBackupRetargetFn({
            data: { noteId },
          });
          if (!errorCurrent()) return;
          if (
            result.noteId !== next.noteId ||
            result.actor.accountId !== next.actor.accountId ||
            result.actor.authVersion !== next.actor.authVersion ||
            result.actor.browserEpoch !== next.actor.browserEpoch ||
            (result.preview.kind === "available" &&
              (result.preview.epoch !== next.epoch ||
                result.preview.settingsVersion !== next.settingsVersion))
          ) {
            setRetargetMessage(
              "状態が変わりました。新しい保存先への受付前に結果を再確認してください。",
            );
            return;
          }
          if (result.preview.kind === "available") {
            const available = {
              view: next,
              preview: result.preview,
              current: errorCurrent,
            };
            offer.current = available;
            setRetarget(available);
          } else setRetargetMessage(retargetReason(result.preview.reason));
        } catch {
          if (errorCurrent())
            setRetargetMessage(
              "新しい保存先への受付可否を確認できません。現在のバックアップ結果は保持しています。結果を再確認してください。",
            );
        }
      }
    } catch {
      if (errorCurrent())
        setError(
          "バックアップ状況を確認できません。結果の確認は再送しません。",
        );
    } finally {
      reading.current = false;
      if (queued.current && life.current.mounted) void latestRead.current?.();
    }
  }, [ticket, noteId, actorId]);
  latestRead.current = read;
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
      offer.current = null;
      setRetarget(null);
      setRetargetMessage("");
      queued.current = false;
      setView(null);
      setUncertain(false);
    };
    window.addEventListener("hollow:signed-out", clear);
    return () => {
      life.current.mounted = false;
      life.current.generation++;
      queued.current = false;
      command.current = null;
      offer.current = null;
      resolved();
      window.removeEventListener("hollow:signed-out", clear);
    };
  }, [read, router]);
  const mutate = (work: () => Promise<unknown>, creates: boolean) => {
    if (busy.current || reading.current) return;
    busy.current = true;
    offer.current = null;
    setRetarget(null);
    const valid = ticket();
    const generation = life.current.generation;
    const current = () =>
      life.current.mounted && generation === life.current.generation;
    start(async () => {
      try {
        await work();
      } catch (cause) {
        if (current() && valid()) {
          setError(displayError(cause));
          if (creates) setUncertain(true);
        }
      } finally {
        busy.current = false;
        if (current() && valid()) {
          try {
            await router.invalidate();
          } catch {
            if (current()) setError("現在の状態を再読してください。");
          }
          if (current()) void latestRead.current?.();
        }
      }
    });
  };
  const retargetRequest = () => {
    if (
      !retarget ||
      offer.current !== retarget ||
      !retarget.current() ||
      retarget.view !== view ||
      busy.current ||
      reading.current ||
      command.current ||
      uncertain
    )
      return;
    if (
      !window.confirm(
        `このノートの取り込み時の原本を、新しい保存先「${retarget.preview.destinationName}」へバックアップしますか？新しい受付を作成します。前回の失敗・取消と保存先の記録は保持し、同じファイルでの再試行は行いません。`,
      )
    )
      return;
    if (
      offer.current !== retarget ||
      !retarget.current() ||
      busy.current ||
      reading.current ||
      command.current
    )
      return;
    const commandId = crypto.randomUUID();
    command.current = commandId;
    const preview = retarget.preview;
    mutate(
      () =>
        retargetDriveBackupFn({
          data: {
            noteId,
            commandId,
            expectedEpoch: preview.epoch,
            expectedSettingsVersion: preview.settingsVersion,
            expectedHeadTargetId: preview.headTargetId,
            expectedHeadVersion: preview.headVersion,
            expectedTargetVersion: preview.targetVersion,
            expectedDigest: preview.expectedDigest,
          },
        }),
      true,
    );
  };
  const request = (retry = false) => {
    if (
      busy.current ||
      reading.current ||
      !view ||
      command.current ||
      view.processing.length ||
      !view.configured ||
      !view.linked ||
      !view.folderName ||
      (retry && !view.retry)
    )
      return;
    if (
      retry &&
      !window.confirm(
        "前回の結果を同じファイルで確認してから再試行しますか？別ファイルは作成しません。取消済みの場合も、新しい明示操作として受け付けます。",
      )
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
            ...(retry && view.retry
              ? {
                  kind: view.retry.cancelled
                    ? ("redo" as const)
                    : ("retry" as const),
                  priorJobId: view.retry.jobId,
                  priorJobVersion: view.retry.jobVersion,
                }
              : {}),
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
            onClick={() => request()}
          >
            {pending ? "受付中…" : "原本をDriveにバックアップ"}
          </button>
          {view.retry && (
            <>
              <p>
                前回の結果は保持します。同じファイルの受信位置を確認し、安全に再開できない場合は停止します。自動再送はしません。
              </p>
              <button
                type="button"
                disabled={pending || uncertain || view.processing.length > 0}
                onClick={() => request(true)}
              >
                同じファイルで再試行
              </button>
            </>
          )}
          {retargetMessage && <p>{retargetMessage}</p>}
          {retarget && (
            <>
              <p>
                新しい保存先：{retarget.preview.destinationName}
                。このノートの取り込み時の原本を新しい受付で保存します。前回の結果は保持します。
              </p>
              <button
                type="button"
                disabled={pending || uncertain}
                onClick={retargetRequest}
              >
                新しい保存先にバックアップ
              </button>
            </>
          )}
          <ul>
            {view.processing.map((row, index) => (
              <li key={row.jobId ?? index}>
                処理中 {row.bytes} / {row.total} bytes
                {row.owner === "unknown" && " — 実終了を確認中・原本を保全"}
                {row.manualCancellationRequested && (
                  <p>
                    取消を受け付けました。未開始の処理は取り消し、開始済みの処理は完了を待って結果を残します。
                  </p>
                )}
                {row.jobId && !row.manualCancellationRequested && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "未開始のバックアップを取り消しますか？開始済みの処理は中断せず、完了を待って結果を残します。原本は保全されます。",
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
