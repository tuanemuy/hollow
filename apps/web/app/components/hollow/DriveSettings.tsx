"use client";
import type {
  DriveReceiptLookup,
  getDriveSettings,
} from "@repo/core/application/integration/drive/read";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  beginDriveFn,
  createDriveFolderFn,
  driveReceiptFn,
  driveSettingsFn,
  unlinkDriveFn,
} from "@/presentation/driveServerFn";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import { createDrivePickerController, type PickerNotice } from "./DrivePicker";
import { DriveReceiptPanel, type DriveReceiptView } from "./DriveResult";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type Settings = Awaited<ReturnType<typeof getDriveSettings>>;
export function DriveSettings() {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const flight = useRef(false);
  const mounted = useRef(false);
  const picker = useRef<ReturnType<typeof createDrivePickerController> | null>(
    null,
  );
  const lookup = useRef<DriveReceiptLookup | null>(null);
  const readRevision = useRef(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [receipt, setReceipt] = useState<DriveReceiptView | null>(null);
  const [chooseAccount, setChooseAccount] = useState(false);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState<PickerNotice>({ kind: "closed" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const pickerOpen = notice.kind === "open" || notice.kind === "opening";
  const busy = pending || pickerOpen;
  const read = useCallback(async (current: () => boolean) => {
    const revision = ++readRevision.current;
    const value = await driveSettingsFn();
    if (!current() || revision !== readRevision.current) return;
    setSettings(value);
    if (!lookup.current && value.live[0])
      lookup.current = {
        by: "id",
        kind: value.live[0].kind,
        id: value.live[0].id,
      };
    if (lookup.current) {
      const expected = lookup.current;
      const row = await driveReceiptFn({ data: expected });
      if (
        current() &&
        revision === readRevision.current &&
        lookup.current === expected
      )
        setReceipt(row);
    }
  }, []);
  const refresh = useCallback(() => {
    if (flight.current || picker.current) return;
    flight.current = true;
    const current = ticket();
    startTransition(async () => {
      try {
        await read(current);
        if (current()) setError("");
      } catch {
        if (current())
          setError("状態を確認できません。結果を照会してください。");
      } finally {
        flight.current = false;
      }
    });
  }, [read, ticket]);
  useEffect(() => {
    mounted.current = true;
    const current = ticket();
    flight.current = true;
    startTransition(async () => {
      try {
        await bootstrapAuthenticationFn();
        if (current()) await read(current);
      } catch {
        if (current())
          setError("認証状態を確認できません。設定画面を開き直してください。");
      } finally {
        flight.current = false;
      }
    });
    const clear = () => {
      picker.current?.dispose();
      picker.current = null;
      lookup.current = null;
      setSettings(null);
      setReceipt(null);
    };
    window.addEventListener("hollow:signed-out", clear);
    return () => {
      mounted.current = false;
      picker.current?.dispose();
      picker.current = null;
      window.removeEventListener("hollow:signed-out", clear);
    };
  }, [read, ticket]);
  const receiptId = receipt?.id;
  const receiptPhase = receipt?.phase;
  useEffect(() => {
    if (
      !receiptId ||
      !receiptPhase ||
      ["completed", "failed"].includes(receiptPhase) ||
      pickerOpen
    )
      return;
    let count = 0;
    const timer = setInterval(() => {
      if (++count <= 30) refresh();
      else clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [receiptId, receiptPhase, pickerOpen, refresh]);
  function initial() {
    if (!settings) throw Error("DRIVE_UNAVAILABLE");
    return {
      commandId: crypto.randomUUID(),
      expectedEpoch: settings.epoch,
      expectedSettingsVersion: settings.settingsVersion,
    };
  }
  function run(work: (current: () => boolean) => Promise<unknown>) {
    if (flight.current || picker.current) return;
    flight.current = true;
    const current = ticket();
    setError("");
    startTransition(async () => {
      try {
        await work(current);
        if (current()) {
          await router.invalidate();
          if (current()) await read(current);
        }
      } catch {
        if (current())
          setError(
            "結果を確認できません。結果を照会してください。自動では再送しません。",
          );
      } finally {
        flight.current = false;
      }
    });
  }
  function launchPicker() {
    if (!settings || flight.current || picker.current) return;
    const input = initial();
    lookup.current = {
      by: "command",
      kind: "control",
      commandId: input.commandId,
    };
    const current = ticket();
    setError("");
    const controller = createDrivePickerController({
      current: () => mounted.current && current(),
      notice: (next) => {
        if (!current()) return;
        setNotice(next);
        if (["closed", "unknown", "failed"].includes(next.kind))
          picker.current = null;
      },
      receipt: (value) => {
        if (!current()) return;
        lookup.current = value.id
          ? { by: "id", kind: "control", id: value.id }
          : { by: "command", kind: "control", commandId: value.commandId };
        void read(current).catch(() => {
          if (current())
            setError("結果を確認できません。結果を照会してください。");
        });
      },
    });
    picker.current = controller;
    startTransition(async () => {
      await controller.open(input);
    });
  }
  return (
    <main
      className="hollow-page"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h1>Google Drive連携</h1>
      <p>
        Googleログインとは別の連携です。自動バックアップはOFFで、原本の転送はまだ利用できません。
      </p>
      {error && <p role="alert">{error}</p>}
      {!settings ? (
        <p role="status">連携状態を確認しています。</p>
      ) : (
        <>
          {!settings.configured && (
            <p>
              この環境ではGoogle
              Drive連携を利用できません。以下は保存済みの状態です。
            </p>
          )}
          <dl>
            <dt>状態</dt>
            <dd>
              {settings.state === "linked"
                ? "連携済み"
                : settings.state === "needs-relink"
                  ? "再連携が必要"
                  : "未連携"}
            </dd>
            {settings.account && (
              <>
                {settings.account.email && (
                  <>
                    <dt>アカウント</dt>
                    <dd>{settings.account.email}</dd>
                  </>
                )}
                <dt>連携日時</dt>
                <dd>{settings.account.connectedAt}</dd>
              </>
            )}
            <dt>最終利用（保存先の確認・作成）</dt>
            <dd>{settings.lastUsedAt ?? "未使用"}</dd>
            <dt>保存先</dt>
            <dd>{settings.folder?.name ?? "未設定"}</dd>
            {settings.folder && (
              <>
                <dt>保存先の最終確認</dt>
                <dd>{settings.folder.checkedAt}</dd>
              </>
            )}
            <dt>自動バックアップ</dt>
            <dd>OFF</dd>
          </dl>
          <fieldset disabled={busy || !settings.configured}>
            <legend>Google Driveの認可</legend>
            <label>
              <input
                type="checkbox"
                checked={chooseAccount}
                onChange={(e) => setChooseAccount(e.currentTarget.checked)}
              />
              別のGoogleアカウントを使う
            </label>
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.currentTarget.checked)}
              />
              継続利用の権限へ改めて同意する
            </label>
            <button
              type="button"
              onClick={() => {
                if (
                  settings.state !== "unlinked" &&
                  !window.confirm(
                    `新しい連携が成功した場合にのみ旧連携を置き換えます。対象の保存先処理 ${settings.confirmation.ids.length} 件を取り消します。失敗時は旧連携を保持します。続けますか？`,
                  )
                )
                  return;
                const input = initial();
                lookup.current = {
                  by: "command",
                  kind: "authorization",
                  commandId: input.commandId,
                };
                run(async (current) => {
                  const value = await beginDriveFn({
                    data: {
                      ...input,
                      confirmation: settings.confirmation,
                      consent,
                      chooseAccount,
                    },
                  });
                  if (current() && value.url) {
                    const url = new URL(value.url);
                    if (
                      url.origin !== "https://accounts.google.com" ||
                      url.pathname !== "/o/oauth2/v2/auth"
                    )
                      throw Error("DRIVE_AUTHORIZATION");
                    window.location.assign(url.href);
                  }
                });
              }}
            >
              {settings.state === "unlinked"
                ? "Google Driveと連携"
                : "Google Driveに再連携"}
            </button>
            {settings.state !== "unlinked" && (
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Google Drive連携を解除します。GoogleログインとDrive上のファイルは削除しません。処理の終了確認までは所有を保持します。続けますか？",
                    )
                  )
                    return;
                  const input = initial();
                  lookup.current = {
                    by: "command",
                    kind: "control",
                    commandId: input.commandId,
                  };
                  run(() => unlinkDriveFn({ data: input }));
                }}
              >
                Google Drive連携を解除
              </button>
            )}
          </fieldset>
          <fieldset
            disabled={
              busy || !settings.configured || settings.state !== "linked"
            }
          >
            <legend>保存先</legend>
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Google Driveのマイドライブ直下に、新しい保存先を作成しますか？",
                  )
                )
                  return;
                const input = initial();
                lookup.current = {
                  by: "command",
                  kind: "control",
                  commandId: input.commandId,
                };
                run(() => createDriveFolderFn({ data: input }));
              }}
            >
              新しい保存先を作成
            </button>
            <p>
              選択のためGoogleのアクセストークンをこのブラウザに一時的に渡します。以前許可した権限を含む場合があります。画面を閉じてもGoogle側で直ちに失効するとは限りません。
            </p>
            <button type="button" onClick={launchPicker}>
              説明を確認して保存先を選ぶ
            </button>
            <p>
              ゴミ箱の保存先は自動再作成しません。Google
              Driveで復元後、ここから選び直してください。見つからない場合は、アクセス権を確認するか別の保存先を選択・作成してください。
            </p>
          </fieldset>
          {notice.kind === "open" && (
            <p role="status">
              選択受付の期限: {notice.pickerExpiresAt}
              。Googleアクセストークンの期限: {notice.accessExpiresAt}
              。二つの期限は異なります。
            </p>
          )}
          {(notice.kind === "unknown" || notice.kind === "failed") && (
            <p role="alert">
              選択画面の結果を確認できません。結果を確認し、必要なら現在の処理を取り消して選び直してください。
            </p>
          )}
          {pickerOpen && (
            <button
              type="button"
              onClick={() => {
                picker.current?.dispose();
                picker.current = null;
                setNotice({ kind: "closed" });
              }}
            >
              選択画面を閉じる
            </button>
          )}
          {settings.live.length > 0 && (
            <ul aria-label="このブラウザの進行中のDrive操作">
              {settings.live.map((operation, index) => (
                <li key={`${operation.kind}:${operation.id}`}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (flight.current || picker.current) return;
                      lookup.current = {
                        by: "id",
                        kind: operation.kind,
                        id: operation.id,
                      };
                      refresh();
                    }}
                  >
                    {operation.kind === "authorization"
                      ? "連携"
                      : "保存先・解除"}
                    の処理 {index + 1} を確認
                  </button>
                </li>
              ))}
            </ul>
          )}
          {receipt && (
            <DriveReceiptPanel
              receipt={receipt}
              pending={busy || !settings.configured}
              onRun={run}
              onRefresh={refresh}
            />
          )}
          <button type="button" disabled={busy} onClick={refresh}>
            連携状態を再読
          </button>
        </>
      )}
      <a href="/notes/jobs">処理履歴へ</a>
    </main>
  );
}
