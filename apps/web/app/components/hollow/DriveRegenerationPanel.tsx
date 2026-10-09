"use client";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import {
  cancelMachineFn,
  machineCommandFn,
  regenerationSourcesFn,
  requestDriveMachineFn,
  undoMachineFn,
} from "@/presentation/regenerationServerFn";
import { LlmNoteAction } from "./LlmNoteAction";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type Sources = Awaited<ReturnType<typeof regenerationSourcesFn>>;
type Job = Awaited<ReturnType<typeof machineCommandFn>>;
const reasons = {
  "source-invalid": "原本の記録を確認できません。",
  "format-unsupported": "この形式は再生成に対応していません。",
  "recorder-unavailable":
    "記録した利用者が利用できません。自分のDriveに原本を再保存してください。",
  "drive-unlinked":
    "記録した利用者のDrive連携が解除されています。本人の再連携、または自分のDriveへの再保存が必要です。",
  "drive-needs-relink": "記録した利用者がDriveに再連携する必要があります。",
  "drive-account-changed":
    "記録時と連携先が異なります。本人の再連携、または自分のDriveへの再保存が必要です。",
} as const;
const phases = {
  queued: "待機中",
  acquiring: "Drive原本を取得中",
  "final-check": "取得元と本文を最終確認中",
  preparing: "原本を準備中",
  finalizing: "本文を確定中",
  terminal: "終了",
} as const;

