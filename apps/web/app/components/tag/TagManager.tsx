"use client";

import type {
  TagManagement,
  TagReadPage,
} from "@repo/core/application/tag/ports";
import type { TagImpact, TagSummary } from "@repo/core/domain/tag/entity";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { browseErrorMessage } from "@/components/browse/BrowseError";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import { tagRouteSchema } from "@/presentation/tagInput";
import { manageTagsFn, readTagsFn } from "@/presentation/tagServerFn";
import { tagAccessLost } from "./errors";
import {
  type TagManagerSearch,
  tagManagerIdentity,
  tagScope,
  validTagName,
} from "./model";
import { TagDialog } from "./TagDialog";
import { TagSkeleton } from "./TagSkeleton";

export type { TagManagerSearch } from "./model";

type Dialog =
  | { kind: "rename"; source: TagSummary; name: string }
  | { kind: "delete"; impact: TagImpact }
  | { kind: "merge"; impact: TagImpact }
  | { kind: "cleanup"; targets: readonly TagSummary[] };
type Preview =
  | { kind: "rename"; id: string; name: string }
  | { kind: "remove"; ids: readonly string[] };
function optimisticManager(items: readonly TagSummary[], preview: Preview) {
  return preview.kind === "remove"
    ? items.filter((tag) => !preview.ids.includes(tag.id))
    : items.map((tag) =>
        tag.id === preview.id ? { ...tag, name: preview.name } : tag,
      );
}
const stamp = (tag: TagSummary) => ({ id: tag.id, revision: tag.revision });

function Counts({ tag }: { tag: TagSummary }) {
  return (
    <span className="tag-counts">
      全{tag.total}件 · 通常{tag.active} / ゴミ箱{tag.trashed} / 回収中
      {tag.purging}
    </span>
  );
}
function Impact({ impact }: { impact: TagImpact }) {
  return (
    <div className="tag-impact">
      <p>
        「{impact.source.name}」 <Counts tag={impact.source} />
      </p>
      {impact.target && (
        <>
          <p>
            統合先「{impact.target.name}」 <Counts tag={impact.target} />
          </p>
          <p>
            重複 {impact.overlap}件 · 統合後 {impact.affected}
            件。統合先の名前とIDを残します。
          </p>
        </>
      )}
      <p>
        ノートは削除しません。ゴミ箱・回収中も含めてタグの関係を変更します。
      </p>
    </div>
  );
}

