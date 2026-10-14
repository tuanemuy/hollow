"use client";

import type {
  SetWorkspacePublicationInput,
  WorkspacePublicationView,
} from "@repo/core/application/publication/views";
import { useEffect, useId, useRef, useState } from "react";
import {
  isWorkspaceView,
  type PublicationActorProps,
  publicationFailure,
  reconcileWorkspaceLoader,
  samePublicationActor,
  selectionAfterWorkspaceResponse,
  workspaceViewKey,
} from "./model";
import { PublicationConfirmation } from "./PublicationConfirmation";
import { usePublicationOperation } from "./usePublicationOperation";
import "./publication.css";

export type WorkspacePublicationPanelProps = PublicationActorProps &
  Readonly<{
    initial: WorkspacePublicationView;
    save: (
      input: SetWorkspacePublicationInput,
    ) => Promise<WorkspacePublicationView>;
    refresh: () => Promise<WorkspacePublicationView>;
    onSaved?: (view: WorkspacePublicationView) => void;
    onDirtyChange?: (dirty: boolean) => void;
  }>;

export function WorkspacePublicationPanel(
  props: WorkspacePublicationPanelProps,
) {
  return (
    <WorkspacePublicationForm
      key={`${props.actorId}:${props.actorEpoch}:${props.initial.workspaceId}`}
      {...props}
    />
  );
}

