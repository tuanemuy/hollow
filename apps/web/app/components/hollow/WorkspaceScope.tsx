"use client";

import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  getScopeUsageFn,
  listWorkspacesFn,
} from "@/presentation/hollowWorkspace";
import {
  acceptsWorkspaceResponse,
  type ScopeUsage,
  scopeFromLoader,
  scopeSearch,
  type WorkspaceScopeView,
} from "@/presentation/workspaceInput";
import "./workspace.css";
import { PublicPageLink } from "@/components/publication/PublicPageLink";
import { workspaceIconUrl } from "./WorkspaceIcon";

const DisplayScope = createContext<{
  scope: WorkspaceScopeView | undefined;
  setScope: (scope: WorkspaceScopeView) => void;
} | null>(null);
export function useCurrentWorkspaceId() {
  return useRouterState({
    select: (state) => {
      for (const match of [...state.matches].reverse()) {
        const scope = scopeFromLoader(match.loaderData);
        if (scope) return scope.workspaceId;
        if (
          "workspaceId" in match.params &&
          typeof match.params.workspaceId === "string"
        )
          return match.params.workspaceId;
      }
      return state.location.search.workspaceId as string | undefined;
    },
  });
}

export function WorkspaceScopeLabel({ scope }: { scope: WorkspaceScopeView }) {
  const publish = useContext(DisplayScope)?.setScope;
  useEffect(() => {
    publish?.(scope);
  }, [publish, scope]);
  return null;
}
export function WorkspaceDisplayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [scope, setScope] = useState<WorkspaceScopeView>();
  return (
    <DisplayScope.Provider value={{ scope, setScope }}>
      {children}
    </DisplayScope.Provider>
  );
}

export function ScopeUsageNotice({
  scope,
  usage,
}: {
  scope: WorkspaceScopeView;
  usage: ScopeUsage;
}) {
  const publish = useContext(DisplayScope)?.setScope;
  useEffect(() => {
    publish?.(scope);
  }, [publish, scope]);
  return (
    <section className="hollow-scope-usage" aria-label="保存先と使用容量">
      <p>
        保存先：{scope.workspaceId ? `ワークスペース「${scope.name}」` : "個人"}{" "}
        · {scope.canEdit ? "編集可能" : "閲覧のみ"}
      </p>
      <p>
        {(usage.usedBytes / 1024 ** 3).toFixed(3)} /{" "}
        {(usage.limitBytes / 1024 ** 3).toFixed(0)} GiB（
        {usage.usedBytes.toLocaleString("ja-JP")} /{" "}
        {usage.limitBytes.toLocaleString("ja-JP")} bytes）
      </p>
      <p className="hollow-help">
        原本・メディア・予約・回収待ちを含む、この保存先が保持する容量です。最終更新{" "}
        <time dateTime={usage.updatedAt}>
          {new Date(usage.updatedAt).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })}
        </time>
      </p>
      {usage.usedBytes > usage.limitBytes * 0.8 && (
        <p role="status" className="hollow-message">
          容量の80%を超えています。上限に達すると新しい保存や取り込みができません。
        </p>
      )}
    </section>
  );
}

