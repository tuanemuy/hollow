"use client";

import type { BatchAcceptInput } from "@repo/core/application/batch/ports";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { z } from "zod";
import { acceptBatchFn } from "@/presentation/batchServerFn";
import { browseRouteSchema } from "@/presentation/browseInput";
import { displayError } from "@/presentation/errorDisplay";
import {
  acceptanceInput,
  acceptsSelectionTicket,
  type BatchContext,
  emptySelection,
  ownsBatchAdmission,
  type Selection,
  selectionFilterKey,
  unknownBatchResult,
} from "./model";

type Ticket = { key: string; epoch: number };
type Admission = { actorId: string; actorEpoch: number; token: symbol };
type SelectionContext = {
  context: BatchContext | null;
  currentContext: () => BatchContext | null;
  key: string;
  selection: Selection;
  change: (change: (previous: Selection) => Selection) => void;
  ticket: () => Ticket;
  valid: (ticket: Ticket) => boolean;
  clear: () => void;
  accepting: boolean;
  unresolved: boolean;
  submit: (input: BatchAcceptInput) => void;
  watchIds: readonly string[];
  watchSignal: { id: string; revision: number } | null;
  watchParent: (id: string) => void;
};
const Context = createContext<SelectionContext | null>(null);
const actorContext = z.object({ user: z.object({ id: z.uuid() }) });
export function useBatchSelection() {
  const value = useContext(Context);
  if (!value) throw new Error("BatchSelectionProvider is required");
  return value;
}

