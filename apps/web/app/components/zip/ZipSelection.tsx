"use client";
import type { ZipPreview } from "@repo/core/application/zip/preview";
import { useEffect, useRef, useState, useTransition } from "react";
import { BatchDialog } from "../batch/BatchDialog";
import { useBatchSelection } from "../batch/BatchSelectionProvider";
import { type BatchContext, sameBatchContext } from "../batch/model";
import { zipPreviewSchema, zipRead } from "./client";
import { useZip } from "./ZipProvider";

export function ZipSelection({
  context,
  ids,
  disabled,
}: {
  context: BatchContext;
  ids: readonly string[];
  disabled: boolean;
}) {
  const zip = useZip();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled || !zip || zip.blocked || zip.pending}
        onClick={() => setOpen(true)}
      >
        ZIPでダウンロード
      </button>
      {open && (
        <Confirm
          key={JSON.stringify([context, ids])}
          context={context}
          ids={ids}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function Confirm({
  context,
  ids,
  close,
}: {
  context: BatchContext;
  ids: readonly string[];
  close: () => void;
}) {
  const selection = useBatchSelection();
  const zip = useZip();
  const [format, setFormat] = useState<"html" | "markdown">("html");
  const [preview, setPreview] = useState<ZipPreview | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const mounted = useRef(true);
  const operation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current++;
    };
  }, []);
  const current = () =>
    mounted.current && sameBatchContext(context, selection.currentContext());
  const inspect = (offset = 0) => {
    if (busy.current || !current()) return;
    busy.current = true;
    const own = ++operation.current;
    setError("");
    start(async () => {
      try {
        const result = await zipRead("/api/zip/preview", zipPreviewSchema, {
          noteIds: ids,
          format,
          offset,
        });
        if (!current() || operation.current !== own) return;
        if (
          result.actorId !== context.actorId ||
          (offset && preview?.confirmation !== result.confirmation)
        ) {
          setPreview(null);
          setError("対象が変わりました。最初から確認してください。");
          return;
        }
        setPreview(result);
      } catch (cause) {
        if (current() && operation.current === own) {
          setPreview(null);
          setError(
            cause instanceof Error ? cause.message : "対象を確認できません。",
          );
        }
      } finally {
        busy.current = false;
      }
    });
  };
  return (
    <BatchDialog
      title="ZIPでまとめてダウンロード"
      context={context}
      currentContext={selection.currentContext}
      pending={pending || !!zip?.pending}
      onClose={close}
    >
      <p>
        最大500件。各ノートの保存済みスタイルを使います。成果物は7日間取得でき、画面を閉じても作成は続きます。
      </p>
      <label>
        形式
        <select
          value={format}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "html" || value === "markdown") {
              setFormat(value);
              setPreview(null);
              operation.current++;
            }
          }}
        >
          <option value="html">HTML</option>
          <option value="markdown">Markdown</option>
          <option value="pdf" disabled>
            PDF（未提供）
          </option>
        </select>
      </label>
      <button type="button" disabled={pending} onClick={() => inspect()}>
        現在の対象を確認
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <>
          <p>
            選択{preview.selected}件、対象{preview.total}件、対象外
            {preview.excluded}
            件。本文が空、または現在閲覧できないノートは対象外です。
          </p>
          <ol>
            {preview.items.map((item) => (
              <li key={item.ordinal}>
                {item.ordinal + 1}. {item.title || "無題"}
              </li>
            ))}
          </ol>
          {preview.nextOffset !== null && (
            <button
              type="button"
              disabled={pending}
              onClick={() => inspect(preview.nextOffset ?? 0)}
            >
              次の50件を確認
            </button>
          )}
          <button
            type="button"
            disabled={
              pending || !zip || zip.blocked || zip.pending || !preview.total
            }
            onClick={() => {
              if (!current() || !zip || !preview) return;
              zip.submit(
                {
                  kind: "new",
                  input: {
                    commandId: crypto.randomUUID(),
                    noteIds: ids.slice(),
                    format,
                    confirmation: preview.confirmation,
                  },
                },
                () => {
                  if (sameBatchContext(context, selection.currentContext()))
                    selection.clear();
                },
              );
              close();
            }}
          >
            この内容でZIPを作成
          </button>
        </>
      )}
    </BatchDialog>
  );
}
