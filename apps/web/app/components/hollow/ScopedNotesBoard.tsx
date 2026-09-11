"use client";

import type {
  BrowseConditions,
  BrowseNote,
  BrowsePage,
} from "@repo/core/application/browse/ports";
import type { BrowseSort } from "@repo/core/domain/browse/query";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  SearchTrigger,
  useBrowseContext,
} from "@/components/browse/BrowseContext";
import {
  BrowseError,
  browseAccessLost,
  browseErrorMessage,
} from "@/components/browse/BrowseError";
import { BrowseSkeleton } from "@/components/browse/BrowseSkeleton";
import {
  appendNotes,
  changeBrowse,
  changeLayout,
  clearFilters,
  normalSorts,
  pageForDisplay,
  preferenceForConditions,
  shiftMonth,
  sortLabels,
} from "@/components/browse/model";
import {
  acceptsPage,
  acceptsRequest,
  matchesBrowseLocation,
} from "@/components/browse/requestState";
import { TagFilter } from "@/components/browse/TagFilter";
import { isBrowseZone } from "@/presentation/browseInput";
import { browseNotesFn } from "@/presentation/browseServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { trashNoteFn } from "@/presentation/hollowTrash";
import { scopeSearch } from "@/presentation/workspaceInput";
import { NoteList } from "./NoteList";
import { NoteTrashDialog, type NoteTrashIntent } from "./NoteTrashDialog";
import { useTrashNotice } from "./TrashProvider";
import { ScopeUsageNotice } from "./WorkspaceScope";

function removeFromPage(page: BrowsePage, id: string): BrowsePage {
  return {
    ...page,
    total:
      page.total -
      (page.items.some((note) => note.id === id) ||
      page.calendar.some((day) => day.items.some((note) => note.id === id))
        ? 1
        : 0),
    items: page.items.filter((note) => note.id !== id),
    calendar: page.calendar.map((day) => ({
      ...day,
      count: day.count - (day.items.some((note) => note.id === id) ? 1 : 0),
      items: day.items.filter((note) => note.id !== id),
    })),
  };
}