export function BatchSelectionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const matches = useRouterState({ select: (state) => state.matches });
  const user = matches
    .map((match) => actorContext.safeParse(match.context))
    .find((result) => result.success);
  const userId = user?.success ? user.data.user.id : null;
  const location = useRouterState({ select: (state) => state.location });
  const parsed = browseRouteSchema.safeParse(location.search);
  const isList = /^\/notes\/?$/.test(location.pathname);
  const key =
    isList && parsed.success && userId
      ? selectionFilterKey(parsed.data, userId)
      : `outside:${userId}:${location.pathname}`;
  const current = useRef({
    key,
    epoch: 0,
    userId,
    actorEpoch: 0,
    mounted: true,
  });
  if (current.current.key !== key) current.current.epoch++;
  if (current.current.userId !== userId) current.current.actorEpoch++;
  current.current.key = key;
  current.current.userId = userId;
  const [stored, setStored] = useState({ key, selection: emptySelection() });
  const [receipt, setReceipt] = useState<{
    actorId: string;
    input: BatchAcceptInput;
    unknown: boolean;
    error: string;
  } | null>(null);
  const [accepted, setAccepted] = useState<{
    actorId: string;
    id: string;
    total: number;
    excluded: number;
  } | null>(null);
  const [observed, setObserved] = useState<{
    actorId: string | null;
    ids: readonly string[];
    revision: number;
  }>({ actorId: userId, ids: [], revision: 0 });
  const [pending, start] = useTransition();
  const [active, setActive] = useState<Admission | null>(null);
  const busy = useRef<Admission | null>(null);
  const accepting = pending && ownsBatchAdmission(current.current, active);
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  useEffect(() => {
    setStored({ key, selection: emptySelection() });
  }, [key]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A changed actor discards prior admission UI without replaying it.
  useEffect(() => {
    setReceipt(null);
    setAccepted(null);
  }, [userId]);
  const ticket = useCallback(
    () => ({ key: current.current.key, epoch: current.current.epoch }),
    [],
  );
  const valid = useCallback(
    (value: Ticket) => acceptsSelectionTicket(current.current, value),
    [],
  );
  const change = useCallback(
    (fn: (previous: Selection) => Selection) => {
      const target = ticket();
      setStored((previous) =>
        valid(target)
          ? {
              key: target.key,
              selection: fn(
                previous.key === target.key
                  ? previous.selection
                  : emptySelection(),
              ),
            }
          : previous,
      );
    },
    [ticket, valid],
  );
  const clear = useCallback(() => change(emptySelection), [change]);
  const watchParent = useCallback((id: string) => {
    const actorId = current.current.userId;
    setObserved((previous) => ({
      actorId,
      ids: [
        id,
        ...(previous.actorId === actorId
          ? previous.ids.filter((value) => value !== id)
          : []),
      ].slice(0, 50),
      revision: previous.revision + 1,
    }));
  }, []);
  const send = (input: BatchAcceptInput, repeat: boolean) => {
    if (
      !userId ||
      ownsBatchAdmission(current.current, busy.current) ||
      (!repeat && receipt?.actorId === userId)
    )
      return;
    const actorId = userId;
    const actorEpoch = current.current.actorEpoch;
    const token = Symbol("batch-accept");
    const selectionTicket = ticket();
    const admission = { actorId, actorEpoch, token };
    busy.current = admission;
    setActive(admission);
    const actorCurrent = () =>
      ownsBatchAdmission(current.current, admission) &&
      busy.current?.token === token;
    setAccepted(null);
    setReceipt({ actorId, input, unknown: false, error: "" });
    start(async () => {
      try {
        const result = await acceptBatchFn({ data: acceptanceInput(input) });
        if (!actorCurrent()) return;
        setAccepted({ actorId, ...result });
        watchParent(result.id);
        setReceipt(null);
        if (valid(selectionTicket)) clear();
      } catch (cause) {
        if (!actorCurrent()) return;
        setReceipt({
          actorId,
          input,
          unknown: unknownBatchResult(cause),
          error: displayError(cause),
        });
      } finally {
        try {
          if (actorCurrent()) await router.invalidate();
        } catch (cause) {
          if (actorCurrent())
            setReceipt((previous) =>
              previous
                ? {
                    ...previous,
                    error: `${previous.error} 一覧更新失敗：${displayError(cause)}`,
                  }
                : previous,
            );
        }
        if (busy.current?.token === token) busy.current = null;
        if (current.current.mounted)
          setActive((previous) =>
            previous?.token === token ? null : previous,
          );
      }
    });
  };
  const ownedReceipt = receipt?.actorId === userId ? receipt : null;
  const ownedAccepted = accepted?.actorId === userId ? accepted : null;
  const currentContext = () =>
    current.current.mounted && current.current.userId
      ? {
          actorId: current.current.userId,
          actorEpoch: current.current.actorEpoch,
          contextKey: current.current.key,
          contextEpoch: current.current.epoch,
        }
      : null;
  return (
    <Context
      value={{
        context: currentContext(),
        currentContext,
        key,
        selection:
          stored.key === key && isList ? stored.selection : emptySelection(),
        change,
        ticket,
        valid,
        clear,
        accepting,
        unresolved: !!ownedReceipt,
        submit: (input) => send(input, false),
        watchIds: observed.actorId === userId ? observed.ids : [],
        watchSignal:
          observed.actorId === userId && observed.ids[0]
            ? { id: observed.ids[0], revision: observed.revision }
            : null,
        watchParent,
      }}
    >
      {children}
      {ownedReceipt && (
        <aside className="batch-receipt" aria-live="polite">
          <p>
            {accepting
              ? "一括処理の受付を確認しています…"
              : ownedReceipt.unknown
                ? "受付結果は未確認です。新しい要求を作らず、同じ要求 ID・同じ内容で結果を確認してください。"
                : "処理を受け付けられませんでした。現在の対象と影響を確認し直してください。"}
          </p>
          {ownedReceipt.error && <p role="alert">{ownedReceipt.error}</p>}
          {ownedReceipt.unknown ? (
            <button
              type="button"
              disabled={accepting}
              onClick={() => send(ownedReceipt.input, true)}
            >
              同じ要求の結果を確認
            </button>
          ) : (
            <button
              type="button"
              disabled={accepting}
              onClick={() => setReceipt(null)}
            >
              確認をやり直す
            </button>
          )}
          <Link to="/notes/jobs">本人の処理履歴</Link>
        </aside>
      )}
      {ownedAccepted && (
        <aside className="batch-receipt" role="status">
          <p>
            {ownedAccepted.total}件の一括処理を受け付けました（対象外
            {ownedAccepted.excluded}
            件）。処理は画面を閉じても続きます。全件の完了ではありません。
          </p>
          <Link to="/notes/jobs" search={{ batchId: ownedAccepted.id }}>
            この処理の結果を確認
          </Link>
          <button type="button" onClick={() => setAccepted(null)}>
            閉じる
          </button>
        </aside>
      )}
    </Context>
  );
}