export function DriveRegenerationPanel({
  noteId,
  noteVersion,
  processing,
}: {
  noteId: string;
  noteVersion: number;
  processing: boolean;
}) {
  const router = useRouter();
  const operation = useAuthenticationOperation();
  const [sources, setSources] = useState<Sources | null>(null);
  const [recordId, setRecordId] = useState("");
  const [job, setJob] = useState<Job>(null);
  const [ai, setAi] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const command = useRef<string | null>(null);
  const latestVersion = useRef(noteVersion);
  latestVersion.current = noteVersion;
  const read = useCallback(
    async (valid: () => boolean) => {
      const value = await regenerationSourcesFn({ data: { noteId } });
      if (!valid()) return;
      setSources(value);
      const current = await machineCommandFn({
        data: {
          noteId,
          ...(command.current ? { commandId: command.current } : {}),
        },
      });
      if (!valid()) return;
      setJob(current);
      if (current) setUncertain(false);
    },
    [noteId],
  );
  useEffect(() => {
    const valid = operation();
    const expected = noteVersion;
    void read(() => valid() && latestVersion.current === expected).catch(
      (cause) => {
        if (valid()) setError(displayError(cause));
      },
    );
  }, [operation, read, noteVersion]);
  useEffect(() => {
    if (!job || job.phase === "terminal") return;
    let disposed = false;
    const timer = setInterval(() => {
      if (busy.current) return;
      busy.current = true;
      const valid = operation();
      void read(() => !disposed && valid())
        .then(() => {
          if (!disposed && valid()) void router.invalidate();
        })
        .catch((cause) => {
          if (!disposed && valid()) setError(displayError(cause));
        })
        .finally(() => {
          busy.current = false;
        });
    }, 2000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [job, operation, read, router]);
  const mutate = (work: () => Promise<unknown>, submit = false) => {
    if (busy.current) return;
    busy.current = true;
    const valid = operation();
    setError("");
    start(async () => {
      let accepted = false;
      try {
        await work();
        accepted = true;
        if (!valid()) return;
        await read(valid);
        if (valid()) await router.invalidate();
      } catch (cause) {
        if (valid()) {
          if (submit && !accepted) {
            const kind = extractSerializedError(cause).kind;
            setUncertain(kind === "unknown" || kind === "system");
          }
          setError(displayError(cause));
        }
      } finally {
        busy.current = false;
      }
    });
  };
  const entries = sources?.items ?? [];
  const selected = entries.find((entry) => entry.recordId === recordId);
  const available = selected?.availability === "available";
  const locked = pending || processing || !!(job && job.phase !== "terminal");
  return (
    <section
      className="hollow-job-batch"
      aria-label="Driveの元ファイルから再生成"
    >
      <h2>Driveの元ファイルから再生成</h2>
      <p>
        保存を記録した利用者のDriveから原本を取得します。本文を置き換え、直前の版を保持します。題名・タグ・共有URLは維持します。
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => mutate(async () => undefined)}
      >
        取得元と結果を確認
      </button>
      {uncertain && (
        <p role="status">
          受付結果を確認できません。再送せず「取得元と結果を確認」で受付を確認してください。
        </p>
      )}
      {!sources ? (
        <p role="status">取得元を確認中…</p>
      ) : entries.length === 0 ? (
        <p>Driveに保存した原本がありません。先に原本を保存してください。</p>
      ) : (
        <>
          <label>
            取得元
            <select
              value={recordId}
              disabled={locked || uncertain}
              onChange={(event) => {
                if (
                  ai &&
                  !window.confirm(
                    "未送信の再生成設定を破棄して取得元を変更しますか？",
                  )
                )
                  return;
                setRecordId(event.target.value);
                setAi(false);
              }}
            >
              <option value="">原本を選択してください</option>
              {entries.map((entry) => (
                <option key={entry.recordId} value={entry.recordId}>
                  {entry.mine ? "自分のDrive" : "保存した利用者のDrive"} /{" "}
                  {entry.format ?? "不明"} / {entry.bytes} bytes /{" "}
                  {entry.createdAt}
                </option>
              ))}
            </select>
          </label>
          {sources.next && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const cursor = sources.next;
                if (!cursor || busy.current) return;
                busy.current = true;
                const valid = operation();
                start(async () => {
                  try {
                    const more = await regenerationSourcesFn({
                      data: { noteId, cursor },
                    });
                    if (valid())
                      setSources((previous) =>
                        previous
                          ? {
                              ...more,
                              items: [...previous.items, ...more.items],
                            }
                          : more,
                      );
                  } catch (cause) {
                    if (valid()) setError(displayError(cause));
                  } finally {
                    busy.current = false;
                  }
                });
              }}
            >
              次の取得元
            </button>
          )}
          {selected?.availability === "unavailable" && (
            <p role="status">{reasons[selected.reason]}</p>
          )}
          {available && (
            <div>
              {(selected.format === "html" ||
                selected.format === "markdown") && (
                <button
                  type="button"
                  disabled={locked || uncertain}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Driveの原本から本文を再生成して置き換えますか？失敗・取消時は現在の本文を保持します。",
                      )
                    )
                      return;
                    const commandId = crypto.randomUUID();
                    command.current = commandId;
                    mutate(
                      () =>
                        requestDriveMachineFn({
                          data: {
                            noteId,
                            noteVersion,
                            recordId,
                            commandId,
                            confirmed: true,
                          },
                        }),
                      true,
                    );
                  }}
                >
                  機械変換で本文を置き換える
                </button>
              )}
              <button
                type="button"
                disabled={locked || uncertain}
                onClick={() => setAi(!ai)}
              >
                AIで再生成の設定
              </button>
            </div>
          )}
          {ai && available && (
            <LlmNoteAction
              key={recordId}
              noteId={noteId}
              noteVersion={noteVersion}
              recordId={recordId}
            />
          )}
        </>
      )}
      {job && (
        <div role="status">
          <p>
            {phases[job.phase]} /{" "}
            {job.outcome === "succeeded"
              ? "本文を置き換えました"
              : job.outcome === "failed"
                ? "取得または変換に失敗しました。現在の本文を保持しています。取得元と連携を確認してから開始し直してください。"
                : job.outcome === "cancelled"
                  ? "取消済み。現在の本文を保持しています。"
                  : "処理中"}
          </p>
          {job.failure === "REGENERATION_SOURCE_INVALID" && (
            <p>
              原本が移動・削除されたか、記録した利用者の連携が変わりました。現在のDrive原本と連携を確認してください。自動で別の原本へ切り替えません。
            </p>
          )}
          {job.ownershipUnconfirmed && (
            <p>実処理の終了を確認中です。新しい再生成は開始できません。</p>
          )}
          {job.phase !== "terminal" && (
            <button
              type="button"
              disabled={pending || job.cancelRequested}
              onClick={() =>
                mutate(() => cancelMachineFn({ data: { id: job.id } }))
              }
            >
              再生成を取り消す
            </button>
          )}
          {job.undoAvailable && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  window.confirm(
                    "再生成直前の本文に戻しますか？題名・タグ・共有設定は維持します。",
                  )
                )
                  mutate(() => undoMachineFn({ data: { id: job.id } }));
              }}
            >
              再生成前の本文に戻す
            </button>
          )}
        </div>
      )}
    </section>
  );
}