export function ScopeUsageLive({
  workspaceId,
  refreshKey,
}: {
  workspaceId?: string | null;
  refreshKey: number;
}) {
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof getScopeUsageFn>
  > | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [reading, setReading] = useState(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Save and retry refresh scope quota without fetching any note rows.
  useEffect(() => {
    let disposed = false;
    setReading(true);
    void getScopeUsageFn({ data: scopeSearch(workspaceId) })
      .then((value) => {
        if (!disposed) {
          setResult(value);
          setError("");
        }
      })
      .catch((cause) => {
        if (!disposed)
          setError(`保存先の使用容量を確認できません。${displayError(cause)}`);
      })
      .finally(() => {
        if (!disposed) setReading(false);
      });
    return () => {
      disposed = true;
    };
  }, [workspaceId, refreshKey, reload]);
  return (
    <>
      {result && <ScopeUsageNotice scope={result.scope} usage={result.usage} />}
      {reading && <p role="status">保存先の使用容量を確認中…</p>}
      {error && (
        <p role="status" className="hollow-message">
          {error}{" "}
          <button
            type="button"
            className="hollow-button"
            disabled={reading}
            onClick={() => setReload((value) => value + 1)}
          >
            容量を再確認
          </button>
        </p>
      )}
    </>
  );
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const published = useContext(DisplayScope)?.scope;
  const loaderScope = useRouterState({
    select: (state) => {
      for (const match of [...state.matches].reverse()) {
        const value = scopeFromLoader(match.loaderData);
        if (value) return value;
      }
      return undefined;
    },
  });
  const searchScope = useRouterState({
    select: (state) => {
      for (const match of [...state.matches].reverse()) {
        if (
          "workspaceId" in match.params &&
          typeof match.params.workspaceId === "string"
        )
          return match.params.workspaceId;
      }
      return state.location.search.workspaceId as string | undefined;
    },
  });
  const scope =
    loaderScope ??
    (published?.workspaceId === (searchScope ?? null) ? published : undefined);
  const label =
    scope?.name ?? (searchScope ? "ワークスペース（確認中）" : "個人");
  const workspaceId = scope ? scope.workspaceId : searchScope;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Awaited<
    ReturnType<typeof listWorkspacesFn>
  > | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [shownCursor, setShownCursor] = useState<string | null | undefined>();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [pending, start] = useTransition();
  const generation = useRef(0);
  const heading = useId();
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit reload and scope creation refresh the bounded chooser page.
  useEffect(() => {
    if (!open) return;
    const ticket = {
      generation: ++generation.current,
      identity: cursor ?? "first",
    };
    let disposed = false;
    const current = () =>
      !disposed &&
      acceptsWorkspaceResponse(
        { generation: generation.current, identity: cursor ?? "first" },
        ticket,
      );
    setReading(true);
    void listWorkspacesFn({ data: cursor ? { cursor } : {} })
      .then((result) => {
        if (current()) {
          setPage(result);
          setShownCursor(cursor);
          setError("");
        }
      })
      .catch((cause) => {
        if (current()) setError(displayError(cause));
      })
      .finally(() => {
        if (current()) setReading(false);
      });
    return () => {
      disposed = true;
    };
  }, [open, cursor, reload]);
  const switchTo = (id?: string) =>
    start(async () => {
      setError("");
      try {
        await router.navigate({ to: "/notes", search: scopeSearch(id) });
        setOpen(false);
      } catch (cause) {
        setError(displayError(cause));
      }
    });
  return (
    <details
      className="hollow-scope-switcher"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label={`現在の保存先：${label}。保存先を切り替える`}>
        {workspaceId && scope?.iconId && (
          <img
            className="hollow-scope-icon"
            src={workspaceIconUrl(workspaceId, scope.iconId)}
            width={20}
            height={20}
            alt=""
          />
        )}
        {label}
      </summary>
      <section className="hollow-scope-menu" aria-labelledby={heading}>
        <h2 id={heading}>保存先を切り替える</h2>
        <p className="hollow-help">
          選択するとノート一覧へ移動します。作成中のノートや受付済みの取り込み先は変更しません。
        </p>
        <button
          type="button"
          className="hollow-button"
          disabled={pending}
          aria-pressed={!workspaceId}
          onClick={() => void switchTo()}
        >
          個人
        </button>
        {reading && <p role="status">参加ワークスペースを確認中…</p>}
        {error && (
          <p role="alert" className="hollow-message">
            {error}
          </p>
        )}
        {page && shownCursor !== cursor && (
          <p role="status">
            選択したページは未取得です。前回の保存先候補を表示しています。
          </p>
        )}
        {page && (
          <ul>
            {page.items.map((workspace) => (
              <li key={workspace.id}>
                <button
                  type="button"
                  className="hollow-button"
                  disabled={pending || reading}
                  aria-pressed={workspace.id === workspaceId}
                  onClick={() => void switchTo(workspace.id)}
                >
                  {workspace.iconId && (
                    <img
                      className="hollow-scope-icon"
                      src={workspaceIconUrl(workspace.id, workspace.iconId)}
                      width={20}
                      height={20}
                      alt=""
                    />
                  )}
                  {workspace.name} ·{" "}
                  {workspace.role === "owner"
                    ? "オーナー"
                    : workspace.role === "editor"
                      ? "編集者"
                      : "閲覧者"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {page?.items.length === 0 && (
          <p>このページに参加ワークスペースはありません。</p>
        )}
        <nav className="hollow-trash-actions" aria-label="保存先のページ移動">
          <button
            type="button"
            className="hollow-button"
            disabled={!cursor || reading || pending}
            onClick={() => {
              ++generation.current;
              setCursor(null);
            }}
          >
            先頭へ
          </button>
          <button
            type="button"
            className="hollow-button"
            disabled={
              !page?.nextCursor || reading || pending || shownCursor !== cursor
            }
            onClick={() => {
              if (page?.nextCursor) {
                ++generation.current;
                setCursor(page.nextCursor);
              }
            }}
          >
            次の50件
          </button>
          <button
            type="button"
            className="hollow-button"
            disabled={reading || pending}
            onClick={() => {
              ++generation.current;
              setReload((value) => value + 1);
            }}
          >
            更新
          </button>
        </nav>
        {(!workspaceId || scope?.canEdit) && (
          <p>
            <Link
              to="/trash"
              search={scopeSearch(workspaceId)}
              onClick={() => setOpen(false)}
            >
              現在の保存先のゴミ箱
            </Link>
          </p>
        )}
        {workspaceId && <PublicPageLink workspaceId={workspaceId} />}
        {workspaceId && (
          <p>
            <Link
              to="/workspaces/$workspaceId/settings"
              params={{ workspaceId }}
              onClick={() => setOpen(false)}
            >
              現在のワークスペース設定・メンバー
            </Link>
          </p>
        )}
        <Link to="/workspaces/new" onClick={() => setOpen(false)}>
          ワークスペースを作成
        </Link>
      </section>
    </details>
  );
}
