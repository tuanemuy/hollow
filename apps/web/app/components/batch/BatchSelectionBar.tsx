"use client";
import type { BrowsePage } from "@repo/core/application/browse/ports";
import type { BatchOperation } from "@repo/core/domain/batch/entity";
import { useEffect, useRef, useState, useTransition } from "react";
import { useBrowseContext } from "@/components/browse/BrowseContext";
import { ZipSelection } from "@/components/zip/ZipSelection";
import { selectBatchNotesFn } from "@/presentation/batchServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { BatchConfirmation } from "./BatchConfirmation";
import { BatchOperationPicker } from "./BatchOperationPicker";
import { useBatchSelection } from "./BatchSelectionProvider";
import {
  type BatchContext,
  batchSource,
  displayedIds,
  emptySelection,
  sameBatchContext,
  selectionFilterKey,
  selectVisible,
  selectWhole,
  wholeSelectionConditions,
} from "./model";

export function BatchSelectionBar({
  page,
  blocked,
}: {
  page: BrowsePage;
  blocked: boolean;
}) {
  const selection = useBatchSelection();
  const context = selection.context;
  if (!context) return null;
  return (
    <BatchSelectionBarInner
      key={JSON.stringify(context)}
      page={page}
      blocked={blocked}
      context={context}
    />
  );
}

function BatchSelectionBarInner({
  page,
  blocked,
  context,
}: {
  page: BrowsePage;
  blocked: boolean;
  context: BatchContext;
}) {
  const selection = useBatchSelection();
  const { userId } = useBrowseContext();
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [operation, setOperation] = useState<BatchOperation | null>(null);
  const [description, setDescription] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const mounted = useRef(true);
  const epoch = useRef(0);
  const target = JSON.stringify([selection.key, selection.selection.ids]);
  const current = useRef(target);
  if (current.current !== target) epoch.current++;
  current.current = target;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A changed fixed selection invalidates its confirmation UI.
  useEffect(() => {
    setPicking(false);
    setOperation(null);
    setError("");
  }, [target]);
  if (!userId || selection.key !== selectionFilterKey(page.conditions, userId))
    return null;
  const source = batchSource(page.scope.workspaceId, userId);
  const state = selection.selection;
  const disabled =
    blocked || pending || selection.accepting || selection.unresolved;
  const whole = () => {
    if (busy.current || disabled) return;
    busy.current = true;
    const ticket = selection.ticket();
    const requestEpoch = epoch.current;
    const valid = () =>
      mounted.current &&
      selection.valid(ticket) &&
      epoch.current === requestEpoch;
    setError("");
    start(async () => {
      try {
        const result = await selectBatchNotesFn({
          data: wholeSelectionConditions(page.conditions),
        });
        if (!valid()) return;
        if (result.kind === "too-many") {
          setError(
            "条件に一致するノートが500件を超えています。月やタグなどで分割してください。先頭500件だけの全選択は行いません。",
          );
          return;
        }
        const next = selectWhole(state, result.ids, result.identity);
        if (!next) {
          setError(
            "既存の固定選択と合わせて500件を超えます。選択を解除するか条件で分割してください。",
          );
          return;
        }
        selection.change(() => next);
        if (!result.ids.length)
          setError(
            "現在の条件に一致するノートは0件です。既存の固定選択は自動で置き換えていません。",
          );
      } catch (cause) {
        if (valid())
          setError(
            `全体の選択を取得できません。選択は変更していません。${displayError(cause)}`,
          );
      } finally {
        busy.current = false;
      }
    });
  };
  return (
    <section
      className="batch-selection"
      aria-label="ノートの一括選択"
      aria-busy={disabled}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={state.enabled}
        onClick={() =>
          selection.change((previous) =>
            previous.enabled
              ? emptySelection()
              : { ...previous, enabled: true },
          )
        }
      >
        {state.enabled ? "選択モードを終了" : "複数選択"}
      </button>
      {state.enabled && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = selectVisible(state, displayedIds(page));
              if (next) {
                selection.change(
                  (previous) =>
                    selectVisible(previous, displayedIds(page)) ?? previous,
                );
                setError("");
              } else
                setError(
                  "表示済みのノートと合わせて500件を超えます。分割して選択してください。",
                );
            }}
          >
            表示済みのノートを選択
          </button>
          <button type="button" disabled={disabled} onClick={whole}>
            {page.conditions.layout === "calendar"
              ? "この月の絞り込み結果全体を選択"
              : "絞り込み結果全体を選択"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              selection.change((previous) => ({
                ...previous,
                ids: [],
                origin: "visible",
              }))
            }
          >
            選択をすべて解除
          </button>
          <p>
            {state.ids.length} / 500件を固定選択。
            {state.origin === "whole"
              ? "取得時点の結果全体"
              : state.origin === "subset"
                ? "固定集合の一部（全体選択ではありません）"
                : "表示済み・個別選択"}
            。新しく一致したノートは追加しません。
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {state.enabled && state.ids.length > 0 && (
        <div className="batch-operation-bar">
          <span>{state.ids.length}件を選択中</span>
          {page.scope.canEdit && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPicking(true)}
            >
              一括操作を選ぶ
            </button>
          )}
          <ZipSelection context={context} ids={state.ids} disabled={disabled} />
          <span>
            {page.scope.canEdit
              ? "Driveは未提供です。"
              : "閲覧のみ：変更操作はできません。Driveは未提供です。"}
          </span>
        </div>
      )}
      {picking && page.scope.canEdit && (
        <BatchOperationPicker
          context={context}
          currentContext={selection.currentContext}
          ids={state.ids}
          source={source}
          onChoose={(next, label) => {
            if (!sameBatchContext(context, selection.currentContext())) return;
            setPicking(false);
            setOperation(next);
            setDescription(label);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {operation && page.scope.canEdit && (
        <BatchConfirmation
          context={context}
          currentContext={selection.currentContext}
          ids={state.ids}
          source={source}
          operation={operation}
          description={description}
          submitting={selection.accepting}
          onClose={() => setOperation(null)}
          onConfirm={(items) => {
            if (
              disabled ||
              !sameBatchContext(context, selection.currentContext())
            )
              return;
            selection.submit({
              requestId: crypto.randomUUID(),
              source,
              operation,
              items,
            });
            setOperation(null);
          }}
        />
      )}
    </section>
  );
}
