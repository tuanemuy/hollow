"use client";

import type {
  BrowseConditions,
  BrowsePage,
  BrowseScope,
} from "@repo/core/application/browse/ports";
import { useRouterState } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { isBrowseZone } from "@/presentation/browseInput";
import { scopeFromLoader } from "@/presentation/workspaceInput";
import {
  type BrowsePreference,
  decodePreference,
  paletteScopeName,
  preferenceKey,
  resolveBrowse,
} from "./model";
import { noteScopeForPath } from "./requestState";
import { SearchPalette } from "./SearchPalette";

type Published = { page: BrowsePage; location: string };
export type PaletteSession = {
  conditions: BrowseConditions;
  scope: BrowseScope;
  location: string;
  trigger: HTMLElement | null;
  userId: string;
};
type BrowseContextValue = {
  userId: string | null;
  preference: BrowsePreference | null;
  preferencesReady: boolean;
  notice: string;
  browserZone: string | null;
  zoneFailed: boolean;
  detectZone: () => string | null;
  savePreference: (value: BrowsePreference) => void;
  publish: (value: Published) => () => void;
  openPalette: () => void;
  searchable: boolean;
  accessError: unknown;
  rejectAccess: (error: unknown) => void;
};
const BrowseContext = createContext<BrowseContextValue | null>(null);
const userSchema = z.object({ user: z.object({ id: z.uuid() }) });
export function useBrowseContext() {
  const context = useContext(BrowseContext);
  if (!context) throw new Error("BrowseProvider is required");
  return context;
}

export function BrowseProvider({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const matches = useRouterState({ select: (state) => state.matches });
  const user = matches
    .map((match) => userSchema.safeParse(match.context))
    .find((result) => result.success);
  const userId = user?.success ? user.data.user.id : null;
  const [stored, setStored] = useState<{
    userId: string | null;
    preference: BrowsePreference | null;
  } | null>(null);
  const preference = stored?.userId === userId ? stored.preference : null;
  const [notice, setNotice] = useState("");
  const [browserZone, setBrowserZone] = useState<string | null>(null);
  const [zoneFailed, setZoneFailed] = useState(false);
  const [published, setPublished] = useState<Published | null>(null);
  const [session, setSession] = useState<PaletteSession | null>(null);
  const [lostAccess, setLostAccess] = useState<{
    location: string;
    error: unknown;
  } | null>(null);
  const accessError =
    lostAccess?.location === location ? lostAccess.error : null;
  const rejectAccess = useCallback(
    (error: unknown) => setLostAccess({ location, error }),
    [location],
  );
  const detectZone = useCallback(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!isBrowseZone(zone)) throw new Error("No browser timezone");
      setBrowserZone(zone);
      setZoneFailed(false);
      return zone;
    } catch {
      setZoneFailed(true);
      setBrowserZone(null);
      return null;
    }
  }, []);
  useEffect(() => {
    detectZone();
  }, [detectZone]);
  useEffect(() => {
    let value: BrowsePreference | null = null;
    try {
      if (userId)
        value = decodePreference(localStorage.getItem(preferenceKey(userId)));
      setNotice("");
    } catch {
      setNotice("端末設定を読み込めません。URLの条件は利用できます。");
    }
    setStored({ userId, preference: value });
  }, [userId]);
  const savePreference = useCallback(
    (value: BrowsePreference) => {
      if (!userId) return;
      setStored({ userId, preference: value });
      try {
        localStorage.setItem(preferenceKey(userId), JSON.stringify(value));
        setNotice("");
      } catch {
        setNotice("端末設定を保存できません。現在の表示とURLは有効です。");
      }
    },
    [userId],
  );
  const publish = useCallback((value: Published) => {
    setPublished(value);
    setLostAccess(null);
    return () =>
      setPublished((current) => (current === value ? null : current));
  }, []);
  const isList = /^\/notes\/?$/.test(pathname);
  const currentPage =
    isList && published?.location === location ? published.page : null;
  const detailScope = !isList
    ? [...matches]
        .reverse()
        .filter((match) => match.status === "success")
        .filter(
          (match) =>
            match.pathname.replace(/\/$/, "") === pathname.replace(/\/$/, ""),
        )
        .map((match) =>
          pathname.startsWith("/notes/")
            ? noteScopeForPath(pathname, match.loaderData)
            : scopeFromLoader(match.loaderData),
        )
        .find(Boolean)
    : undefined;
  const scope = currentPage?.scope ?? detailScope;
  const zone = preference?.zone ?? browserZone;
  const conditions =
    currentPage?.conditions ??
    (scope && zone
      ? resolveBrowse(
          {
            workspaceId: scope.workspaceId ?? undefined,
            query: "",
            tags: [],
            layout: "list",
          },
          preference,
          zone,
          new Date(),
        )
      : null);
  const searchable = !!userId && !!scope && !!conditions && !accessError;
  const openPalette = () => {
    if (!scope || !conditions || !searchable || !userId) return;
    setSession({
      scope,
      conditions,
      location,
      userId,
      trigger:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
    });
  };
  const opener = useRef(openPalette);
  opener.current = openPalette;
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        opener.current();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    setSession((current) =>
      current?.location === location && current.userId === userId
        ? current
        : null,
    );
  }, [location, userId]);
  const close = () => {
    const trigger = session?.trigger;
    setSession(null);
    if (trigger?.isConnected) trigger.focus();
  };
  return (
    <BrowseContext
      value={{
        userId,
        preference,
        preferencesReady: stored?.userId === userId,
        notice,
        browserZone,
        zoneFailed,
        detectZone,
        savePreference,
        publish,
        openPalette,
        searchable,
        accessError,
        rejectAccess,
      }}
    >
      {children}
      {session &&
        session.location === location &&
        session.userId === userId &&
        searchable && (
          <SearchPalette
            key={`${session.location}:${session.scope.workspaceId}`}
            session={session}
            scopeName={paletteScopeName(session.scope, scope)}
            onClose={close}
          />
        )}
    </BrowseContext>
  );
}

export function SearchTrigger({ chip = false }: { chip?: boolean }) {
  const { openPalette, searchable } = useBrowseContext();
  return (
    <button
      type="button"
      className={chip ? "browse-chip" : "browse-search-trigger"}
      disabled={!searchable}
      onClick={openPalette}
      aria-keyshortcuts="Meta+K Control+K"
      title={
        searchable
          ? "この文脈のノートを検索（⌘K / Ctrl+K）"
          : "文脈を確認してから検索できます"
      }
    >
      {chip ? "＋ 絞り込み" : "検索"}
      <kbd>⌘K / Ctrl K</kbd>
    </button>
  );
}
