"use client";
import type {
  DriveReceiptLookup,
  getDriveSettings,
} from "@repo/core/application/integration/drive/read";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { driveReceiptFn, driveSettingsFn } from "@/presentation/driveServerFn";
import { currentUserFn } from "@/presentation/hollowAuth";
import { createDrivePickerController, type PickerNotice } from "./DrivePicker";
import { DriveReceiptPanel, type DriveReceiptView } from "./DriveResult";
import { useAuthenticationOperation } from "./useAuthenticationOperation";

type Settings = Awaited<ReturnType<typeof getDriveSettings>>;
type ReadRequest = {
  valid(): boolean;
  work(): Promise<void>;
  resolve(): void;
  reject(cause: unknown): void;
};
export function DrivePickerPage({
  enabled,
  accountId,
}: {
  enabled: boolean;
  accountId?: string;
}) {
  const router = useRouter();
  const ticket = useAuthenticationOperation();
  const life = useRef({ mounted: false, generation: 0, flight: false });
  const picker = useRef<ReturnType<typeof createDrivePickerController> | null>(
    null,
  );
  const lookup = useRef<DriveReceiptLookup | null>(null);
  const reading = useRef<{ running: boolean; queued: ReadRequest | null }>({
    running: false,
    queued: null,
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [result, setResult] = useState<{
    receipt: DriveReceiptView | null;
    current: () => boolean;
  } | null>(null);
  const [notice, setNotice] = useState<PickerNotice>({ kind: "closed" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const current = useCallback(() => {
    const generation = life.current.generation;
    const actor = ticket();
    return () =>
      enabled &&
      life.current.mounted &&
      life.current.generation === generation &&
      actor();
  }, [enabled, ticket]);
  const clear = useCallback(() => {
    life.current.generation++;
    life.current.flight = false;
    picker.current?.dispose();
    picker.current = null;
    setSettings(null);
    setResult(null);
    setNotice({ kind: "closed" });
  }, []);
  const readOnce = useCallback(
    async (valid: () => boolean) => {
      const user = await currentUserFn();
      if (!valid()) return;
      if (!user || user.id !== accountId) {
        clear();
        setError("認証状態が変わりました。Google Drive設定へ戻ってください。");
        return;
      }
      const value = await driveSettingsFn();
      if (!valid()) return;
      if (value.actor.accountId !== accountId) {
        clear();
        setError("認証状態が変わりました。Google Drive設定へ戻ってください。");
        return;
      }
      setSettings(value);
      const expected = lookup.current;
      if (expected) {
        setResult(null);
        const receipt = await driveReceiptFn({ data: expected });
        if (valid() && lookup.current === expected)
          setResult({ receipt, current: valid });
      }
    },
    [accountId, clear],
  );
  const read = useCallback(
    (valid: () => boolean) =>
      new Promise<void>((resolve, reject) => {
        const run = async (request: ReadRequest) => {
          reading.current.running = true;
          try {
            if (request.valid()) await request.work();
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
        const request = { valid, work: () => readOnce(valid), resolve, reject };
        if (reading.current.running) {
          reading.current.queued?.resolve();
          reading.current.queued = request;
        } else void run(request);
      }),
    [readOnce],
  );
  const refresh = useCallback(() => {
    if (
      !enabled ||
      life.current.flight ||
      picker.current ||
      !life.current.mounted
    )
      return;
    life.current.flight = true;
    const valid = current();
    const generation = life.current.generation;
    startTransition(async () => {
      try {
        await read(valid);
        if (valid()) setError("");
      } catch {
        if (valid()) setError("状態を確認できません。結果を照会してください。");
      } finally {
        if (life.current.generation === generation) life.current.flight = false;
      }
    });
  }, [current, enabled, read]);
  useEffect(() => {
    life.current.mounted = true;
    refresh();
    const hide = () => clear();
    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) {
        clear();
        refresh();
      }
    };
    const leave = router.subscribe("onBeforeNavigate", hide);
    const href = router.state.location.href;
    const resolved = router.subscribe("onResolved", () => {
      if (life.current.mounted && router.state.location.href === href)
        refresh();
    });
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", resume);
    window.addEventListener("hollow:signed-out", hide);
    return () => {
      life.current.mounted = false;
      clear();
      leave();
      resolved();
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("hollow:signed-out", hide);
    };
  }, [clear, refresh, router]);
  const receipt = result?.current() ? result.receipt : null;
  const busy = pending || notice.kind === "opening" || notice.kind === "open";
  const returnHref =
    lookup.current?.kind === "control"
      ? `/settings/drive?${lookup.current.by === "id" ? `controlId=${lookup.current.id}` : `controlCommand=${lookup.current.commandId}`}`
      : "/settings/drive";
  function open() {
    if (
      !enabled ||
      !settings?.configured ||
      settings.state !== "linked" ||
      busy ||
      life.current.flight ||
      picker.current
    )
      return;
    const valid = current();
    if (!valid()) return;
    const input = {
      commandId: crypto.randomUUID(),
      expectedEpoch: settings.epoch,
      expectedSettingsVersion: settings.settingsVersion,
    };
    lookup.current = {
      by: "command",
      kind: "control",
      commandId: input.commandId,
    };
    setResult(null);
    setError("");
    const controller = createDrivePickerController({
      current: valid,
      notice: (next) => {
        if (!valid()) return;
        setNotice(next);
        if (["closed", "failed", "unknown"].includes(next.kind))
          picker.current = null;
      },
      receipt: (value) => {
        if (!valid()) return;
        lookup.current = value.id
          ? { by: "id", kind: "control", id: value.id }
          : { by: "command", kind: "control", commandId: value.commandId };
        setResult(null);
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
      <h1>Google Driveの保存先を選択</h1>
      {!enabled ? (
        <p role="alert">
          この文書では選択画面を利用できません。Google
          Drive設定から開き直してください。
        </p>
      ) : (
        <>
          <p>
            選択のためGoogleのアクセストークンをこのブラウザに一時的に渡します。以前許可した権限を含む場合があります。
          </p>
          <p>
            選択受付の期限はHollow側の期限です。Googleアクセストークンの期限とは異なり、5分への短縮や権限の縮小を保証しません。画面を閉じてもGoogle側で直ちに失効するとは限りません。
          </p>
          <p>
            選択しただけでは保存先は確定しません。サーバーで現在の連携・権限・ゴミ箱状態を確認した後、表示された保存先を確認してください。
          </p>
          {!settings ? (
            <p role="status">連携状態を確認しています。</p>
          ) : !settings.configured || settings.state !== "linked" ? (
            <p>
              連携を利用できません。Google
              Drive設定で現在の状態を確認してください。
            </p>
          ) : (
            <button type="button" disabled={busy} onClick={open}>
              説明を確認してGoogle Pickerを開く
            </button>
          )}
          {notice.kind === "open" && (
            <p role="status">
              選択受付の期限: {notice.pickerExpiresAt}
              。Googleアクセストークンの期限: {notice.accessExpiresAt}
              。二つの期限は異なります。
            </p>
          )}
          {(notice.kind === "unknown" || notice.kind === "failed") && (
            <p role="alert">
              選択画面の結果を確認できません。結果を照会し、必要なら現在の処理を取り消して選び直してください。自動では再送しません。
            </p>
          )}
          {(notice.kind === "open" || notice.kind === "opening") && (
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
          <button type="button" disabled={busy} onClick={refresh}>
            結果を確認
          </button>
          {receipt && (
            <DriveReceiptPanel
              receipt={receipt}
              pending={busy || !settings?.configured}
              onRefresh={refresh}
              onRun={(work) => {
                if (busy || life.current.flight || !result?.current()) return;
                life.current.flight = true;
                const valid = current();
                const generation = life.current.generation;
                startTransition(async () => {
                  try {
                    await work();
                    if (valid()) {
                      await router.invalidate();
                    }
                  } catch {
                    if (valid())
                      setError(
                        "結果を確認できません。結果を照会してください。自動では再送しません。",
                      );
                  } finally {
                    if (life.current.generation === generation)
                      life.current.flight = false;
                  }
                });
              }}
            />
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <a href={returnHref} onClick={() => clear()}>
        Google Drive設定へ戻る
      </a>
    </main>
  );
}
