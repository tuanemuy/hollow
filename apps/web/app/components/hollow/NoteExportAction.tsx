"use client";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { z } from "zod";
import { NotePdfAction } from "../pdf/NotePdfAction";
import { useSharingActor } from "./SharingActorProvider";

const receiptSchema = z.object({
  operationId: z.uuid(),
  noteId: z.uuid(),
  actorId: z.uuid(),
  filename: z.string(),
  bytes: z.number().int().nonnegative(),
  downloadPath: z.string(),
  expiresAt: z.string(),
  notices: z.array(z.string()),
});
type State =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "unknown" }
  | { kind: "error"; message: string }
  | { kind: "started"; notices: readonly string[] };
export function NoteExportAction({
  noteId,
  actorId,
  editing = false,
}: {
  noteId: string;
  actorId: string;
  editing?: boolean;
}) {
  const actor = useSharingActor();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const identity = JSON.stringify([
    actor?.actor?.id,
    actor?.actor?.epoch,
    noteId,
    pathname,
  ]);
  return actor?.actor?.id === actorId ? (
    <ExportSession
      key={identity}
      identity={identity}
      noteId={noteId}
      actorId={actorId}
      editing={editing}
    />
  ) : null;
}
function ExportSession({
  identity,
  noteId,
  actorId,
  editing,
}: {
  identity: string;
  noteId: string;
  actorId: string;
  editing: boolean;
}) {
  const session = useSharingActor();
  const epoch = session?.actor?.epoch;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentIdentity = JSON.stringify([
    session?.actor?.id,
    session?.actor?.epoch,
    noteId,
    pathname,
  ]);
  const current = useRef(currentIdentity);
  current.current = currentIdentity;
  const mounted = useRef(true);
  const serial = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [, startTransition] = useTransition();
  const live = () =>
    mounted.current &&
    current.current === identity &&
    session?.currentActor()?.id === actorId &&
    session?.currentActor()?.epoch === epoch;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      serial.current++;
      controller.current?.abort();
    };
  }, []);
  const prepare = (format: "html" | "markdown") => {
    if (!live() || state.kind === "preparing") return;
    const token = ++serial.current;
    const request = new AbortController();
    controller.current = request;
    setState({ kind: "preparing" });
    startTransition(async () => {
      try {
        const response = await fetch(`/api/notes/${noteId}/exports`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
          signal: request.signal,
        });
        const data: unknown = await response.json();
        if (!live() || token !== serial.current) return;
        if (!response.ok) {
          const error = z
            .object({ error: z.object({ message: z.string() }) })
            .safeParse(data);
          setState({
            kind: "error",
            message: error.success
              ? error.data.error.message
              : "書き出せませんでした。現在の権限と内容を確認してください。",
          });
          return;
        }
        const receipt = receiptSchema.parse(data);
        if (
          receipt.noteId !== noteId ||
          receipt.actorId !== actorId ||
          receipt.downloadPath !==
            `/api/notes/${noteId}/exports/${receipt.operationId}`
        )
          throw new Error("Export receipt mismatch");
        if (!live() || token !== serial.current) return;
        const anchor = document.createElement("a");
        anchor.href = receipt.downloadPath;
        anchor.download = receipt.filename;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        try {
          if (live() && token === serial.current) anchor.click();
        } finally {
          anchor.remove();
        }
        setState({ kind: "started", notices: receipt.notices });
      } catch {
        if (live() && token === serial.current) setState({ kind: "unknown" });
      } finally {
        if (live() && token === serial.current) controller.current = null;
      }
    });
  };
  const cancel = () => {
    if (!live()) return;
    serial.current++;
    controller.current?.abort();
    controller.current = null;
    setState({ kind: "idle" });
  };
  if (!live()) return null;
  return (
    <section aria-label="ノートの書き出し" className="hollow-export">
      <h2>書き出し</h2>
      <NotePdfAction noteId={noteId} actorId={actorId} editing={editing} />
      <p>
        {editing
          ? "未保存の入力はそのまま残し、最後に保存された現在の本文を書き出します。"
          : "保存済みの現在の本文を単一ファイルに書き出します。"}
      </p>
      {(state.kind === "idle" || state.kind === "error") && (
        <>
          <button type="button" onClick={() => prepare("html")}>
            HTMLを書き出す
          </button>{" "}
          <button type="button" onClick={() => prepare("markdown")}>
            Markdownを書き出す
          </button>
        </>
      )}
      {state.kind === "preparing" && (
        <p role="status">
          ファイルを準備しています…{" "}
          <button type="button" onClick={cancel}>
            中止
          </button>
        </p>
      )}
      {state.kind === "error" && <p role="alert">{state.message}</p>}
      {state.kind === "unknown" && (
        <div role="alert">
          <p>
            応答を確認できませんでした。元の操作の完了は不明です。自動では再送しません。準備済みの一時ファイルは受付から2分で回収対象になります。
          </p>
          <button type="button" onClick={() => setState({ kind: "idle" })}>
            確認して新しい操作へ戻る
          </button>
        </div>
      )}
      {state.kind === "started" && (
        <div>
          <p role="status">
            ブラウザーにダウンロードを要求しました。保存完了・失敗はブラウザーで確認してください。失敗時は現在の内容を確認してやり直せます。{" "}
            <button type="button" onClick={() => setState({ kind: "idle" })}>
              別の形式を書き出す
            </button>
          </p>
          <ul>
            {state.notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