function WorkspacePublicationForm(props: WorkspacePublicationPanelProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const operation = usePublicationOperation(props);
  const id = useId();
  const workspaceId = props.initial.workspaceId;
  const ownInitial =
    props.initial.actorId === props.actorId ? props.initial : null;
  const [view, setView] = useState(ownInitial);
  const lastView = useRef(ownInitial);
  const [selected, setSelected] = useState(ownInitial?.pagePublic ?? false);
  const [confirmation, setConfirmation] =
    useState<SetWorkspacePublicationInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unknown, setUnknown] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(!ownInitial);
  const [activity, setActivity] = useState("");
  const saveButton = useRef<HTMLButtonElement>(null);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const copyText = useRef<HTMLInputElement>(null);
  const returnFocus = useRef(false);
  const lastLoader = useRef(workspaceViewKey(ownInitial));
  const mutating = useRef(false);
  const run = (action: (valid: () => boolean) => Promise<void>) => {
    const loaderKey = workspaceViewKey(callbacks.current.initial);
    operation.run((valid) =>
      action(
        () =>
          valid() && workspaceViewKey(callbacks.current.initial) === loaderKey,
      ),
    );
  };
  const dirty = Boolean(
    lastView.current && selected !== lastView.current.pagePublic,
  );
  useEffect(() => {
    const next = props.initial;
    const key = workspaceViewKey(next);
    if (
      lastLoader.current === key ||
      !operation.current() ||
      !isWorkspaceView(next, props.actorId, workspaceId)
    )
      return;
    lastLoader.current = key;
    const reconciled = reconcileWorkspaceLoader(
      lastView.current,
      next,
      selected,
    );
    if (!reconciled) return;
    lastView.current = reconciled.view;
    setView(reconciled.view);
    setSelected(reconciled.selected);
    setConfirmation(null);
    if (confirmation) returnFocus.current = true;
    if (operation.busy) {
      setRefreshRequired(true);
      if (mutating.current) setUnknown(true);
    }
    setNotice(
      "保存済みの設定が更新されました。未保存の選択は保持しています。変更する場合は最新の内容を確認してください。",
    );
  }, [
    props.initial,
    props.actorId,
    workspaceId,
    selected,
    confirmation,
    operation.busy,
    operation.current,
  ]);
  useEffect(() => {
    if (operation.current()) callbacks.current.onDirtyChange?.(dirty);
  }, [dirty, operation.current]);
  useEffect(() => {
    if (
      !confirmation &&
      !operation.busy &&
      returnFocus.current &&
      operation.current()
    ) {
      returnFocus.current = false;
      (saveButton.current && !saveButton.current.disabled
        ? saveButton.current
        : refreshButton.current
      )?.focus();
    }
  }, [confirmation, operation.busy, operation.current]);

  const fail = (cause: unknown, mutation: boolean) => {
    const failure = publicationFailure(cause);
    setError(failure.message);
    if (mutation && failure.kind === "unknown") setUnknown(true);
    if (
      failure.kind === "conflict" ||
      failure.kind === "access" ||
      (mutation && failure.kind === "unknown")
    )
      setRefreshRequired(true);
    if (failure.kind === "access") setView(null);
  };
  const acceptResponse = (
    result: WorkspacePublicationView,
    mutation: boolean,
  ) => {
    if (isWorkspaceView(result, props.actorId, workspaceId)) return true;
    setView(null);
    setRefreshRequired(true);
    if (mutation) setUnknown(true);
    setError(
      "現在の利用者・ワークスペースの応答を確認できません。現在の設定を確認してください。",
    );
    return false;
  };
  const refresh = () =>
    run(async (valid) => {
      setActivity("現在の設定を確認しています…");
      setError(null);
      setNotice(null);
      let result: WorkspacePublicationView;
      try {
        result = await callbacks.current.refresh();
      } catch (cause) {
        if (valid()) fail(cause, false);
        return;
      }
      if (!valid() || !acceptResponse(result, false)) return;
      const initialized = lastView.current !== null;
      setSelected((previous) =>
        selectionAfterWorkspaceResponse(
          previous,
          result,
          "refresh",
          initialized,
        ),
      );
      lastView.current = result;
      setView(result);
      setRefreshRequired(false);
      setNotice(
        "現在の保存済み設定を取得しました。選択中の公開設定は保持しています。差を確認してから、必要な変更を明示的に保存してください。",
      );
    });
  const save = (input: SetWorkspacePublicationInput) =>
    run(async (valid) => {
      mutating.current = true;
      setActivity("公開設定を保存しています…");
      setError(null);
      setNotice(null);
      let result: WorkspacePublicationView;
      try {
        result = await callbacks.current.save(input);
      } catch (cause) {
        if (!valid()) return;
        fail(cause, true);
        returnFocus.current = true;
        setConfirmation(null);
        return;
      } finally {
        mutating.current = false;
      }
      if (!valid()) return;
      returnFocus.current = true;
      setConfirmation(null);
      if (!acceptResponse(result, true)) return;
      lastView.current = result;
      setView(result);
      setSelected((previous) =>
        selectionAfterWorkspaceResponse(previous, result, "save"),
      );
      setRefreshRequired(false);
      setUnknown(false);
      setNotice(
        result.pagePublic
          ? "ワークスペースの公開ページを公開しました。"
          : "ワークスペースの公開ページを非公開にしました。公開ノート自体は公開のままです。",
      );
      if (valid()) callbacks.current.onSaved?.(result);
    });
  const closeConfirmation = () => {
    if (!operation.current() || operation.busy) return;
    returnFocus.current = true;
    setConfirmation(null);
  };
  const copy = () => {
    if (!view?.url || !operation.current()) return;
    const url = view.url;
    run(async (valid) => {
      setActivity("公開ページのURLをコピーしています…");
      setNotice(null);
      setError(null);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        if (!valid()) return;
        setNotice(
          "コピーできませんでした。下のURLを選択して手動でコピーしてください。",
        );
        copyText.current?.focus();
        copyText.current?.select();
        return;
      }
      if (valid()) setNotice("公開ページのURLをコピーしました。");
    });
  };

  if (
    !samePublicationActor(props.currentActor(), props.actorId, props.actorEpoch)
  )
    return null;
  return (
    <section
      className="publication-panel"
      aria-labelledby={`${id}-title`}
      aria-busy={operation.busy}
    >
      <h2 id={`${id}-title`}>ワークスペースの公開ページ</h2>
      <p>
        公開ページには、公開ステータスのノートだけが並びます。ワークスペースのメンバー一覧は外部へ表示しません。
      </p>
      {error && (
        <p role="alert" className="publication-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {unknown && (
        <p className="publication-warning">
          直前の変更結果は不明です。現在の設定が同じでも、先ほどの変更成功とは判断できません。自動で再送しません。
        </p>
      )}
      {refreshRequired && (
        <p className="publication-warning">
          保存前に「現在の設定を確認」で最新の版を取得してください。選択は保持しています。
        </p>
      )}
      {operation.busy && <p role="status">{activity}</p>}
      {view && (
        <>
          <p className="publication-current">
            {view.name}
            <br />
            現在の保存済み設定: {view.pagePublic ? "公開" : "非公開"}
            <br />
            スラッグ: {view.slug ?? "未設定"}
          </p>
          {!view.canEdit && (
            <p className="publication-warning">
              公開設定を変更できるのはownerだけです。この画面は読み取り専用です。
            </p>
          )}
          {view.canEdit && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  !operation.current() ||
                  operation.busy ||
                  refreshRequired ||
                  (selected && !view.slug)
                )
                  return;
                setConfirmation({
                  workspaceId,
                  pagePublic: selected,
                  settingsVersion: view.settingsVersion,
                  publicationVersion: view.publicationVersion,
                });
              }}
            >
              <label className="publication-checkbox" htmlFor={`${id}-public`}>
                <input
                  id={`${id}-public`}
                  type="checkbox"
                  checked={selected}
                  disabled={operation.busy || !!confirmation}
                  onChange={(event) => {
                    if (!operation.current() || operation.busy || confirmation)
                      return;
                    setSelected(event.target.checked);
                    setNotice(null);
                  }}
                />
                公開ページを誰でも閲覧できるようにする
              </label>
              {selected && !view.slug && (
                <p className="publication-warning">
                  公開するには、先にワークスペースの一般設定でスラッグを設定してください。その後、この画面で現在の設定を確認してください。
                </p>
              )}
              <p className="publication-muted">
                公開しても、非公開・限定公開のノートは掲載されません。公開ノートが0件なら公開ページは空になります。
              </p>
              <p className="publication-muted">
                ページを非公開にしても、個々の公開ノートやそのURLは変わりません。検索エンジンからの削除には時間がかかる場合があります。
              </p>
              <div className="publication-actions">
                <button
                  type="submit"
                  ref={saveButton}
                  disabled={
                    operation.busy ||
                    !!confirmation ||
                    refreshRequired ||
                    (selected && !view.slug)
                  }
                >
                  公開設定を保存
                </button>
              </div>
            </form>
          )}
          {view.url && (
            <div className="publication-fields">
              <a
                href={view.url}
                onClick={(event) => {
                  if (!operation.current() || operation.busy || confirmation)
                    event.preventDefault();
                }}
              >
                公開ページを見る
              </a>
              <label htmlFor={`${id}-url`}>公開ページのURL</label>
              <input
                ref={copyText}
                id={`${id}-url`}
                readOnly
                value={view.url}
                onFocus={(event) => {
                  if (operation.current() && !confirmation)
                    event.currentTarget.select();
                }}
              />
              <div className="publication-actions">
                <button
                  type="button"
                  onClick={copy}
                  disabled={operation.busy || !!confirmation}
                >
                  URLをコピー
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="publication-actions">
        <button
          type="button"
          ref={refreshButton}
          onClick={refresh}
          disabled={operation.busy || !!confirmation}
        >
          現在の設定を確認
        </button>
      </div>
      {confirmation && view && (
        <PublicationConfirmation
          titleId={`${id}-confirm`}
          current={operation.current}
          busy={operation.busy}
          onCancel={closeConfirmation}
        >
          <h3 id={`${id}-confirm`}>
            {confirmation.pagePublic
              ? "公開ページを公開しますか？"
              : "公開ページを非公開にしますか？"}
          </h3>
          <p>対象: {view.name}</p>
          <p>
            {confirmation.pagePublic
              ? "名前・説明・アイコンと公開ノートの一覧を誰でも見られるようになり、検索エンジンの対象になります。非公開・限定公開のノートは掲載しません。"
              : "ワークスペースの公開ページは見られなくなります。個々の公開ノートは引き続き公開され、URLも変わりません。検索エンジンの登録が消えるまで時間がかかる場合があります。"}
          </p>
          {operation.busy && <p role="status">{activity}</p>}
          <div className="publication-actions">
            <button
              type="button"
              onClick={closeConfirmation}
              disabled={operation.busy}
            >
              取り消す
            </button>
            <button
              type="button"
              className={
                !confirmation.pagePublic ? "hollow-destructive" : undefined
              }
              disabled={operation.busy}
              onClick={() => {
                if (operation.current() && !operation.busy && view.canEdit)
                  save(confirmation);
              }}
            >
              {confirmation.pagePublic ? "公開する" : "非公開にする"}
            </button>
          </div>
        </PublicationConfirmation>
      )}
    </section>
  );
}
