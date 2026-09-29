"use client";
import type { getDriveReceipt } from "@repo/core/application/integration/drive/read";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  cancelDriveFn,
  continueDriveFolderFn,
  driveReceiptFn,
} from "@/presentation/driveServerFn";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

export type DriveReceiptView = NonNullable<
  Awaited<ReturnType<typeof getDriveReceipt>>
>;
export function driveFailureText(code: string | null) {
  switch (code) {
    case "DRIVE_CANCELLED":
      return "処理を取り消しました。";
    case "DRIVE_EXPIRED":
      return "操作の有効期限が切れました。現在の状態を確認してください。";
    case "DRIVE_FOLDER_TRASHED":
      return "保存先がゴミ箱にあります。Google Driveで復元してから選び直すか、別の保存先を選択・作成してください。";
    case "DRIVE_FOLDER_DENIED":
      return "保存先への書き込み権限を確認してください。";
    case "DRIVE_FOLDER_UNAVAILABLE":
      return "保存先が見つからないか、アクセスできません。削除されたとは限りません。";
    case "DRIVE_FOLDER_INVALID":
      return "この項目は保存先として利用できません。";
    case "DRIVE_RATE_LIMIT":
      return "利用回数が制限されています。時間を置いて現在の結果を確認してください。";
    case "DRIVE_SCOPE_REQUIRED":
      return "必要な権限への同意が確認できません。改めて連携してください。";
    case "DRIVE_REFRESH_REQUIRED":
      return "継続利用の認可を取得できませんでした。旧連携を保持しています。改めて同意してください。";
    case "DRIVE_CONTEXT_CHANGED":
    case "DRIVE_CONNECTION_CHANGED":
      return "連携状況が変わりました。現在の状態を確認してください。";
    case "DRIVE_EXCHANGE_UNKNOWN":
    case "DRIVE_REFRESH_UNKNOWN":
    case "DRIVE_CREATE_UNKNOWN":
      return "処理結果が不明です。結果を照会してください。自動では再送しません。";
    case "DRIVE_CREATE_CONFLICT":
      return "同じIDの保存先を確認してください。自動では別の保存先を作成しません。";
    case "DRIVE_UNVERIFIED":
    case "DRIVE_PROVIDER_REJECTED":
      return "Google Driveの認可・応答を確認できませんでした。";
    default:
      return "Google Driveを現在利用できません。現在の結果を確認してください。";
  }
}
export function DriveReceiptPanel({
  receipt,
  pending,
  onRun,
  onRefresh,
}: {
  receipt: DriveReceiptView;
  pending: boolean;
  onRun: (work: () => Promise<unknown>) => void;
  onRefresh: () => void;
}) {
  const controlled =
    receipt.current && (receipt.owner === "closed" || receipt.owner === "none");
  const confirmTarget =
    receipt.target?.targetId ?? receipt.creation?.confirmation?.parentId;
  const name =
    receipt.target?.targetName ?? receipt.creation?.confirmation?.targetName;
  return (
    <section
      aria-label="Drive処理結果"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <p role="status">
        {receipt.phase === "completed"
          ? "処理が完了しました。"
          : receipt.phase === "failed"
            ? driveFailureText(receipt.failure)
            : receipt.phase === "candidate"
              ? "前の処理の終了を確認しています。"
              : receipt.phase === "ready"
                ? "保存先を確認してください。"
                : receipt.phase === "reconciling" || receipt.owner === "unknown"
                  ? "処理結果・終了を確認しています。自動では再送しません。"
                  : receipt.phase === "awaiting-selection"
                    ? "保存先の選択待ちです。画面を閉じた場合は取り消して選び直してください。"
                    : "処理中です。"}
      </p>
      {!receipt.current && (
        <p>
          現在の操作条件と一致しません。設定画面で現在の状態を確認してください。
        </p>
      )}
      {receipt.phase === "ready" && confirmTarget && (
        <>
          <p>保存先名: {name ?? "名称未確認"}</p>
          {receipt.target && (
            <p>
              選択元ID: {receipt.target.sourceId}
              <br />
              保存先ID: {receipt.target.targetId}
            </p>
          )}
          {receipt.creation?.confirmation && (
            <p>
              作成ID: {receipt.creation.confirmation.fileId}
              <br />
              親ID: {receipt.creation.confirmation.parentId}
            </p>
          )}
          <button
            type="button"
            disabled={pending || !controlled}
            onClick={() => {
              if (
                !window.confirm(
                  `この保存先を利用しますか？\n${name ?? "名称未確認"}\n対象: ${confirmTarget}`,
                )
              )
                return;
              onRun(() =>
                continueDriveFolderFn({
                  data: {
                    id: receipt.id,
                    expectedVersion: receipt.version,
                    phase: "ready",
                    action: "confirm",
                    targetId: confirmTarget,
                    ...(receipt.creation
                      ? { sends: receipt.creation.sends }
                      : {}),
                  },
                }),
              );
            }}
          >
            この保存先を利用する
          </button>
        </>
      )}
      {receipt.phase === "reconciling" && receipt.creation && (
        <button
          type="button"
          disabled={pending || !controlled}
          onClick={() => {
            const creation = receipt.creation;
            if (creation)
              onRun(() =>
                continueDriveFolderFn({
                  data: {
                    id: receipt.id,
                    expectedVersion: receipt.version,
                    phase: "reconciling",
                    action: "inspect",
                    sends: creation.sends,
                  },
                }),
              );
          }}
        >
          Google上の作成結果を照会する
        </button>
      )}
      {receipt.creation?.canResend && (
        <button
          type="button"
          disabled={pending || !controlled}
          onClick={() => {
            if (
              !window.confirm(
                "結果が確認できないため、同じ保存先IDで作成をもう一度送信します。新しいIDは作りません。続けますか？",
              )
            )
              return;
            onRun(() =>
              continueDriveFolderFn({
                data: {
                  id: receipt.id,
                  expectedVersion: receipt.version,
                  phase: "reconciling",
                  action: "resend",
                  sends: 1,
                },
              }),
            );
          }}
        >
          同じ保存先IDで作成をもう一度試す
        </button>
      )}
      <button type="button" disabled={pending} onClick={onRefresh}>
        結果を確認
      </button>
      {receipt.current && !["completed", "failed"].includes(receipt.phase) && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onRun(() =>
              cancelDriveFn({
                data: {
                  id: receipt.id,
                  expectedVersion: receipt.version,
                  kind:
                    receipt.kind === "authorization"
                      ? "authorization"
                      : "control",
                },
              }),
            )
          }
        >
          このDrive処理を取り消す
        </button>
      )}
    </section>
  );
}

