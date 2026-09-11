"use client";

import type {
  MoveAudiencePage,
  MovePreview,
  MoveScope,
} from "@repo/core/application/move/ports";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { displayError } from "@/presentation/errorDisplay";
import { getNoteFn } from "@/presentation/hollowNotes";
import {
  listMoveDestinationsFn,
  moveNoteFn,
  previewNoteMoveFn,
  readMoveAudienceFn,
} from "@/presentation/moveServerFn";
import { scopeSearch } from "@/presentation/workspaceInput";
import { MoveDialog } from "./MoveDialog";
import { MoveImpact } from "./MoveImpact";
import {
  acceptsMoveResponse,
  moveExpectedInput,
  moveFailure,
  moveScopeKey,
  moveSourceMatches,
} from "./model";

type Destinations = { items: readonly MoveScope[]; next: string | null };
type Step =
  | { kind: "destinations"; page: Destinations | null; first: boolean }
  | {
      kind: "preview";
      preview: MovePreview;
      gained: MoveAudiencePage;
      lost: MoveAudiencePage;
      gainedFirst: boolean;
      lostFirst: boolean;
    }
  | { kind: "recheck" };
type ReadRequest =
  | { kind: "destinations"; after?: string }
  | { kind: "preview"; destination: NoteOwner }
  | { kind: "audience"; direction: "gained" | "lost"; after?: string };