export function ScopedNotesBoard({ page }: { page: BrowsePage }) {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location.href });
  const routeSearch = useRouterState({
    select: (state) => state.location.search,
  });
  const context = useBrowseContext();
  const notify = useTrashNotice();
  const [data, setData] = useState(() => pageForDisplay(page));
  const dataSeed = useRef(page);
  const [visible, remove] = useOptimistic(data, removeFromPage);
  const [target, setTarget] = useState<BrowseNote | null>(null);
  const [trashError, setTrashError] = useState("");
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{
    day: string | null;
    message: string;
  } | null>(null);
  const [accessError, setAccessError] = useState<unknown>(null);
  const [navigationError, setNavigationError] = useState("");
  const [zone, setZone] = useState(page.conditions.zone);
  const busy = useRef<symbol | null>(null);
  const trashBusy = useRef(false);
  const generation = useRef(0);
  const current = useRef({ page, location });
  current.current = { page, location };
  const sentinel = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const conditions = page.conditions;
  const normalSort = context.preference?.sort ?? "updated-desc";
  const { publish, savePreference, rejectAccess } = context;
  const locationMatches = matchesBrowseLocation(conditions, routeSearch);
  useEffect(() => {
    if (locationMatches) return publish({ page, location });
    return;
  }, [publish, page, location, locationMatches]);
  useEffect(() => {
    generation.current++;
    busy.current = null;
    dataSeed.current = page;
    setData(pageForDisplay(page));
    setLoading(null);
    setLoadError(null);
    setAccessError(null);
    setZone(page.conditions.zone);
    return () => {
      generation.current++;
    };
  }, [page]);
  useEffect(() => {
    if (!context.preferencesReady) return;
    const preference = preferenceForConditions(conditions, context.preference);
    if (JSON.stringify(preference) !== JSON.stringify(context.preference))
      savePreference(preference);
  }, [
    conditions,
    context.preference,
    context.preferencesReady,
    savePreference,
  ]);
  const go = (next: BrowseConditions) => {
    generation.current++;
    busy.current = null;
    setLoading(null);
    setLoadError(null);
    setNavigationError("");
    const ticket = generation.current;
    void router.navigate({ to: "/notes", search: next }).catch((cause) => {
      if (
        ticket === generation.current &&
        current.current.location === location
      )
        setNavigationError(displayError(cause));
    });
  };
  const tag = (id: string) => {
    if (!conditions.tags.includes(id) && conditions.tags.length >= 50) {
      setNavigationError(
        "一度に選べるタグは50個までです。別のタグを解除してください。",
      );
      return;
    }
    go(
      changeBrowse(conditions, {
        tags: conditions.tags.includes(id)
          ? conditions.tags.filter((value) => value !== id)
          : [...conditions.tags, id],
      }),
    );
  };
  const more = useCallback(
    async (day?: string) => {
      const cursor = day
        ? data.calendar.find((value) => value.date === day)?.nextCursor
        : data.nextCursor;
      if (!cursor || busy.current || trashBusy.current || !locationMatches)
        return;
      const token = Symbol("browse-page");
      busy.current = token;
      const ticket = {
        generation: generation.current,
        identity: page.identity,
        seed: page,
        location,
      };
      const valid = () =>
        acceptsRequest(
          {
            generation: generation.current,
            identity: current.current.page.identity,
            seed: current.current.page,
            location: current.current.location,
          },
          ticket,
        );
      setLoading(day ?? "notes");
      setLoadError(null);
      const request = { ...conditions, cursor, ...(day ? { day } : {}) };
      try {
        const next = await browseNotesFn({ data: request });
        if (!valid()) return;
        if (!acceptsPage(request, page, next))
          throw new Error("Browse response identity mismatch");
        setData((previous) =>
          day
            ? {
                ...previous,
                scope: next.scope,
                usage: next.usage,
                selectedTags: next.selectedTags,
                calendar: previous.calendar.map((value) =>
                  value.date === day
                    ? {
                        ...value,
                        items: appendNotes(value.items, next.items),
                        nextCursor: next.nextCursor,
                      }
                    : value,
                ),
              }
            : {
                ...previous,
                scope: next.scope,
                usage: next.usage,
                selectedTags: next.selectedTags,
                items: appendNotes(previous.items, next.items),
                nextCursor: next.nextCursor,
                total: next.total,
              },
        );
      } catch (cause) {
        if (!valid()) return;
        if (browseAccessLost(cause)) {
          setAccessError(cause);
          rejectAccess(cause);
        } else
          setLoadError({
            day: day ?? null,
            message: browseErrorMessage(cause),
          });
      } finally {
        if (valid() && busy.current === token) {
          busy.current = null;
          setLoading(null);
        }
      }
    },
    [conditions, data, page, location, rejectAccess, locationMatches],
  );
  useEffect(() => {
    const node = sentinel.current;
    if (
      !node ||
      !data.nextCursor ||
      loading ||
      pending ||
      loadError ||
      conditions.layout === "calendar" ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void more();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [data.nextCursor, loading, loadError, conditions.layout, more, pending]);
  const confirm = (intent: NoteTrashIntent, cancelProcessing: boolean) => {
    if (trashBusy.current) return;
    if (!data.scope.canEdit) {
      setTrashError("現在の編集権限がありません。一覧を更新してください。");
      return;
    }
    trashBusy.current = true;
    generation.current++;
    busy.current = null;
    setLoading(null);
    const valid = () =>
      mounted.current &&
      current.current.location === location &&
      current.current.page.scope.workspaceId === page.scope.workspaceId;
    start(async () => {
      setTrashError("");
      remove(intent.id);
      let succeeded = false;
      try {
        const receipt = await trashNoteFn({
          data: { id: intent.id, version: intent.version, cancelProcessing },
        });
        succeeded = true;
        if (!valid()) return;
        setData((previous) => removeFromPage(previous, intent.id));
        setTarget(null);
        notify({
          ...receipt,
          title: intent.title,
          ...scopeSearch(page.scope.workspaceId),
        });
        if (conditions.cursor || conditions.day)
          await router.navigate({
            to: "/notes",
            search: changeBrowse(conditions, {}),
          });
        await router.invalidate();
      } catch (cause) {
        if (valid())
          setTrashError(
            `${succeeded ? "ゴミ箱への移動は完了しました。一覧を更新できませんでした。" : ""}${displayError(cause)}`,
          );
      } finally {
        trashBusy.current = false;
      }
    });
  };
  if (!locationMatches) return <BrowseSkeleton layout={conditions.layout} />;
  if (accessError || context.accessError)
    return <BrowseError error={accessError || context.accessError} />;
  const shown = dataSeed.current === page ? visible : pageForDisplay(page);
  const filtered =
    !!conditions.query || !!conditions.tags.length || !!conditions.month;
  const noteProps = {
    zone: conditions.zone,
    canEdit: shown.scope.canEdit,
    pending,
    onTrash: (note: BrowseNote) => {
      setTrashError("");
      setTarget(note);
    },
    onTag: tag,
  };
  return (
    <section className="browse-board" aria-busy={pending}>
      <div className="hollow-page-heading">
        <div>
          <p className="hollow-eyebrow">{shown.scope.name} / 非公開</p>
          <h1>
            ノート <span className="browse-total">{shown.total}件</span>
          </h1>
        </div>
        {shown.scope.canEdit && (
          <div className="hollow-trash-actions">
            <Link
              to="/notes/import"
              search={scopeSearch(page.scope.workspaceId)}
              className="hollow-button"
            >
              ファイルを取り込む
            </Link>
            <Link
              to="/notes/new"
              search={scopeSearch(page.scope.workspaceId)}
              className="hollow-button hollow-primary"
            >
              ＋ 新規作成
            </Link>
          </div>
        )}
      </div>
      <ScopeUsageNotice scope={shown.scope} usage={shown.usage} />
      {context.notice && (
        <p role="status" className="hollow-help">
          {context.notice}
        </p>
      )}
      <div className="browse-toolbar">
        <fieldset className="browse-layouts" aria-label="表示形式">
          {(["tile", "list", "calendar"] as const).map((layout) => (
            <button
              type="button"
              key={layout}
              aria-pressed={conditions.layout === layout}
              onClick={() => go(changeLayout(conditions, layout, new Date()))}
            >
              {layout === "tile"
                ? "タイル"
                : layout === "list"
                  ? "リスト"
                  : "カレンダー"}
            </button>
          ))}
        </fieldset>
        <label>
          並び順
          <select
            disabled={conditions.layout === "calendar"}
            value={conditions.sort}
            onChange={(event) =>
              go(
                changeBrowse(conditions, {
                  sort: event.target.value as BrowseSort,
                }),
              )
            }
          >
            {(conditions.query
              ? [...normalSorts, "relevance" as const]
              : normalSorts
            ).map((sort) => (
              <option key={sort} value={sort}>
                {sortLabels[sort]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {conditions.layout === "calendar" && (
        <p className="hollow-help">
          作成日ごとに表示します。カレンダーでは並び順を変更できません。
        </p>
      )}
      <div className="browse-filters">
        <SearchTrigger chip />
        {conditions.query && (
          <button
            type="button"
            className="browse-chip"
            onClick={() =>
              go(changeBrowse(conditions, { query: "", sort: normalSort }))
            }
          >
            検索：{conditions.query} ×
          </button>
        )}
        {shown.selectedTags.map((selected) => (
          <button
            type="button"
            className="browse-chip"
            key={selected.id}
            onClick={() => tag(selected.id)}
          >
            {selected.name ?? "利用できないタグ"} ×
          </button>
        ))}
        {conditions.month && (
          <button
            type="button"
            className="browse-chip"
            onClick={() =>
              go(
                changeBrowse(conditions, {
                  month: undefined,
                  layout:
                    conditions.layout === "calendar"
                      ? "list"
                      : conditions.layout,
                }),
              )
            }
          >
            {conditions.month} ×
          </button>
        )}
        {filtered && (
          <button
            type="button"
            className="browse-clear"
            onClick={() => go(clearFilters(conditions, normalSort))}
          >
            すべて解除
          </button>
        )}
      </div>
      <div className="browse-date-controls">
        <label>
          作成月
          <input
            type="month"
            min="0001-01"
            max="9999-12"
            value={conditions.month ?? ""}
            onChange={(event) =>
              go(
                changeBrowse(conditions, {
                  month: event.target.value || undefined,
                  ...(!event.target.value && conditions.layout === "calendar"
                    ? { layout: "list" as const }
                    : {}),
                }),
              )
            }
          />
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!isBrowseZone(zone)) {
              setNavigationError("有効なIANAタイムゾーンを入力してください。");
              return;
            }
            go(changeBrowse(conditions, { zone }));
          }}
        >
          <label>
            タイムゾーン
            <input
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              maxLength={100}
              placeholder="Asia/Tokyo"
            />
          </label>
          <button type="submit">変更</button>
          <button
            type="button"
            onClick={() => {
              const detected = context.detectZone();
              if (detected) {
                setZone(detected);
                go(changeBrowse(conditions, { zone: detected }));
              } else
                setNavigationError(
                  `端末の地域を検出できません。現在は${conditions.zone}で表示しています。地域を入力するか再試行してください。`,
                );
            }}
          >
            端末の地域を再検出
          </button>
        </form>
      </div>
      <TagFilter
        key={page.identity}
        conditions={conditions}
        onSelect={tag}
        onAccessLost={rejectAccess}
      />
      {navigationError && (
        <p role="alert" className="hollow-message">
          {navigationError}
        </p>
      )}
      {!target && trashError && (
        <p role="alert" className="hollow-message">
          {trashError}{" "}
          <button type="button" onClick={() => void router.invalidate()}>
            一覧を更新
          </button>
        </p>
      )}
      {conditions.month && (
        <p className="hollow-help">
          {conditions.day ?? conditions.month}に作成：{shown.total}件（
          {conditions.zone}）
        </p>
      )}
      {conditions.day && (
        <p className="hollow-message">
          {conditions.day}の続きから表示しています。
          <button
            type="button"
            onClick={() => go(changeBrowse(conditions, {}))}
          >
            月全体を先頭から読む
          </button>
        </p>
      )}
      {shown.total === 0 && (
        <section className="hollow-empty">
          <span className="hollow-empty-mark" aria-hidden="true">
            ○
          </span>
          <h2>
            {filtered
              ? "条件に一致するノートはありません。"
              : "まだ、白紙です。"}
          </h2>
          <p>
            {filtered
              ? "検索語・タグ・月を解除してお試しください。別の文脈を探すには上部で文脈を切り替えます。"
              : "考えたこと、残しておきたいこと。最初のノートを書いてみましょう。"}
          </p>
          {filtered ? (
            <button
              type="button"
              className="hollow-button"
              onClick={() => go(clearFilters(conditions, normalSort))}
            >
              条件を解除
            </button>
          ) : (
            shown.scope.canEdit && (
              <div className="hollow-trash-actions">
                <Link
                  to="/notes/new"
                  search={scopeSearch(page.scope.workspaceId)}
                  className="hollow-button"
                >
                  新規作成
                </Link>
                <Link
                  to="/notes/import"
                  search={scopeSearch(page.scope.workspaceId)}
                  className="hollow-button"
                >
                  ファイルを取り込む
                </Link>
              </div>
            )
          )}
        </section>
      )}
      {conditions.layout === "calendar" ? (
        <>
          <nav className="browse-month-nav" aria-label="カレンダーの月">
            <button
              type="button"
              disabled={conditions.month === "0001-01"}
              onClick={() =>
                conditions.month &&
                go(
                  changeBrowse(conditions, {
                    month: shiftMonth(conditions.month, -1),
                  }),
                )
              }
            >
              ← 前月
            </button>
            <h2>{conditions.month}</h2>
            <button
              type="button"
              disabled={conditions.month === "9999-12"}
              onClick={() =>
                conditions.month &&
                go(
                  changeBrowse(conditions, {
                    month: shiftMonth(conditions.month, 1),
                  }),
                )
              }
            >
              翌月 →
            </button>
          </nav>
          <div className="browse-calendar-weekdays" aria-hidden="true">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <section
            className="browse-calendar"
            aria-label={`${conditions.month} 作成日カレンダー`}
          >
            {shown.calendar.map((day, index) => (
              <section
                className="browse-day"
                key={day.date}
                style={
                  index === 0
                    ? {
                        gridColumnStart:
                          new Date(`${day.date}T00:00:00Z`).getUTCDay() + 1,
                      }
                    : undefined
                }
              >
                <h3>
                  <time dateTime={day.date}>
                    {Number(day.date.slice(-2))}日
                    <span className="browse-day-weekday">
                      （
                      {new Intl.DateTimeFormat("ja-JP", {
                        timeZone: "UTC",
                        weekday: "short",
                      }).format(new Date(`${day.date}T00:00:00Z`))}
                      ）
                    </span>
                  </time>
                  <span>{day.count}件</span>
                </h3>
                <NoteList {...noteProps} notes={day.items} layout="calendar" />
                {day.nextCursor && (
                  <button
                    type="button"
                    className="browse-more"
                    disabled={!!loading || pending}
                    onClick={() => void more(day.date)}
                  >
                    {loading === day.date
                      ? "読み込み中…"
                      : day.count > day.items.length
                        ? `他 ${day.count - day.items.length} 件 — 続きを表示`
                        : "続きを確認"}
                  </button>
                )}
                {loadError?.day === day.date && (
                  <p role="alert">
                    {loadError.message}
                    <button
                      type="button"
                      disabled={!!loading}
                      onClick={() => void more(day.date)}
                    >
                      再試行
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        conditions.cursor
                          ? go(changeBrowse(conditions, {}))
                          : void router.invalidate()
                      }
                    >
                      月を読み直す
                    </button>
                  </p>
                )}
              </section>
            ))}
          </section>
        </>
      ) : (
        <>
          <NoteList
            {...noteProps}
            notes={shown.items}
            layout={conditions.layout}
          />
          <div ref={sentinel} className="browse-pagination">
            {loading === "notes" && <p role="status">続きを読み込み中…</p>}
            {loadError?.day === null && (
              <p role="alert">
                {loadError.message}
                <button
                  type="button"
                  onClick={() =>
                    conditions.cursor
                      ? go(changeBrowse(conditions, {}))
                      : void router.invalidate()
                  }
                >
                  先頭から読み直す
                </button>
              </p>
            )}
            {shown.nextCursor && (
              <button
                type="button"
                className="hollow-button"
                disabled={!!loading || pending}
                onClick={() => void more()}
              >
                {loadError ? "再試行" : "次の50件を読み込む"}
              </button>
            )}
            {conditions.cursor && (
              <button
                type="button"
                className="hollow-button"
                onClick={() => go(changeBrowse(conditions, {}))}
              >
                先頭へ
              </button>
            )}
          </div>
        </>
      )}
      {target && (
        <NoteTrashDialog
          target={target}
          pending={pending}
          error={trashError}
          onCancel={() => setTarget(null)}
          onConfirm={confirm}
        />
      )}
    </section>
  );
}