export function DriveResult({ id }: { id?: string }) {
  const ticket = useAuthenticationOperation();
  const scope = useRef({ id, flight: false });
  if (scope.current.id !== id) scope.current = { id, flight: false };
  const expected = scope.current;
  const [result, setResult] = useState<{
    scope: typeof expected;
    current: () => boolean;
    receipt: DriveReceiptView | null;
  } | null>(null);
  const [failure, setFailure] = useState<{
    scope: typeof expected;
    current: () => boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    if (scope.current !== expected || expected.flight || !id) return;
    expected.flight = true;
    const actorCurrent = ticket();
    const current = () => scope.current === expected && actorCurrent();
    startTransition(async () => {
      try {
        const value = await driveReceiptFn({
          data: { by: "id", kind: "authorization", id },
        });
        if (current()) {
          setResult({ scope: expected, current, receipt: value });
          setFailure({
            scope: expected,
            current,
            message: value
              ? ""
              : "この認可操作を確認できません。元のブラウザで設定画面を開いてください。",
          });
        }
      } catch {
        if (current())
          setFailure({
            scope: expected,
            current,
            message: "結果を確認できません。結果を照会してください。",
          });
      } finally {
        expected.flight = false;
      }
    });
  }, [expected, id, ticket]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const receipt =
    result?.scope === expected && result.current() ? result.receipt : null;
  const error =
    failure?.scope === expected && failure.current() ? failure.message : "";
  const receiptId = receipt?.id;
  const receiptPhase = receipt?.phase;
  useEffect(() => {
    if (
      !receiptId ||
      !receiptPhase ||
      ["completed", "failed"].includes(receiptPhase)
    )
      return;
    let count = 0;
    const timer = setInterval(() => {
      if (++count <= 30) refresh();
      else clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [receiptId, receiptPhase, refresh]);
  return (
    <main
      className="hollow-page"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h1>Google Drive連携の結果</h1>
      {!id && (
        <p>
          認可結果を確認できません。設定画面から現在の状態を確認してください。
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {receipt && (
        <DriveReceiptPanel
          receipt={receipt}
          pending={pending}
          onRefresh={refresh}
          onRun={(work) => {
            if (
              scope.current !== expected ||
              expected.flight ||
              !result?.current()
            )
              return;
            expected.flight = true;
            const actorCurrent = ticket();
            const current = () => scope.current === expected && actorCurrent();
            startTransition(async () => {
              try {
                await work();
                if (current()) {
                  const value = await driveReceiptFn({
                    data: { by: "id", kind: "authorization", id: receipt.id },
                  });
                  if (current())
                    setResult({ scope: expected, current, receipt: value });
                }
              } catch {
                if (current())
                  setFailure({
                    scope: expected,
                    current,
                    message: "結果を確認できません。結果を照会してください。",
                  });
              } finally {
                expected.flight = false;
              }
            });
          }}
        />
      )}
      {!receipt && id && (
        <button type="button" disabled={pending} onClick={refresh}>
          結果を確認
        </button>
      )}
      <a href="/settings/drive">Google Drive設定へ</a>
    </main>
  );
}