export function NoteMoveAction({
  noteId,
  version,
  title,
  scope,
  processing,
}: {
  noteId: string;
  version: number;
  title: string;
  scope: { workspaceId: string | null; name: string; canEdit: boolean };
  processing: boolean;
}) {
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const context = JSON.stringify([
    noteId,
    version,
    scope.workspaceId,
    scope.canEdit,
    location,
  ]);
  const locationMatches =
    pathname === `/notes/${noteId}` || pathname === `/notes/${noteId}/`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({
    kind: "destinations",
    page: null,
    first: true,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uncertainNote, setUncertainNote] = useState<string | null>(null);
  const [retry, setRetry] = useState<ReadRequest | null>(null);
  const [pending, start] = useTransition();
  const [stateContext, setStateContext] = useState(context);
  const current = useRef({
    context,
    request: null as symbol | null,
    mounted: true,
  });
  current.current.context = context;
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  useEffect(() => {
    setOpen(false);
    setStep({ kind: "destinations", page: null, first: true });
    setRetry(null);
    setError("");
    setNotice("");
    setStateContext(context);
  }, [context]);

  const begin = () => {
    if (current.current.request || !locationMatches) return null;
    const request = Symbol("note-move");
    current.current.request = request;
    const incoming = { context, request };
    return {
      valid: () => acceptsMoveResponse(current.current, incoming),
      finish: () => {
        if (current.current.request === request) current.current.request = null;
      },
    };
  };

  const close = () => {
    if (current.current.request) return;
    setOpen(false);
    setStep({ kind: "destinations", page: null, first: true });
    setRetry(null);
    setError("");
  };

  const read = (request: ReadRequest) => {
    if (!scope.canEdit || processing || uncertainNote === noteId) return;
    const operation = begin();
    if (!operation) return;
    const previous = step;
    setOpen(true);
    setError("");
    setNotice("");
    setRetry(null);
    start(async () => {
      try {
        if (request.kind === "destinations") {
          const page = await listMoveDestinationsFn({
            data: {
              noteId,
              ...(request.after ? { after: request.after } : {}),
            },
          });
          if (operation.valid())
            setStep({ kind: "destinations", page, first: !request.after });
        } else if (request.kind === "preview") {
          const preview = await previewNoteMoveFn({
            data: { noteId, destination: request.destination },
          });
          if (!operation.valid()) return;
          if (
            !moveSourceMatches(preview.expected, {
              id: noteId,
              version,
              workspaceId: scope.workspaceId,
            })
          ) {
            setStep({ kind: "recheck" });
            setError(
              "ノートの現在の所属または版が変わっています。現在状態を読み直してから移動先を選び直してください。",
            );
            return;
          }
          setStep({
            kind: "preview",
            preview,
            gained: preview.gained,
            lost: preview.lost,
            gainedFirst: true,
            lostFirst: true,
          });
        } else if (previous.kind === "preview") {
          const page = await readMoveAudienceFn({
            data: {
              expected: moveExpectedInput(previous.preview.expected),
              direction: request.direction,
              ...(request.after ? { after: request.after } : {}),
            },
          });
          if (operation.valid())
            setStep(
              request.direction === "gained"
                ? { ...previous, gained: page, gainedFirst: !request.after }
                : { ...previous, lost: page, lostFirst: !request.after },
            );
        }
      } catch (cause) {
        if (!operation.valid()) return;
        const failure = moveFailure(cause);
        if (
          failure === "access" ||
          failure === "changed" ||
          failure === "conversion"
        ) {
          setStep({ kind: "recheck" });
          setError(
            failure === "access"
              ? "現在の権限で移動情報を取得できません。ノートまたは移動先を利用できなくなった可能性があります。"
              : displayError(cause),
          );
        } else {
          setError(
            `移動情報を取得できませんでした。移動は実行していません。${displayError(cause)}`,
          );
          setRetry(request);
        }
      } finally {
        operation.finish();
      }
    });
  };

  const openCurrent = async (valid: () => boolean) => {
    const note = await getNoteFn({ data: { id: noteId } });
    if (!valid()) return;
    if (!note.scope) throw new Error("Current scope unavailable");
    setUncertainNote(null);
    await router.navigate({
      to: "/notes/$noteId",
      params: { noteId },
      search: scopeSearch(note.scope.workspaceId),
      replace: true,
    });
  };

  const recheck = () => {
    const operation = begin();
    if (!operation) return;
    setError("");
    start(async () => {
      try {
        await openCurrent(operation.valid);
        if (operation.valid()) {
          setUncertainNote(null);
          setOpen(false);
          setNotice(
            "現在のノートを読み直しました。移動が必要なら、移動先と影響をあらためて確認してください。",
          );
        }
      } catch (cause) {
        if (operation.valid())
          setError(
            moveFailure(cause) === "access"
              ? "現在、このノートを開く権限がないか、ノートを利用できません。新しい所属先は表示できません。"
              : `現在状態を確認できません。移動要求は再送していません。${displayError(cause)}`,
          );
      } finally {
        try {
          await router.invalidate();
        } catch (cause) {
          if (operation.valid())
            setError(`現在の表示を更新できません。${displayError(cause)}`);
        }
        operation.finish();
      }
    });
  };

  const confirm = () => {
    if (
      step.kind !== "preview" ||
      retry ||
      !scope.canEdit ||
      processing ||
      uncertainNote === noteId
    )
      return;
    const operation = begin();
    if (!operation) return;
    const expected = step.preview.expected;
    setError("");
    start(async () => {
      let committed = false;
      try {
        await moveNoteFn({ data: moveExpectedInput(expected) });
        committed = true;
        if (!operation.valid()) return;
        setStep({ kind: "recheck" });
        setNotice(
          "移動の確定応答を受信しました。現在の閲覧権限を確認しています。",
        );
        await openCurrent(operation.valid);
        if (operation.valid()) {
          setOpen(false);
          setNotice("移動を完了し、現在のノートを読み直しました。");
        }
      } catch (cause) {
        if (!operation.valid()) return;
        setStep({ kind: "recheck" });
        setNotice("");
        const failure = moveFailure(cause);
        if (!committed && failure === "unknown") setUncertainNote(noteId);
        setError(
          committed
            ? "移動の確定応答は受信しましたが、現在のノートを開けません。現在状態を再確認してください。"
            : failure === "unknown"
              ? "移動要求の結果を確認できません。移動済みかどうかは未確認です。再送せず、現在状態を確認してください。"
              : failure === "changed"
                ? "条件が変わったため移動していません。現在状態を読み直し、移動先と影響を再確認してください。"
                : failure === "quota"
                  ? "移動先の容量を超えるため移動していません。タグや所属先の変更も行われていません。容量を確認してからやり直してください。"
                  : failure === "access"
                    ? "現在の権限では移動できません。ノートまたは移動先を利用できなくなった可能性があります。"
                    : `移動は拒否されました。${displayError(cause)}`,
        );
      } finally {
        try {
          await router.invalidate();
        } catch (cause) {
          if (operation.valid())
            setError(
              (previous) =>
                `${previous}${previous ? " " : ""}現在の表示を更新できません。${displayError(cause)}`,
            );
        }
        operation.finish();
      }
    });
  };

  if (!locationMatches) return null;
  const visible = stateContext === context;
  return (
    <div className="note-move-action">
      {scope.canEdit && (
        <button
          type="button"
          className="hollow-button"
          disabled={pending || processing || uncertainNote === noteId}
          onClick={() => read({ kind: "destinations" })}
        >
          移動
        </button>
      )}
      {scope.canEdit && processing && (
        <span className="hollow-help">変換・再生成中は移動できません。</span>
      )}
      {uncertainNote === noteId && (
        <div className="move-uncertain" role="status">
          <p>
            先ほどの移動要求の結果は未確認です。現在の表示が更新されても、その要求の完了を確認したことにはなりません。
          </p>
          <button type="button" disabled={pending} onClick={recheck}>
            要求を再送せず現在状態を確認
          </button>
        </div>
      )}
      {visible && !open && error && (
        <p role="alert" className="move-warning">
          {error}
        </p>
      )}
      {visible && notice && (
        <p role="status" className="move-notice">
          {notice}
        </p>
      )}
      {visible && open && (
        <MoveDialog pending={pending} onClose={close}>
          <p className="move-note-title">{title}</p>
          {error && (
            <p role="alert" className="move-warning">
              {error}
            </p>
          )}
          {pending && (
            <p role="status">
              {step.kind === "recheck"
                ? "現在状態を確認しています…"
                : "処理中です…"}
            </p>
          )}
          {step.kind === "destinations" && (
            <section>
              <h3>移動先を選ぶ</h3>
              <p>
                現在の所属先：{scope.name}
                。自分の個人領域と、現在編集できるワークスペースが候補です。
              </p>
              {step.page &&
                (step.page.items.length ? (
                  <ul className="move-destinations">
                    {step.page.items.map((destination) => (
                      <li key={moveScopeKey(destination.owner)}>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            read({
                              kind: "preview",
                              destination: destination.owner,
                            })
                          }
                        >
                          <span>{destination.name}</span>
                          <small>
                            {destination.owner.kind === "personal"
                              ? "個人"
                              : "ワークスペース"}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>このページに移動先はありません。</p>
                ))}
              <div className="move-actions">
                {!step.first && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => read({ kind: "destinations" })}
                  >
                    最初の50件に戻る
                  </button>
                )}
                {step.page?.next && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (step.page?.next)
                        read({ kind: "destinations", after: step.page.next });
                    }}
                  >
                    次の50件
                  </button>
                )}
              </div>
            </section>
          )}
          {step.kind === "preview" && (
            <>
              <MoveImpact
                preview={step.preview}
                gained={step.gained}
                lost={step.lost}
                gainedFirst={step.gainedFirst}
                lostFirst={step.lostFirst}
                pending={pending}
                onPage={(direction, after) =>
                  read({
                    kind: "audience",
                    direction,
                    ...(after ? { after } : {}),
                  })
                }
              />
              <div className="move-actions move-confirm">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => read({ kind: "destinations" })}
                >
                  移動先を選び直す
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    read({
                      kind: "preview",
                      destination: step.preview.expected.destination.owner,
                    })
                  }
                >
                  影響を再確認
                </button>
                <button
                  type="button"
                  className="hollow-button hollow-primary"
                  disabled={
                    pending ||
                    retry !== null ||
                    step.preview.destinationCapacity.after >
                      step.preview.destinationCapacity.limit
                  }
                  onClick={confirm}
                >
                  この内容で移動を確定
                </button>
              </div>
            </>
          )}
          {step.kind === "recheck" && (
            <button type="button" disabled={pending} onClick={recheck}>
              現在状態を読み直す
            </button>
          )}
          {retry && (
            <button
              type="button"
              disabled={pending}
              onClick={() => read(retry)}
            >
              情報の取得を再試行
            </button>
          )}
          <div className="move-actions">
            <button type="button" disabled={pending} onClick={close}>
              取消
            </button>
          </div>
        </MoveDialog>
      )}
    </div>
  );
}
