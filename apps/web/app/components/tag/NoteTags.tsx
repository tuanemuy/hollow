"use client";

import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import { changeNoteTagsFn } from "@/presentation/tagServerFn";
import { tagAccessLost } from "./errors";
import {
  optimisticTags,
  type TagChoice,
  type TagValue,
  tagScope,
} from "./model";
import { TagPicker } from "./TagPicker";

export function NoteTags({
  noteId,
  title,
  scope,
  tags,
}: {
  noteId: string;
  title: string;
  scope: { workspaceId: string | null; canEdit: boolean };
  tags: readonly TagValue[];
}) {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const locationMatches =
    pathname === `/notes/${noteId}` || pathname === `/notes/${noteId}/`;
  const [base, setBase] = useState(tags);
  const [visible, apply] = useOptimistic(base, optimisticTags);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<TagChoice | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [pending, start] = useTransition();
  const busy = useRef<symbol | null>(null);
  const current = useRef({
    noteId,
    location,
    workspaceId: scope.workspaceId,
    locationMatches,
  });
  current.current = {
    noteId,
    location,
    workspaceId: scope.workspaceId,
    locationMatches,
  };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setBase(tags);
    if (scope.canEdit) setAccessLost(false);
    else setOpen(false);
  }, [tags, scope.canEdit]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Navigation clears operation-local state even when the component survives.
  useEffect(() => {
    setOpen(false);
    setError("");
    setLast(null);
    setAccessLost(false);
  }, [noteId, location, scope.workspaceId]);
  const mutate = (choice: TagChoice) => {
    if (busy.current || !scope.canEdit || accessLost || !locationMatches)
      return;
    const token = Symbol("detail-tag");
    busy.current = token;
    const valid = () =>
      mounted.current &&
      current.current.locationMatches &&
      current.current.noteId === noteId &&
      current.current.location === location &&
      current.current.workspaceId === scope.workspaceId;
    start(async () => {
      setError("");
      setLast(null);
      apply(choice);
      let succeeded = false;
      try {
        const result = await changeNoteTagsFn({
          data: {
            noteId,
            expectedScope: tagScope(scope.workspaceId),
            change: choice.change,
          },
        });
        succeeded = true;
        if (valid()) setBase(result.tags);
      } catch (cause) {
        if (!valid()) return;
        setError(displayError(cause));
        if (tagAccessLost(cause)) {
          setAccessLost(true);
          setOpen(false);
        } else setLast(choice);
      } finally {
        if (valid()) {
          try {
            await router.invalidate();
          } catch (cause) {
            if (valid())
              setError(
                `${succeeded ? "タグの変更は完了しました。表示を更新できません。" : "現在の状態を読み直せません。"}${displayError(cause)}`,
              );
          }
        }
        if (busy.current === token) busy.current = null;
      }
    });
  };
  const refresh = () => {
    const target = current.current;
    void router.invalidate().catch((cause: unknown) => {
      if (
        mounted.current &&
        current.current.noteId === target.noteId &&
        current.current.location === target.location &&
        current.current.workspaceId === target.workspaceId
      )
        setError(displayError(cause));
    });
  };
  if (!locationMatches) return null;
  return (
    <section
      className="note-tags"
      aria-label="ノートのタグ"
      aria-busy={pending}
    >
      <ul className="tag-chips">
        {visible.map((tag) => (
          <li key={tag.id}>
            {tag.id.startsWith("pending:") ? (
              <span>{tag.name}（保存中）</span>
            ) : (
              <Link
                to="/notes"
                search={{ ...tagScope(scope.workspaceId), tags: [tag.id] }}
              >
                {tag.name}
              </Link>
            )}
            {scope.canEdit && !accessLost && (
              <button
                type="button"
                disabled={pending || tag.id.startsWith("pending:")}
                aria-label={`タグ「${tag.name}」を外す`}
                onClick={() =>
                  mutate({ change: { kind: "detach", tagId: tag.id }, tag })
                }
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {scope.canEdit && !accessLost && (
        <button
          type="button"
          className="hollow-button"
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          タグを追加
        </button>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          {last && !accessLost && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (last) mutate(last);
              }}
            >
              変更を再試行
            </button>
          )}{" "}
          <button type="button" disabled={pending} onClick={refresh}>
            表示を更新
          </button>
        </p>
      )}
      {open && scope.canEdit && !accessLost && (
        <TagPicker
          noteId={noteId}
          title={title}
          workspaceId={scope.workspaceId}
          tags={visible}
          pending={pending}
          error={error}
          onChange={mutate}
          onClose={() => setOpen(false)}
          onRefresh={setBase}
          onAccessLost={(cause) => {
            setAccessLost(true);
            setOpen(false);
            setError(displayError(cause));
          }}
        />
      )}
    </section>
  );
}
