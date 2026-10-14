"use client";

import type { NoteConversionView } from "@repo/core/application/note/conversionView";
import type { ImportFormat } from "@repo/core/domain/import/entity";
import { Link, useRouter } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { retryImportFn } from "@/presentation/hollowImports";
import { importAiCopy, uiTerms } from "@/presentation/uiTerms";
import { scopeSearch } from "@/presentation/workspaceInput";
import { llmDocumentMessage } from "./llmDocumentMessage";
import { llmFailureMessage } from "./llmFailureMessage";

const phases: Record<
  Extract<NoteConversionView, { kind: "llm" }>["phase"],
  string
> = {
  queued: "実行待ち",
  classifying: "原本を確認中",
  preparing: "変換を準備中",
  dispatching: "本文を生成中",
  "response-ready": "生成結果を確認中",
  finalizing: "本文を保存中",
  terminal: "処理終了",
};
const blocked = {
  "read-only":
    "閲覧権限では再試行できません。編集できる利用者に確認してください。",
  "other-actor":
    "この処理を開始した利用者が再試行できます。自分の原本からの再生成は下の操作で確認できます。",
  "inactive-original":
    "別の処理が開始されています。処理履歴を確認してください。",
  edited:
    "変換後に本文が変更されています。現在の本文を確認してから原本からの再生成を利用してください。",
  unconfigured:
    "この環境では変換を実行できません。環境の管理者に確認してください。",
} as const;

export function NoteConversionStatus({
  conversion,
  workspaceId,
  sourceFormat,
}: {
  conversion: NoteConversionView;
  workspaceId: string | null;
  sourceFormat?: ImportFormat | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (
    (conversion.kind === "machine" && conversion.state === "succeeded") ||
    (conversion.kind === "llm" && conversion.outcome === "succeeded")
  )
    return null;
  return (
    <section className="hollow-message" aria-label="変換の状況">
      <h2>変換の状況</h2>
      <p role="status">
        {conversion.kind === "machine"
          ? conversion.state === "queued"
            ? "機械変換：実行待ち"
            : conversion.state === "running"
              ? "機械変換：変換中"
              : conversion.state === "failed"
                ? "機械変換：失敗"
                : "機械変換：取消済み"
          : `${uiTerms.llm}変換：${phases[conversion.phase]}`}
      </p>
      {conversion.kind === "llm" && conversion.failure && (
        <>
          <p role="alert">{llmFailureMessage(conversion.failure)}</p>
          {(conversion.failure === "LLM_MODEL_UNAVAILABLE" ||
            conversion.failure === "LLM_MODEL_INCOMPATIBLE") && (
            <Link to="/settings/openrouter">利用できるモデルを設定</Link>
          )}
        </>
      )}
      {conversion.kind === "machine" && conversion.state === "failed" && (
        <>
          {conversion.notices.length > 0 && (
            <ul>
              {conversion.notices.map((notice) => (
                <li key={`${notice.code}:${notice.location}:${notice.message}`}>
                  {notice.location}:{" "}
                  {llmDocumentMessage(notice.code) ?? notice.message}
                </li>
              ))}
            </ul>
          )}
          {sourceFormat === "audio" && conversion.canRetry ? (
            <p>
              <Link to="/notes/import" search={scopeSearch(workspaceId)}>
                {importAiCopy.retryWithAi}
              </Link>
            </p>
          ) : conversion.canRetry ? (
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError("");
                  let accepted = false;
                  try {
                    await retryImportFn({ data: { id: conversion.jobId } });
                    accepted = true;
                    await router.invalidate();
                  } catch (cause) {
                    setError(
                      `${accepted ? "再試行を受け付けました。画面を更新できませんでした。" : ""}${displayError(cause)}`,
                    );
                  }
                })
              }
            >
              {pending ? "再試行を受付中…" : "機械変換を再試行"}
            </button>
          ) : (
            <p>{blocked[conversion.retryBlocked]}</p>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <Link to="/notes/jobs" search={scopeSearch(workspaceId)}>
        処理履歴を確認
      </Link>
    </section>
  );
}
