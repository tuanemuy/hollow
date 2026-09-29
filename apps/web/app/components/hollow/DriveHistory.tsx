"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { driveHistoryFn } from "@/presentation/driveServerFn";
import { driveFailureText } from "./DriveResult";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export function DriveHistory() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof driveHistoryFn>>>(
    [],
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const ticket = useAuthenticationOperation();
  const flight = useRef(false);
  const refresh = useCallback(() => {
    if (flight.current) return;
    flight.current = true;
    const current = ticket();
    startTransition(async () => {
      try {
        const next = await driveHistoryFn();
        if (current()) {
          setRows(next);
          setError("");
        }
      } catch {
        if (current()) setError("Drive履歴を確認できません。");
      } finally {
        flight.current = false;
      }
    });
  }, [ticket]);
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
      aria-label="Google Driveの履歴"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h2>Google Driveの履歴</h2>
      <p>
        本人の連携・保存先・解除の履歴です。直近90日から最大100件を表示します。
      </p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((row) => (
          <li key={`${row.kind}:${row.id}`}>
            {row.kind === "authorization"
              ? "連携"
              : row.kind === "disconnect"
                ? "連携解除"
                : row.kind === "folder-create"
                  ? "保存先作成"
                  : "保存先選択"}{" "}
            — {row.createdAt} —{" "}
            {row.phase === "failed"
              ? driveFailureText(row.failure)
              : row.phase === "completed"
                ? "完了"
                : "処理中・確認待ち"}
          </li>
        ))}
      </ul>
      {!rows.length && !pending && <p>表示できる履歴はありません。</p>}
      <button type="button" disabled={pending} onClick={refresh}>
        Drive履歴を再読
      </button>
      <a href="/settings/drive">Google Drive設定へ</a>
    </section>
  );
}
