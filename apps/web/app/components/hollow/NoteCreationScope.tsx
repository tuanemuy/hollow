"use client";

import type { WorkspaceView } from "@repo/core/application/workspace/usecases";
import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { listWorkspacesFn } from "@/presentation/hollowWorkspace";

export function NoteCreationScope({
  value,
  disabled,
  onChange,
  onBusy,
}: {
  value?: string | undefined;
  disabled: boolean;
  onChange: (workspaceId: string | undefined) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void listWorkspacesFn({ data: {} })
      .then((page) => {
        if (!mounted.current) return;
        setWorkspaces(page.items.filter((item) => item.role !== "viewer"));
        setCursor(page.nextCursor);
      })
      .catch((cause: unknown) => {
        if (mounted.current) setError(displayError(cause));
      })
      .finally(() => {
        if (mounted.current) setReading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <section aria-label="新規ノートの保存先">
      <label htmlFor="note-creation-scope">保存先</label>
      <select
        id="note-creation-scope"
        value={value ?? ""}
        disabled={disabled || pending || reading}
        onChange={(event) => {
          const next = event.target.value || undefined;
          if (next === value) return;
          onBusy(true);
          start(async () => {
            setError("");
            try {
              await onChange(next);
            } catch (cause) {
              if (mounted.current) setError(displayError(cause));
            } finally {
              if (mounted.current) onBusy(false);
            }
          });
        }}
      >
        <option value="">個人</option>
        {value && !workspaces.some((item) => item.id === value) && (
          <option value={value}>現在のワークスペース</option>
        )}
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      {(reading || pending) && <p role="status">保存先を確認中…</p>}
      {cursor && (
        <button
          type="button"
          disabled={reading || pending || disabled}
          onClick={() => {
            setReading(true);
            void listWorkspacesFn({ data: { cursor } })
              .then((page) => {
                if (!mounted.current) return;
                setWorkspaces((current) => [
                  ...current,
                  ...page.items.filter((item) => item.role !== "viewer"),
                ]);
                setCursor(page.nextCursor);
                setError("");
              })
              .catch((cause: unknown) => {
                if (mounted.current) setError(displayError(cause));
              })
              .finally(() => {
                if (mounted.current) setReading(false);
              });
          }}
        >
          ほかのワークスペースを表示
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="hollow-help">
        個人または編集できるワークスペースを選べます。保存後はノート詳細の「移動」で変更します。
      </p>
    </section>
  );
}
