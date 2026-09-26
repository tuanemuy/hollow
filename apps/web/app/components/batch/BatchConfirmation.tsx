"use client";
import { aggregateMoveAmounts } from "@repo/core/application/batch/holding";
import type {
  BatchPreviewItem,
  BatchConfirmation as Confirmation,
} from "@repo/core/application/batch/ports";
import type { BatchOperation } from "@repo/core/domain/batch/entity";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { MoveImpact } from "@/components/move/MoveImpact";
import { moveBytes, moveExpectedInput } from "@/components/move/model";
import { previewBatchFn } from "@/presentation/batchServerFn";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import { readMoveAudienceFn } from "@/presentation/moveServerFn";
import { BatchDialog } from "./BatchDialog";
import {
  type BatchContext,
  batchOperationLabel,
  confirmationInput,
  sameBatchContext,
  visibilityLabel,
} from "./model";

export function BatchConfirmation({
  ids,
  source,
  operation,
  description,
  parent,
  submitting = false,
  onConfirm,
  onClose,
  context,
  currentContext,
}: {
  ids: readonly string[];
  source: NoteOwner;
  operation: BatchOperation;
  description?: string | undefined;
  parent?: { id: string; generation: number } | undefined;
  submitting?: boolean;
  onConfirm: (items: readonly Confirmation[]) => void;
  onClose: () => void;
  context: BatchContext;
  currentContext: () => BatchContext | null;
}) {
  const [confirmed, setConfirmed] = useState<readonly Confirmation[]>([]);
  const [page, setPage] = useState<readonly BatchPreviewItem[]>([]);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [prerequisite, setPrerequisite] = useState<"handle" | "slug" | null>(
    null,
  );
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [audienceFirst, setAudienceFirst] = useState<
    Record<string, { gained: boolean; lost: boolean }>
  >({});
  const key = JSON.stringify([ids, source, operation, parent]);
  const current = useRef({ key, epoch: 0, mounted: true });
  if (current.current.key !== key) current.current.epoch++;
  current.current.key = key;
  const busy = useRef(false);
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Confirmation pages cannot survive a changed fixed request.
  useEffect(() => {
    setConfirmed([]);
    setPage([]);
    setError("");
    setInvalid(false);
    setPrerequisite(null);
    setExpanded(null);
  }, [key]);
  const run = (work: (valid: () => boolean) => Promise<void>) => {
    if (busy.current || submitting) return;
    busy.current = true;
    const epoch = current.current.epoch;
    const valid = () =>
      current.current.mounted &&
      current.current.epoch === epoch &&
      sameBatchContext(context, currentContext());
    setError("");
    start(async () => {
      try {
        await work(valid);
      } catch (cause) {
        if (valid()) {
          setError(displayError(cause));
          setInvalid(true);
          const { kind, code } = extractSerializedError(cause);
          setPrerequisite(
            code === "SHARE_PUBLIC_HANDLE_REQUIRED"
              ? "handle"
              : code === "SHARE_PUBLIC_SLUG_REQUIRED"
                ? "slug"
                : null,
          );
          if (
            kind === "unauthorized" ||
            kind === "forbidden" ||
            kind === "notFound"
          ) {
            setPage([]);
            setConfirmed([]);
            setExpanded(null);
          }
        }
      } finally {
        if (valid()) busy.current = false;
      }
    });
  };
  const next = (restart = false) =>
    run(async (valid) => {
      const before = restart ? [] : confirmed;
      const nextIds = ids.slice(before.length, before.length + 50);
      if (!nextIds.length) return;
      const result = await previewBatchFn({
        data: {
          ids: [...nextIds],
          source,
          operation,
          ...(parent ? { parentId: parent.id } : {}),
        },
      });
      if (!valid()) return;
      if (
        result.items.length !== nextIds.length ||
        result.items.some((item, index) => item.noteId !== nextIds[index]) ||
        (parent && result.generation !== parent.generation)
      )
        throw new Error("確認対象が変わりました。処理を読み直してください。");
      const combined = [...before, ...result.items.map(confirmationInput)];
      aggregateMoveAmounts(
        combined.flatMap((item) =>
          item.kind === "ready" && item.expected.kind === "move"
            ? [item.expected.move]
            : [],
        ),
      );
      setConfirmed(combined);
      setPage(result.items);
      setExpanded(null);
      setAudienceFirst({});
      setInvalid(false);
    });
  const audience = (
    noteId: string,
    direction: "gained" | "lost",
    after?: string,
  ) =>
    run(async (valid) => {
      const item = page.find((value) => value.noteId === noteId);
      if (item?.kind !== "ready" || !item.move) return;
      const result = await readMoveAudienceFn({
        data: {
          expected: moveExpectedInput(item.move.expected),
          direction,
          ...(after ? { after } : {}),
        },
      });
      if (!valid()) return;
      setPage((previous) =>
        previous.map((value) =>
          value.noteId === noteId && value.kind === "ready" && value.move
            ? { ...value, move: { ...value.move, [direction]: result } }
            : value,
        ),
      );
      setAudienceFirst((previous) => ({
        ...previous,
        [noteId]: {
          ...(previous[noteId] ?? { gained: true, lost: true }),
          [direction]: !after,
        },
      }));
    });
  const ready = confirmed.filter((item) => item.kind === "ready");
  const excluded = confirmed.length - ready.length;
  let amounts: { sourceRelease: number; destinationIncrease: number } | null =
    null;
  try {
    amounts = aggregateMoveAmounts(
      ready.flatMap((item) =>
        item.expected.kind === "move" ? [item.expected.move] : [],
      ),
    );
  } catch {
    /* Mixed preview bases cannot be confirmed. */
  }
  const complete = confirmed.length === ids.length && ids.length > 0;
  const runningTrash = confirmed.filter(
    (item) =>
      item.kind === "ready" &&
      item.expected.kind === "trash" &&
      item.expected.hasRunningJobs,
  ).length;
  const unconfirmedTrash =
    operation.kind === "trash" &&
    !operation.cancelProcessing &&
    runningTrash > 0;
  const active = pending || submitting;
  const missingConsent =
    operation.kind === "sharing" &&
    operation.visibility === "public" &&
    ready.some(
      (item) =>
        item.expected.kind === "sharing" &&
        item.expected.snapshot.hasPassword &&
        item.consent?.kind !== "remove-password",
    );
  const pageNeedsConsent =
    operation.kind === "sharing" && operation.visibility === "public"
      ? page.filter(
          (item) =>
            item.kind === "ready" &&
            item.expected.kind === "sharing" &&
            item.expected.snapshot.hasPassword,
        )
      : [];
  const pageConsented =
    pageNeedsConsent.length > 0 &&
    pageNeedsConsent.every((item) =>
      confirmed.some(
        (entry) =>
          entry.kind === "ready" &&
          entry.noteId === item.noteId &&
          entry.consent?.kind === "remove-password",
      ),
    );
  const consentPage = (checked: boolean) =>
    setConfirmed((previous) =>
      previous.map((item) => {
        if (
          item.kind !== "ready" ||
          item.expected.kind !== "sharing" ||
          !pageNeedsConsent.some((p) => p.noteId === item.noteId)
        )
          return item;
        return {
          ...item,
          expected: item.expected,
          consent: checked
            ? {
                kind: "remove-password" as const,
                noteId: item.noteId,
                shareVersion: item.expected.snapshot.share.shareVersion,
              }
            : { kind: "none" as const },
        };
      }),
    );
  if (!sameBatchContext(context, currentContext())) return null;
  return (
    <BatchDialog
      context={context}
      currentContext={currentContext}
      title={parent ? "失敗した対象を同じ設定で再確認" : "一括操作の影響を確認"}
      pending={active}
      onClose={onClose}
    >
      <p>
        {batchOperationLabel(operation)} · 固定した選択 {ids.length}件
      </p>
      {description && <p>{description}</p>}
      {operation.kind === "sharing" && (
        <p>
          非公開は本人・所属メンバーだけ、限定リンクはリンクを知る人（保護済みならパスワードも必要）が閲覧できます。全体公開は誰でも閲覧でき、公開一覧・検索・外部検索の対象です。ワークスペースページを非公開にしても全体公開ノートは閲覧できます。限定リンクの再発行は行いません。
        </p>
      )}
      <p>
        確認済み {confirmed.length} / {ids.length}件。現在の実行対象{" "}
        {ready.length}件、対象外 {excluded}件。
      </p>
      <p>
        対象外は現在の権限・所属・状態から除外します。読めない対象のタイトルや新所属は表示しません。
      </p>
      {error && (
        <p role="alert" className="batch-warning">
          {error} 最新の影響を最初から確認してください。
        </p>
      )}
      {active && (
        <p role="status">
          {submitting
            ? "受付結果を確認しています…"
            : "現在の影響を読み取っています…"}
        </p>
      )}
      <ol
        aria-label="確認対象"
        className="batch-preview-list"
        start={Math.max(1, confirmed.length - page.length + 1)}
      >
        {page.map((item) => (
          <li key={item.noteId}>
            {item.kind === "excluded" ? (
              <span>現在は対象外</span>
            ) : (
              <>
                <h3>{item.title}</h3>
                {item.expected.kind === "sharing" &&
                  operation.kind === "sharing" && (
                    <>
                      <p>
                        {visibilityLabel[item.expected.snapshot.visibility]} →{" "}
                        {visibilityLabel[operation.visibility]}。
                        {item.expected.snapshot.visibility ===
                        operation.visibility
                          ? "現在と同じ範囲です。実行時も条件が同じなら変更不要として完了します。"
                          : "実行時の現在の条件を確認して変更します。"}
                      </p>
                      <p>
                        {item.expected.snapshot.share.scope.workspaceId
                          ? `${item.expected.snapshot.share.scope.name}・現在のメンバー${item.expected.snapshot.share.scope.memberCount}人`
                          : "個人ノート"}
                        。
                        {item.expected.snapshot.hasPassword
                          ? "限定リンクのパスワード設定あり。"
                          : "パスワード設定なし。"}
                      </p>
                      {item.expected.snapshot.body === "empty" && (
                        <p className="batch-warning">
                          保存済みの本文がありません。
                          {operation.visibility === "private"
                            ? "非公開への変更は実行できます。"
                            : "この子は理由付きの失敗となり、他の対象は続行します。"}
                        </p>
                      )}
                    </>
                  )}
                {item.expected.kind === "trash" && (
                  <p>
                    {item.expected.hasRunningJobs
                      ? "変換・参照処理が実行中です。"
                      : "確認時点で実行中の変換・参照処理はありません。"}{" "}
                    ゴミ箱への移動を確認します。
                  </p>
                )}
                {item.expected.kind === "tag" && (
                  <p>タグだけを変更します。本文・版・更新日時は変えません。</p>
                )}
                {item.move && (
                  <>
                    <p>
                      {item.move.expected.source.name} →{" "}
                      {item.move.expected.destination.name}。新たに閲覧できる人{" "}
                      {item.move.gained.total}人 / 閲覧できなくなる人{" "}
                      {item.move.lost.total}人。
                    </p>
                    {item.move.lost.total > 0 && (
                      <p className="batch-warning">
                        このノートを見られなくなる人がいます。
                      </p>
                    )}
                    <p>
                      タグは引き継がず、移動先の同名へ付け替えます。同名がない{" "}
                      {
                        item.move.expected.tags.filter(
                          (mapping) => !mapping.destination,
                        ).length
                      }
                      個は外れます。
                    </p>
                    <button
                      type="button"
                      disabled={active}
                      aria-expanded={expanded === item.noteId}
                      onClick={() =>
                        setExpanded(
                          expanded === item.noteId ? null : item.noteId,
                        )
                      }
                    >
                      人物・タグ・資源の詳細を確認
                    </button>
                    {expanded === item.noteId && (
                      <MoveImpact
                        preview={item.move}
                        gained={item.move.gained}
                        lost={item.move.lost}
                        gainedFirst={audienceFirst[item.noteId]?.gained ?? true}
                        lostFirst={audienceFirst[item.noteId]?.lost ?? true}
                        pending={active}
                        onPage={(direction, after) =>
                          audience(item.noteId, direction, after)
                        }
                      />
                    )}
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
      {prerequisite && (
        <p>
          設定後は一覧で対象を選び直してください。選択や処理を自動再開しません。
          {prerequisite === "handle" ? (
            <Link to="/settings/profile" onClick={onClose}>
              プロフィールを設定
            </Link>
          ) : source.kind === "workspace" ? (
            <Link
              to="/workspaces/$workspaceId/settings"
              params={{ workspaceId: source.workspaceId }}
              onClick={onClose}
            >
              ワークスペース設定を確認
            </Link>
          ) : null}
        </p>
      )}
      {pageNeedsConsent.length > 0 && (
        <label>
          <input
            type="checkbox"
            checked={pageConsented}
            disabled={active}
            onChange={(event) => consentPage(event.target.checked)}
          />
          このページの保護済み{pageNeedsConsent.length}
          件について、パスワードを解除し誰でも閲覧できる全体公開にすることを確認しました。
        </label>
      )}
      {operation.kind === "move" && confirmed.length > 0 && amounts && (
        <section>
          <h3>確認済み対象が全件成功した場合</h3>
          <p>
            移動元から {moveBytes(amounts.sourceRelease)}減少、移動先へ{" "}
            {moveBytes(amounts.destinationIncrease)}増加します。
          </p>
          <p>
            同じ共有原本の容量は所属先ごとに一度だけ計上した合計です。全件成功や容量予約の保証ではありません。各子の実行時に現在の容量を検査し、一部失敗なら実際の使用量は異なります。
          </p>
        </section>
      )}
      {unconfirmedTrash && (
        <p role="alert">
          {runningTrash}
          件に実行中の処理があります。処理取消を許可していないため、その対象は失敗する可能性があります。他の対象は継続します。取消を許可する場合は戻って設定し、影響を再確認してください。
        </p>
      )}
      {complete && ready.length === 0 && (
        <p role="status">全件が対象外です。処理は作成しません。</p>
      )}
      <div className="batch-actions">
        {!confirmed.length || invalid ? (
          <button type="button" disabled={active} onClick={() => next(true)}>
            最初の50件の影響を確認
          </button>
        ) : (
          !complete && (
            <button
              type="button"
              disabled={
                active || (pageNeedsConsent.length > 0 && !pageConsented)
              }
              onClick={() => next()}
            >
              このページを確認して次の50件へ
            </button>
          )
        )}
        {!!confirmed.length && !invalid && (
          <button type="button" disabled={active} onClick={() => next(true)}>
            最初から確認し直す
          </button>
        )}
        <button
          type="button"
          className="hollow-button hollow-primary"
          disabled={
            active ||
            invalid ||
            !complete ||
            !ready.length ||
            !amounts ||
            missingConsent
          }
          onClick={() => onConfirm(confirmed)}
        >
          {parent
            ? `${ready.length}件の再試行を受け付ける`
            : `${ready.length}件をこの内容で開始`}
        </button>
        <button type="button" disabled={active} onClick={onClose}>
          取消
        </button>
      </div>
    </BatchDialog>
  );
}
