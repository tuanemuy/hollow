"use client";
import type {
  DriveReceiptLookup,
  getDriveSettings,
} from "@repo/core/application/integration/drive/read";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { DRIVE_PICKER_PATH } from "@/presentation/driveDocument";
import {
  beginDriveFn,
  createDriveFolderFn,
  driveReceiptFn,
  driveSettingsFn,
  setDriveAutoBackupFn,
  unlinkDriveFn,
} from "@/presentation/driveServerFn";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import { DriveReceiptPanel, type DriveReceiptView } from "./DriveResult";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type Settings = Awaited<ReturnType<typeof getDriveSettings>>;
type ReadRequest = {
  current(): boolean;
  work(): Promise<void>;
  resolve(): void;
  reject(cause: unknown): void;
};
export function DriveSettings({
  initialLookup = null,
}: {
  initialLookup?: DriveReceiptLookup | null;
}) {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const flight = useRef(false);
  const locatorKey = initialLookup
    ? `${initialLookup.kind}:${initialLookup.by}:${initialLookup.by === "id" ? initialLookup.id : initialLookup.commandId}`
    : "none";
  const scope = useRef({ locatorKey });
  const lookup = useRef<DriveReceiptLookup | null>(initialLookup);
  if (scope.current.locatorKey !== locatorKey) {
    scope.current = { locatorKey };
    lookup.current = initialLookup;
    flight.current = false;
  }
  const expectedScope = scope.current;
  const readRevision = useRef(0);
  const reading = useRef<{ running: boolean; queued: ReadRequest | null }>({
    running: false,
    queued: null,
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [result, setResult] = useState<{
    scope: typeof expectedScope;
    current: () => boolean;
    receipt: DriveReceiptView | null;
  } | null>(null);
  const [chooseAccount, setChooseAccount] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const busy = pending;
  const receipt =
    result?.scope === expectedScope && result.current() ? result.receipt : null;
  const issue = useCallback(() => {
    const actor = ticket();
    return () => scope.current === expectedScope && actor();
  }, [expectedScope, ticket]);
  const readOnce = useCallback(
    async (current: () => boolean) => {
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
        setResult(null);
        const row = await driveReceiptFn({ data: expected });
        if (
          current() &&
          revision === readRevision.current &&
          lookup.current === expected
        )
          setResult({ scope: expectedScope, current, receipt: row });
      }
    },
    [expectedScope],
  );
  const read = useCallback(
    (current: () => boolean) =>
      new Promise<void>((resolve, reject) => {
        const run = async (request: ReadRequest) => {
          reading.current.running = true;
          try {
            if (request.current()) await request.work();
          } catch (cause) {
            request.reject(cause);
          } finally {
            request.resolve();
            reading.current.running = false;
            const queued = reading.current.queued;
            reading.current.queued = null;
            if (queued) void run(queued);
          }
        };
        const request = {
          current,
          work: () => readOnce(current),
          resolve,
          reject,
        };
        if (reading.current.running) {
          reading.current.queued?.resolve();
          reading.current.queued = request;
        } else void run(request);
      }),
    [readOnce],
  );
  const refresh = useCallback(() => {
    if (scope.current !== expectedScope || flight.current) return;
    flight.current = true;
    const current = issue();
    startTransition(async () => {
      try {
        await read(current);
        if (current()) setError("");
      } catch {
        if (current())
          setError("状態を確認できません。結果を照会してください。");
      } finally {
        if (scope.current === expectedScope) flight.current = false;
      }
    });
  }, [expectedScope, issue, read]);
  useEffect(() => {
    const current = issue();
    flight.current = true;
    startTransition(async () => {
      try {
        await bootstrapAuthenticationFn();
        if (current()) await read(current);
      } catch {
        if (current())
          setError("認証状態を確認できません。設定画面を開き直してください。");
      } finally {
        if (scope.current === expectedScope) flight.current = false;
      }
    });
    const clear = () => {
      scope.current = { locatorKey };
      lookup.current = null;
      setSettings(null);
      setResult(null);
    };
    window.addEventListener("hollow:signed-out", clear);
    return () => {
      window.removeEventListener("hollow:signed-out", clear);
    };
  }, [expectedScope, issue, locatorKey, read]);
  useEffect(() => {
    let disposed = false;
    const href = router.state.location.href;
    const unsubscribe = router.subscribe("onResolved", () => {
      if (disposed || router.state.location.href !== href) return;
      const actor = issue();
      const current = () => !disposed && actor();
      startTransition(async () => {
        try {
          await read(current);
          if (current()) setError("");
        } catch {
          if (current())
            setError("状態を確認できません。結果を照会してください。");
        }
      });
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [issue, read, router]);
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
  function initial() {
    if (!settings) throw Error("DRIVE_UNAVAILABLE");
    return {
      commandId: crypto.randomUUID(),
      expectedEpoch: settings.epoch,
      expectedSettingsVersion: settings.settingsVersion,
    };
  }
  function run(work: (current: () => boolean) => Promise<unknown>) {
    if (scope.current !== expectedScope || flight.current) return;
    flight.current = true;
    const current = issue();
    setError("");
    startTransition(async () => {
      try {
        await work(current);
        if (current()) {
          await router.invalidate();
        }
      } catch {
        if (current())
          setError(
            "結果を確認できません。結果を照会してください。自動では再送しません。",
          );
      } finally {
        if (scope.current === expectedScope) flight.current = false;
      }
    });
  }
  function launchPicker() {
    if (
      !settings?.configured ||
      settings.state !== "linked" ||
      busy ||
      flight.current ||
      scope.current !== expectedScope
    )
      return;
    if (
      (chooseAccount || consent) &&
      !window.confirm(
        "未確定の認可設定を破棄して、保存先の選択画面へ移動しますか？",
      )
    )
      return;
    window.location.assign(DRIVE_PICKER_PATH);
  }
  return (
    <main
      className="hollow-page"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h1>Google Drive連携</h1>
      <p>
        Googleログインとは別の連携です。原本の手動・一括バックアップと、ON以降の自動バックアップの保存先を設定します。
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
            <dd>{settings.autoBackup ? "ON" : "OFF"}</dd>
          </dl>
          <section aria-label="自動原本バックアップ">
            <p>
              ON以降にアップロードが成立した原本を、ワークスペース内でもアップロードした本人のDriveへ保存します。変換結果とは独立して処理します。過去の原本は自動送信しません。
            </p>
            <p>
              OFFは今後の受付を止めます。すでに受け付けた処理は継続し、履歴から未開始分を取り消せます。
            </p>
            <button
              type="button"
              disabled={
                busy ||
                (!settings.autoBackup &&
                  (!settings.backupConfigured ||
                    settings.state !== "linked" ||
                    !settings.folder))
              }
              onClick={() =>
                run(async (current) => {
                  await bootstrapAuthenticationFn();
                  if (current())
                    await setDriveAutoBackupFn({
                      data: {
                        expectedEpoch: settings.epoch,
                        expectedSettingsVersion: settings.settingsVersion,
                        enabled: !settings.autoBackup,
                      },
                    });
                })
              }
            >
              自動バックアップを{settings.autoBackup ? "OFF" : "ON"}にする
            </button>
          </section>
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
                    `新しい連携が成功した場合にのみ旧連携を置き換えます。保存先処理 ${settings.confirmation.ids.length} 件とバックアップ ${settings.confirmation.backupImpact?.count ?? (settings.confirmation.backupIds ?? []).length} 件を取り消します。失敗時は旧連携と転送を保持します。続けますか？`,
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
          </fieldset>
          {settings.state !== "unlinked" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (busy || flight.current || scope.current !== expectedScope)
                  return;
                if (
                  !window.confirm(
                    `Hollow内のGoogle Drive連携を解除し、バックアップ ${settings.confirmation.backupImpact?.count ?? (settings.confirmation.backupIds ?? []).length} 件を取り消します。GoogleログインとDrive上のファイルは削除しません。処理の終了確認までは所有を保持します。続けますか？`,
                  )
                )
                  return;
                const input = initial();
                lookup.current = {
                  by: "command",
                  kind: "control",
                  commandId: input.commandId,
                };
                run(() =>
                  unlinkDriveFn({
                    data: { ...input, confirmation: settings.confirmation },
                  }),
                );
              }}
            >
              Google Drive連携を解除
            </button>
          )}
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
          {settings.live.length > 0 && (
            <ul aria-label="このブラウザの進行中のDrive操作">
              {settings.live.map((operation, index) => (
                <li key={`${operation.kind}:${operation.id}`}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (flight.current || scope.current !== expectedScope)
                        return;
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
              onRun={(work) => {
                if (result?.scope === expectedScope && result.current())
                  run(work);
              }}
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