export function TagManager({
  page,
  search,
}: {
  page: TagReadPage;
  search: TagManagerSearch;
}) {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location.href });
  const routeSearch = useRouterState({
    select: (state) => state.location.search,
  });
  const parsedSearch = tagRouteSchema.safeParse(routeSearch);
  const locationMatches =
    parsedSearch.success &&
    tagManagerIdentity(parsedSearch.data) === tagManagerIdentity(search);
  const [items, preview] = useOptimistic(page.items, optimisticManager);
  const [query, setQuery] = useState(search.query ?? "");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryImpact, setRetryImpact] = useState<{
    sourceId: string;
    targetId?: string;
    kind: "delete" | "merge";
  } | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [pending, start] = useTransition();
  const origin = useRef<HTMLButtonElement | null>(null);
  const generation = useRef(0);
  const busy = useRef<symbol | null>(null);
  const current = useRef({
    location,
    workspaceId: page.scope.workspaceId,
    locationMatches,
    accessLost,
  });
  current.current = {
    location,
    workspaceId: page.scope.workspaceId,
    locationMatches,
    accessLost,
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: Every URL transition invalidates the pending operation and confirmation.
  useEffect(() => {
    generation.current++;
    setDialog(null);
    setQuery(search.query ?? "");
    setError("");
    setNotice("");
    setLoading(false);
    setRetryImpact(null);
    setAccessLost(false);
    return () => {
      generation.current++;
    };
  }, [location, search.query]);
  const valid = (ticket: number) =>
    ticket === generation.current &&
    current.current.locationMatches &&
    current.current.location === location &&
    current.current.workspaceId === page.scope.workspaceId;
  const closeDialog = () => {
    if (pending || loading) return;
    const ticket = generation.current;
    const previous = origin.current;
    setDialog(null);
    requestAnimationFrame(() => {
      if (!valid(ticket) || current.current.accessLost) return;
      if (previous?.isConnected && !previous.disabled) previous.focus();
    });
  };
  const first = {
    ...tagScope(page.scope.workspaceId),
    query: search.query ?? "",
    unusedOnly: search.unusedOnly ?? false,
  };
  const refresh = async () => {
    if (search.cursor) await router.navigate({ to: "/tags", search: first });
    await router.invalidate();
  };
  const navigate = (next: TagManagerSearch) => {
    const ticket = ++generation.current;
    setDialog(null);
    setError("");
    void router
      .navigate({ to: "/tags", search: next })
      .catch((cause: unknown) => {
        if (valid(ticket)) setError(displayError(cause));
      });
  };
  const loadImpact = async (
    sourceId: string,
    kind: "delete" | "merge",
    targetId?: string,
  ) => {
    if (busy.current || loading || accessLost || !locationMatches) return;
    const ticket = ++generation.current;
    setDialog(null);
    setError("");
    setLoading(true);
    setRetryImpact(null);
    try {
      const impact = await readTagsFn({
        data: {
          purpose: "impact",
          ...tagScope(page.scope.workspaceId),
          sourceId,
          ...(targetId ? { targetId } : {}),
        },
      });
      if (!valid(ticket)) return;
      if (
        impact.kind !== "impact" ||
        impact.source.id !== sourceId ||
        (kind === "merge" && impact.target?.id !== targetId)
      )
        throw new Error("Tag impact response mismatch");
      setDialog({ kind, impact });
    } catch (cause) {
      if (!valid(ticket)) return;
      setError(browseErrorMessage(cause));
      if (tagAccessLost(cause)) setAccessLost(true);
      else
        setRetryImpact({ sourceId, kind, ...(targetId ? { targetId } : {}) });
    } finally {
      if (valid(ticket)) setLoading(false);
    }
  };
  const mutate = (action: TagManagement["action"], optimistic: Preview) => {
    if (busy.current || loading || accessLost || !locationMatches) return;
    const token = Symbol("manage-tags");
    busy.current = token;
    const ticket = ++generation.current;
    start(async () => {
      setError("");
      setNotice("");
      preview(optimistic);
      let wrote = false;
      let needsMerge = false;
      try {
        const result = await manageTagsFn({
          data: {
            scope: tagScope(page.scope.workspaceId),
            action:
              action.kind === "cleanup"
                ? { ...action, targets: [...action.targets] }
                : action,
          },
        });
        if (!valid(ticket)) return;
        if (result.kind === "merge-required") {
          needsMerge = true;
          setDialog({ kind: "merge", impact: result.impact });
          setNotice(
            "同じ名前のタグがあります。影響を確認して統合してください。まだ統合していません。",
          );
        } else {
          wrote = true;
          setDialog(null);
          setNotice(
            result.changed ? "タグを更新しました。" : "変更はありません。",
          );
        }
      } catch (cause) {
        if (!valid(ticket)) return;
        setError(displayError(cause));
        const code = extractSerializedError(cause).code;
        if (tagAccessLost(cause)) {
          setAccessLost(true);
          setDialog(null);
        } else if (code === "TAG_CHANGED") {
          setDialog(null);
          setNotice(
            "確認後にタグや関係が変わりました。最新の状態から操作を選び直してください。",
          );
          if (action.kind === "delete" || action.kind === "merge")
            setRetryImpact({
              kind: action.kind,
              sourceId: action.source.id,
              ...(action.kind === "merge"
                ? { targetId: action.target.id }
                : {}),
            });
        }
      } finally {
        if (valid(ticket)) {
          try {
            if (needsMerge || !wrote) await router.invalidate();
            else await refresh();
          } catch (cause) {
            if (valid(ticket))
              setError(
                `${wrote ? "変更は完了しました。" : ""}現在の一覧を更新できません。${displayError(cause)}`,
              );
          }
        }
        if (busy.current === token) busy.current = null;
      }
    });
  };
  const unused = page.items.filter((tag) => tag.total === 0).slice(0, 50);
  if (!locationMatches) return <TagSkeleton />;
  return (
    <section className="tag-manager" aria-busy={pending || loading}>
      <Link
        to="/notes"
        search={tagScope(page.scope.workspaceId)}
        className="hollow-back"
      >
        ← ノート一覧
      </Link>
      <p className="hollow-eyebrow">{page.scope.name}</p>
      <h1>タグを管理</h1>
      <p>
        タグを削除してもノートは残ります。使用件数はゴミ箱・回収中も含みます。
      </p>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {retryImpact && !accessLost && (
        <button
          type="button"
          disabled={pending || loading}
          onClick={(event) => {
            origin.current = event.currentTarget;
            void loadImpact(
              retryImpact.sourceId,
              retryImpact.kind,
              retryImpact.targetId,
            );
          }}
        >
          最新の影響を再確認
        </button>
      )}
      <button
        type="button"
        className="hollow-button"
        disabled={pending || loading}
        onClick={() => {
          const ticket = generation.current;
          void refresh().catch((cause: unknown) => {
            if (valid(ticket)) setError(displayError(cause));
          });
        }}
      >
        先頭から更新
      </button>
      {!accessLost && (
        <>
          <form
            className="tag-manager-search"
            onSubmit={(event) => {
              event.preventDefault();
              if ([...query].length > 200) {
                setError("検索は200文字以内にしてください。");
                return;
              }
              navigate({ ...first, query: query.trim() });
            }}
          >
            <label>
              タグ名で検索
              <input
                value={query}
                maxLength={800}
                disabled={pending || loading}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button type="submit" disabled={pending || loading}>
              検索
            </button>
            <label className="tag-checkbox">
              <input
                type="checkbox"
                checked={search.unusedOnly ?? false}
                disabled={pending || loading}
                onChange={(event) =>
                  navigate({ ...first, unusedOnly: event.target.checked })
                }
              />
              未使用だけ
            </label>
          </form>
          <p className="hollow-help">
            全関係0件のタグ：{page.unusedTotal}
            個。片付ける対象はこのページに表示された最大50個です。
          </p>
          <button
            type="button"
            className="hollow-button"
            disabled={!unused.length || pending || loading}
            onClick={(event) => {
              origin.current = event.currentTarget;
              setError("");
              setDialog({ kind: "cleanup", targets: unused });
            }}
          >
            表示中の未使用{unused.length}個を片付ける
          </button>
          {loading && <p role="status">最新の影響を確認しています…</p>}
          <ul className="tag-manager-list">
            {items.map((tag) => (
              <li key={tag.id}>
                <div>
                  <span className="tag-manager-name">{tag.name}</span>
                  <Counts tag={tag} />
                </div>
                <div className="tag-actions">
                  <button
                    type="button"
                    disabled={pending || loading}
                    onClick={(event) => {
                      origin.current = event.currentTarget;
                      setError("");
                      setDialog({
                        kind: "rename",
                        source: tag,
                        name: tag.name,
                      });
                    }}
                  >
                    名前を変更
                  </button>
                  <button
                    type="button"
                    disabled={pending || loading}
                    onClick={(event) => {
                      origin.current = event.currentTarget;
                      void loadImpact(tag.id, "delete");
                    }}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!items.length && (
            <p className="hollow-empty">
              {search.query || search.unusedOnly
                ? "条件に一致するタグはありません。"
                : "タグはまだありません。ノートから作成できます。"}
            </p>
          )}
          {page.nextCursor && (
            <button
              type="button"
              className="hollow-button"
              disabled={pending || loading}
              onClick={() =>
                navigate({ ...first, cursor: page.nextCursor ?? undefined })
              }
            >
              次の50件
            </button>
          )}
          {page.nextCursor && (
            <p className="hollow-help">
              残りのタグは次のページで確認できます。
            </p>
          )}
        </>
      )}
      {dialog && !accessLost && (
        <TagDialog
          title={
            dialog.kind === "rename"
              ? "タグ名を変更"
              : dialog.kind === "merge"
                ? "タグを統合しますか？"
                : dialog.kind === "cleanup"
                  ? "表示中の未使用タグを削除しますか？"
                  : "タグを削除しますか？"
          }
          pending={pending}
          onClose={closeDialog}
        >
          {dialog.kind === "rename" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!validTagName(dialog.name)) {
                  setError("タグ名は1〜50文字で入力してください。");
                  return;
                }
                mutate(
                  {
                    kind: "rename",
                    source: stamp(dialog.source),
                    name: dialog.name.trim(),
                  },
                  {
                    kind: "rename",
                    id: dialog.source.id,
                    name: dialog.name.trim(),
                  },
                );
              }}
            >
              <label>
                新しい名前
                <input
                  value={dialog.name}
                  maxLength={800}
                  disabled={pending}
                  onChange={(event) =>
                    setDialog({ ...dialog, name: event.target.value })
                  }
                />
              </label>
              <p>
                前後の空白を除いた1〜50文字。同名の場合は統合の確認へ進みます。
              </p>
              {error && <p role="alert">{error}</p>}
              <button
                type="submit"
                className="hollow-button hollow-primary"
                disabled={pending || !validTagName(dialog.name)}
              >
                {pending ? "確認中…" : "変更"}
              </button>
            </form>
          ) : (
            <>
              {dialog.kind === "cleanup" ? (
                <>
                  <p>
                    次の{dialog.targets.length}
                    個だけを削除します。確認後に1件でも使用状態が変われば、全件変更しません。
                  </p>
                  <ul>
                    {dialog.targets.map((tag) => (
                      <li key={tag.id}>{tag.name}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <Impact impact={dialog.impact} />
              )}
              {error && <p role="alert">{error}</p>}
              <button
                type="button"
                className="hollow-button hollow-destructive"
                disabled={pending}
                onClick={() => {
                  if (dialog.kind === "cleanup")
                    mutate(
                      { kind: "cleanup", targets: dialog.targets.map(stamp) },
                      {
                        kind: "remove",
                        ids: dialog.targets.map((tag) => tag.id),
                      },
                    );
                  else if (dialog.kind === "delete")
                    mutate(
                      { kind: "delete", source: stamp(dialog.impact.source) },
                      { kind: "remove", ids: [dialog.impact.source.id] },
                    );
                  else if (dialog.impact.target)
                    mutate(
                      {
                        kind: "merge",
                        source: stamp(dialog.impact.source),
                        target: stamp(dialog.impact.target),
                      },
                      { kind: "remove", ids: [dialog.impact.source.id] },
                    );
                }}
              >
                {pending
                  ? "変更中…"
                  : dialog.kind === "merge"
                    ? "確認して統合"
                    : "確認して削除"}
              </button>
            </>
          )}
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={closeDialog}
          >
            取消
          </button>
        </TagDialog>
      )}
    </section>
  );
}
