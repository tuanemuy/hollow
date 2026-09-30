"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { driveBackupHistoryFn } from "@/presentation/driveBackupServerFn";
import { driveBackupFailureText } from "./DriveBackupPanel";
import { useSharingActor } from "./SharingActorProvider";
import { useAuthenticationOperation } from "./useAuthenticationOperation";
export function DriveBackupHistory() {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof driveBackupHistoryFn>>["rows"]
  >([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const ticket = useAuthenticationOperation();
  const actor = useSharingActor();
  const flight = useRef(false);
  const currentActor = actor?.currentActor;
  const refresh = useCallback(() => {
    if (flight.current) return;
    const valid = ticket();
    const expected = currentActor?.();
    flight.current = true;
    start(async () => {
      try {
        const value = await driveBackupHistoryFn();
        if (valid() && value.actor.accountId === expected?.id) {
          setRows(value.rows);
          setError("");
        }
      } catch {
        if (valid()) setError("原本バックアップ履歴を確認できません。");
      } finally {
        flight.current = false;
      }
    });
  }, [ticket, currentActor]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const clear = () => setRows([]);
    window.addEventListener("hollow:signed-out", clear);
    return () => window.removeEventListener("hollow:signed-out", clear);
  }, []);
  return (
    <section
      aria-label="原本バックアップの履歴"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h2>原本バックアップの履歴</h2>
      <p>
        本人の直近90日・最大100件を表示します。ノートに残るバックアップ記録とは別の履歴です。
      </p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {row.title} — {row.createdAt} —{" "}
            {row.state === "succeeded"
              ? "成功"
              : row.state === "failed"
                ? driveBackupFailureText(row.failure)
                : row.state === "cancelled"
                  ? "取消済み"
                  : "処理中"}{" "}
            — {row.bytes} bytes
          </li>
        ))}
      </ul>
      {!rows.length && !pending && (
        <p>表示できるバックアップ履歴はありません。</p>
      )}
      <button type="button" disabled={pending} onClick={refresh}>
        原本バックアップ履歴を再読
      </button>
    </section>
  );
}
