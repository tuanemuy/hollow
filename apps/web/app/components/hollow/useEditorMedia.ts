"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  beginMediaUploadFn,
  createMediaDraftFn,
} from "@/presentation/hollowMedia";
import {
  type MediaAsset,
  mediaFileError,
  mediaUploadError,
  parseMediaUpload,
} from "./editorMedia";

type Upload = {
  id: number;
  file: File;
  alt: string;
  progress: number;
  status: "uploading" | "failed";
  error?: string | undefined;
};

export function useEditorMedia({
  noteId,
  draftId,
  workspaceId,
  canUpload = true,
  onDraft,
  onInsert,
}: {
  noteId?: string | undefined;
  draftId?: string | undefined;
  workspaceId?: string | undefined;
  canUpload?: boolean;
  onDraft: (id: string) => void;
  onInsert: (
    asset: MediaAsset,
    alt: string,
    draftId: string,
    removed: readonly string[],
  ) => void;
}) {
  const [items, setItems] = useState<Upload[]>([]);
  const [pending, startTransition] = useTransition();
  const live = useRef(new Map<number, Upload>());
  const requests = useRef(new Map<number, XMLHttpRequest>());
  const sequence = useRef(0);
  const mounted = useRef(true);
  const draftPromise = useRef<Promise<string> | null>(null);
  const callbacks = useRef({ onDraft, onInsert });
  callbacks.current = { onDraft, onInsert };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      live.current.clear();
      for (const request of requests.current.values()) request.abort();
    };
  }, []);
  function publish() {
    if (mounted.current) setItems([...live.current.values()]);
  }
  async function getDraft() {
    if (draftId) return draftId;
    if (!draftPromise.current)
      draftPromise.current = createMediaDraftFn({
        data: { noteId, ...(!noteId && workspaceId ? { workspaceId } : {}) },
      })
        .then((draft) => {
          if (mounted.current) callbacks.current.onDraft(draft.id);
          return draft.id;
        })
        .catch((error: unknown) => {
          draftPromise.current = null;
          throw error;
        });
    return draftPromise.current;
  }
  function run(item: Upload) {
    if (!canUpload) return;
    live.current.set(item.id, {
      ...item,
      status: "uploading",
      progress: 0,
      error: undefined,
    });
    publish();
    startTransition(async () => {
      try {
        const validation = mediaFileError(item.file);
        if (validation) throw new Error(validation);
        const scope = await getDraft();
        if (!live.current.has(item.id)) return;
        const { uploadId } = await beginMediaUploadFn({
          data: { draftId: scope, name: item.file.name, bytes: item.file.size },
        });
        if (!live.current.has(item.id)) return;
        const result = await new Promise<{
          asset: MediaAsset;
          removed: readonly string[];
        }>((resolve, reject) => {
          const request = new XMLHttpRequest();
          requests.current.set(item.id, request);
          request.open(
            "PUT",
            `/api/media-uploads/${encodeURIComponent(uploadId)}`,
          );
          request.timeout = 300_000;
          request.setRequestHeader("Content-Type", "application/octet-stream");
          request.upload.onprogress = (event) => {
            const current = live.current.get(item.id);
            if (current && event.lengthComputable) {
              live.current.set(item.id, {
                ...current,
                progress: Math.min(
                  99,
                  Math.round((event.loaded / event.total) * 100),
                ),
              });
              publish();
            }
          };
          request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
              let reason =
                "アップロードに失敗しました。形式・容量を確認して再試行してください。";
              try {
                reason = mediaUploadError(JSON.parse(request.responseText));
              } catch {
                /* Non-JSON infrastructure errors use the generic message. */
              }
              reject(new Error(reason));
              return;
            }
            try {
              resolve(parseMediaUpload(JSON.parse(request.responseText)));
            } catch (error) {
              reject(error);
            }
          };
          request.onerror = () =>
            reject(new Error("通信に失敗しました。再試行できます。"));
          request.ontimeout = () =>
            reject(
              new Error("アップロードが時間切れになりました。再試行できます。"),
            );
          request.onabort = () =>
            reject(new Error("アップロードを中止しました。"));
          request.send(item.file);
        });
        if (!live.current.has(item.id) || !mounted.current) return;
        callbacks.current.onInsert(
          result.asset,
          item.alt,
          scope,
          result.removed,
        );
        live.current.delete(item.id);
        publish();
      } catch (error) {
        if (live.current.has(item.id)) {
          live.current.set(item.id, {
            ...item,
            status: "failed",
            error: error instanceof Error ? error.message : displayError(error),
          });
          publish();
        }
      } finally {
        requests.current.delete(item.id);
      }
    });
  }
  function remove(id: number) {
    live.current.delete(id);
    requests.current.get(id)?.abort();
    requests.current.delete(id);
    publish();
  }
  return {
    items,
    pending,
    hasUnresolved: () => live.current.size > 0,
    add: (files: readonly File[], alt: string) => {
      for (const file of files)
        run({
          id: ++sequence.current,
          file,
          alt,
          progress: 0,
          status: "uploading",
        });
    },
    retry: (id: number) => {
      const item = live.current.get(id);
      if (item?.status === "failed") run(item);
    },
    remove,
    clear: () => {
      for (const id of live.current.keys()) remove(id);
    },
  };
}
