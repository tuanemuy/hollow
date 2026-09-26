"use client";
import type { MoveScope } from "@repo/core/application/move/ports";
import type { TagReadPage } from "@repo/core/application/tag/ports";
import type { BatchOperation } from "@repo/core/domain/batch/entity";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { tagName } from "@repo/core/domain/tag/entity";
import { useEffect, useRef, useState, useTransition } from "react";
import { moveScopeKey } from "@/components/move/model";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import { getNoteFn } from "@/presentation/hollowNotes";
import { listMoveDestinationsFn } from "@/presentation/moveServerFn";
import { readTagsFn } from "@/presentation/tagServerFn";
import { BatchDialog } from "./BatchDialog";
import { type BatchContext, sameBatchContext, visibilityLabel } from "./model";

export function BatchOperationPicker({
  ids,
  source,
  onChoose,
  onClose,
  context,
  currentContext,
}: {
  ids: readonly string[];
  source: NoteOwner;
  onChoose: (operation: BatchOperation, description?: string) => void;
  onClose: () => void;
  context: BatchContext;
  currentContext: () => BatchContext | null;
}) {
  const [kind, setKind] = useState<
    "attach" | "detach" | "create" | "move" | "trash" | "sharing"
  >("attach");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [tags, setTags] = useState<TagReadPage | null>(null);
  const [tagAnchor, setTagAnchor] = useState<string | null>(null);
  const [nextTagNote, setNextTagNote] = useState(0);
  const [destinations, setDestinations] = useState<{
    items: readonly MoveScope[];
    next: string | null;
    noteId: string;
  } | null>(null);
  const [nextNote, setNextNote] = useState(0);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const stateKey = JSON.stringify([ids, source, kind, query]);
  const current = useRef({ key: stateKey, generation: 0, mounted: true });
  if (current.current.key !== stateKey) current.current.generation++;
  current.current.key = stateKey;
  const busy = useRef(false);
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Candidate pages belong to one fixed source, selection and query.
  useEffect(() => {
    setTags(null);
    setTagAnchor(null);
    setNextTagNote(0);
    setDestinations(null);
    setNextNote(0);
    setError("");
  }, [stateKey]);
  const run = (work: (valid: () => boolean) => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    const generation = current.current.generation;
    const valid = () =>
      current.current.mounted &&
      current.current.generation === generation &&
      sameBatchContext(context, currentContext());
    setError("");
    start(async () => {
      try {
        await work(valid);
      } catch (cause) {
        if (valid()) setError(displayError(cause));
      } finally {
        if (valid()) busy.current = false;
      }
    });
  };
  const readTags = (cursor?: string) =>
    run(async (valid) => {
      const candidates =
        cursor && tagAnchor
          ? [tagAnchor]
          : ids.slice(nextTagNote, nextTagNote + 50);
      for (const noteId of candidates) {
        try {
          const result = await readTagsFn({
            data: {
              purpose: "picker",
              noteId,
              query,
              ...(source.kind === "workspace"
                ? { workspaceId: source.workspaceId }
                : {}),
              ...(cursor ? { cursor } : {}),
            },
          });
          if (valid() && result.kind === "page") {
            setTags(result);
            setTagAnchor(noteId);
            setNextTagNote(0);
          }
          return;
        } catch (cause) {
          if (!valid()) return;
          if (cursor || extractSerializedError(cause).code !== "NOTE_NOT_FOUND")
            throw cause;
        }
      }
      if (valid()) {
        const next = nextTagNote + candidates.length;
        setNextTagNote(next < ids.length ? next : 0);
        setError(
          next < ids.length
            ? "この50件には現在操作できる対象がありません。候補を表示すると次の選択対象を確認します。"
            : "現在操作できる対象がありません。選択と権限を確認してください。",
        );
      }
    });
  const readDestinations = (after?: string) =>
    run(async (valid) => {
      if (after && destinations) {
        const note = await getNoteFn({ data: { id: destinations.noteId } });
        if (!valid()) return;
        if (
          !note.scope?.canEdit ||
          note.scope.workspaceId !==
            (source.kind === "workspace" ? source.workspaceId : null)
        ) {
          setDestinations(null);
          setNextNote(0);
          throw new Error(
            "起点のノートの所属または権限が変わりました。移動先を再取得してください。",
          );
        }
        const page = await listMoveDestinationsFn({
          data: { noteId: destinations.noteId, after },
        });
        if (valid()) setDestinations({ ...page, noteId: destinations.noteId });
        return;
      }
      const stop = Math.min(ids.length, nextNote + 50);
      for (let index = nextNote; index < stop; index++) {
        const noteId = ids[index];
        if (!noteId || !valid()) return;
        try {
          const note = await getNoteFn({ data: { id: noteId } });
          if (!valid()) return;
          if (
            !note.scope?.canEdit ||
            note.scope.workspaceId !==
              (source.kind === "workspace" ? source.workspaceId : null)
          )
            continue;
          const page = await listMoveDestinationsFn({ data: { noteId } });
          if (valid()) {
            setDestinations({ ...page, noteId });
            setNextNote(index);
          }
          return;
        } catch (cause) {
          if (!valid()) return;
          const { code } = extractSerializedError(cause);
          if (
            code !== "NOTE_NOT_FOUND" &&
            code !== "SCOPE_NOT_FOUND" &&
            code !== "MOVE_CONVERSION_ACTIVE"
          )
            throw cause;
        }
      }
      if (valid()) {
        setNextNote(stop);
        setError(
          stop < ids.length
            ? "この50件には移動先を確認できるノートがありません。次の選択対象を確認できます。"
            : "選択したノートの現在の移動先を取得できません。権限・所属・変換状態を確認してください。",
        );
      }
    });
  if (!sameBatchContext(context, currentContext())) return null;
  return (
    <BatchDialog
      context={context}
      currentContext={currentContext}
      title={`${ids.length}件の一括操作を選ぶ`}
      pending={pending}
      onClose={onClose}
    >
      <label>
        操作
        <select
          disabled={pending}
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          <option value="attach">タグを付ける</option>
          <option value="detach">タグを外す</option>
          <option value="create">新しい名前のタグを付ける</option>
          <option value="move">所属先を移動</option>
          <option value="trash">ゴミ箱へ移動</option>
          <option value="sharing">公開範囲を変更</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {pending && <p role="status">現在の候補を確認しています…</p>}
      {kind === "sharing" && (
        <section>
          <p>
            各ノートの現在の公開範囲と変更先を確認します。パスワードの一括設定やリンク再発行は行いません。
          </p>
          <div className="batch-actions">
            {(["private", "link", "public"] as const).map((visibility) => (
              <button
                key={visibility}
                type="button"
                disabled={pending}
                onClick={() => onChoose({ kind: "sharing", visibility })}
              >
                {visibilityLabel[visibility]}への変更を確認
              </button>
            ))}
          </div>
        </section>
      )}
      {(kind === "attach" || kind === "detach") && (
        <section>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              readTags();
            }}
          >
            <label>
              タグを探す
              <input
                value={query}
                maxLength={200}
                disabled={pending}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button type="submit" disabled={pending}>
              候補を表示
            </button>
          </form>
          <p>
            使用数0のタグも含みます。選択したタグ ID
            を固定し、削除後の同名タグへ置き換えません。
          </p>
          {tags && (
            <>
              <ul className="batch-choices">
                {[
                  ...(tags.exact &&
                  !tags.items.some((tag) => tag.id === tags.exact?.id)
                    ? [tags.exact]
                    : []),
                  ...tags.items,
                ].map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        onChoose(
                          { kind: "tag", change: { kind, tagId: tag.id } },
                          `タグ「${tag.name}」を${kind === "detach" ? "外します" : "付けます"}。`,
                        )
                      }
                    >
                      {tag.name}（使用{tag.active}件）
                    </button>
                  </li>
                ))}
              </ul>
              {!tags.items.length && <p>このページに候補はありません。</p>}
              <button
                type="button"
                disabled={pending}
                onClick={() => readTags()}
              >
                最初の50件
              </button>
              {tags.nextCursor && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (tags.nextCursor) readTags(tags.nextCursor);
                  }}
                >
                  次の50件
                </button>
              )}
            </>
          )}
          {kind === "attach" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setName(query);
                setKind("create");
              }}
            >
              候補とは別に、新しい名前を明示して付ける
            </button>
          )}
        </section>
      )}
      {kind === "create" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onChoose({
                kind: "tag",
                change: { kind: "create", name: tagName(name) },
              });
            } catch (cause) {
              setError(displayError(cause));
            }
          }}
        >
          <label>
            タグ名
            <input
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <p>
            1〜50文字。同名があればそのタグを使います。最初に成功したタグ ID
            を固定し、その後の削除・統合で同名の別タグを作り直しません。
          </p>
          <button type="submit">この名前で影響を確認</button>
        </form>
      )}
      {kind === "move" && (
        <section>
          <p>
            選択内で現在移動できるノートを起点に、編集可能な移動先を確認します。
          </p>
          <button
            type="button"
            disabled={pending || (!destinations && nextNote >= ids.length)}
            onClick={() => readDestinations()}
          >
            {destinations
              ? "移動先を再取得"
              : nextNote
                ? "次の選択対象から移動先を確認"
                : "移動先を表示"}
          </button>
          {destinations && (
            <>
              <ul className="batch-choices">
                {destinations.items
                  .filter(
                    (destination) =>
                      moveScopeKey(destination.owner) !== moveScopeKey(source),
                  )
                  .map((destination) => (
                    <li key={moveScopeKey(destination.owner)}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          onChoose({
                            kind: "move",
                            destination: destination.owner,
                          })
                        }
                      >
                        {destination.name}
                      </button>
                    </li>
                  ))}
              </ul>
              {!destinations.items.length && (
                <p>このページに移動先はありません。</p>
              )}
              {destinations.next && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (destinations.next) readDestinations(destinations.next);
                  }}
                >
                  次の50件
                </button>
              )}
            </>
          )}
        </section>
      )}
      {kind === "trash" && (
        <section>
          <p>
            完全削除ではありません。選択対象をゴミ箱へ移します。現在の処理状態と対象件数は次の画面で確認します。
          </p>
          <label>
            <input
              type="checkbox"
              checked={cancelProcessing}
              onChange={(event) => setCancelProcessing(event.target.checked)}
            />
            実行中の変換・参照処理がある場合、その処理の取消も含める
          </label>
          <button
            type="button"
            onClick={() => onChoose({ kind: "trash", cancelProcessing })}
          >
            影響を確認
          </button>
        </section>
      )}
      <button type="button" disabled={pending} onClick={onClose}>
        取消
      </button>
    </BatchDialog>
  );
}
