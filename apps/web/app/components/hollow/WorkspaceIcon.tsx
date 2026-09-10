"use client";

import type { WorkspaceSettingsView } from "@repo/core/application/workspace/invitationViews";
import { useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { beginWorkspaceIconFn } from "@/presentation/hollowIcons";

export function workspaceIconUrl(workspaceId: string, iconId: string) {
  return `/api/workspace-icons/${workspaceId}/${iconId}`;
}
export function WorkspaceIcon({ initial }: { initial: WorkspaceSettingsView }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [working, indicate] = useOptimistic(
    false,
    (_old, next: boolean) => next,
  );
  const busy = useRef(false);
  const generation = useRef(0);
  const field = useRef<HTMLInputElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A different workspace owns a different upload operation.
  useEffect(() => {
    busy.current = false;
    setFile(null);
    setError("");
    setMessage("");
    return () => {
      generation.current++;
    };
  }, [initial.id]);
  const submit = () => {
    if (!file || busy.current || initial.role !== "owner") return;
    const currentFile = file;
    const ticket = ++generation.current;
    const path = router.state.location.pathname;
    const current = () =>
      ticket === generation.current && router.state.location.pathname === path;
    busy.current = true;
    start(async () => {
      indicate(true);
      setError("");
      setMessage("");
      try {
        const receipt = await beginWorkspaceIconFn({
          data: {
            workspaceId: initial.id,
            settingsVersion: initial.settingsVersion,
            bytes: currentFile.size,
            mime: currentFile.type as "image/png" | "image/jpeg" | "image/webp",
          },
        });
        if (!current()) return;
        const response = await fetch(receipt.uploadUrl, {
          method: "PUT",
          body: currentFile,
          headers: { "Content-Type": currentFile.type },
        });
        const result: unknown = await response.json();
        if (!response.ok)
          throw result && typeof result === "object" && "error" in result
            ? { serialized: result.error }
            : new Error("画像の保存結果を確認できません。");
        if (current()) {
          setFile(null);
          if (field.current) field.current.value = "";
          setMessage("アイコンを保存しました。");
        }
      } catch (cause) {
        if (current())
          setError(
            `画像の保存結果を確認できませんでした。最新の設定を確認して再試行してください。${displayError(cause)}`,
          );
      } finally {
        try {
          await router.invalidate();
        } finally {
          if (current()) busy.current = false;
        }
      }
    });
  };
  return (
    <section
      className="hollow-workspace-icon"
      aria-labelledby="workspace-icon-heading"
    >
      <h3 id="workspace-icon-heading">アイコン</h3>
      {initial.iconId ? (
        <img
          src={workspaceIconUrl(initial.id, initial.iconId)}
          alt="現在のワークスペースアイコン"
          width={64}
          height={64}
        />
      ) : (
        <p>アイコンは未設定です。</p>
      )}
      <p className="hollow-help">
        PNG・JPEG・WebP、5
        MiB以内。向きを補正し、画像の付加情報を除いた512px以内の静止WebPに変換します。アニメーションは先頭フレームを使います。
      </p>
      {initial.role === "owner" && (
        <>
          <label>
            アイコン画像を選択
            <input
              ref={field}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={pending}
              onChange={(event) => {
                const next = event.currentTarget.files?.[0] ?? null;
                setError("");
                setMessage("");
                setFile(null);
                if (!next) return;
                if (
                  next.size < 1 ||
                  next.size > 5 * 1024 ** 2 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(next.type)
                ) {
                  setError(
                    "PNG・JPEG・WebP、5 MiB以内の画像を選択してください。",
                  );
                  event.currentTarget.value = "";
                  return;
                }
                setFile(next);
              }}
            />
          </label>
          {file && (
            <p>
              {file.name}（{file.size.toLocaleString("ja-JP")} bytes）
            </p>
          )}
          <button
            type="button"
            className="hollow-button"
            disabled={!file || pending}
            onClick={submit}
          >
            {working ? "安全に変換・保存中…" : "アイコンを保存"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
    </section>
  );
}
