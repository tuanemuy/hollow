"use client";

import type { SharingView } from "@repo/core/application/sharing/settings";
import type {
  ShareExpected,
  ShareOperation,
} from "@repo/core/domain/sharing/entity";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  authorLabel,
  isSharingView,
  passwordError,
  type SharingActorProps,
  sameSharingActor,
  sharingAudience,
  sharingFailure,
  sharingProfileHref,
} from "./model";
import { readSharingLink } from "./readLink";
import { SharingDialog } from "./SharingDialog";
import { useSharingOperation } from "./useSharingOperation";
import "./sharing.css";

export type SharingPanelProps = SharingActorProps &
  Readonly<{
    noteId: string;
    load: () => Promise<SharingView>;
    change: (input: {
      expected: ShareExpected;
      operation: ShareOperation;
    }) => Promise<SharingView>;
    getLink: (expected: ShareExpected) => Promise<{ url: string }>;
    onChanged: () => void;
    profileHref: string;
    onClose: () => void;
  }>;

export function SharingPanel(props: SharingPanelProps) {
  return (
    <Panel
      key={`${props.actorId}:${props.actorEpoch}:${props.noteId}`}
      {...props}
    />
  );
}

function Panel(props: SharingPanelProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const operation = useSharingOperation(props);
  const titleId = useId();
  const passwordId = useId();
  const urlId = useId();
  const [view, setView] = useState<SharingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState<{
    expected: ShareExpected;
    operation: ShareOperation;
  } | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const publicLinkInput = useRef<HTMLInputElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const mainHeading = useRef<HTMLHeadingElement>(null);
  const { run, current } = operation;

  const readLink = useCallback(
    async (result: SharingView, valid: () => boolean) => {
      const link = await readSharingLink(result, valid, (expected) =>
        callbacks.current.getLink(expected),
      );
      if (!valid() || link.kind === "stale") return;
      if (link.kind === "ready") setUrl(link.url);
      else if (link.kind === "failed") {
        setUrl(null);
        setError(`共有リンクを読み取れませんでした。${link.failure.message}`);
        if (
          link.failure.kind === "access" ||
          link.failure.kind === "conflict"
        ) {
          setReloadRequired(true);
          setView(null);
        }
      }
    },
    [],
  );

  const load = (wasUnknown = unknown) =>
    run(async (valid) => {
      setError(null);
      setUrl(null);
      setConfirmation(null);
      try {
        const result = await callbacks.current.load();
        if (!valid()) return;
        if (!isSharingView(result, props.actorId, props.noteId)) {
          setView(null);
          setReloadRequired(true);
          setError(
            "現在の利用者とノートを確認できません。開き直してください。",
          );
          return;
        }
        setView(result);
        setReloadRequired(false);
        setNotice(
          wasUnknown
            ? "現在の設定を取得しました。先ほどの操作が成功したかは、この表示だけでは確認できません。自動再送は行っていません。"
            : null,
        );
        await readLink(result, valid);
      } catch (cause) {
        if (!valid()) return;
        const failure = sharingFailure(cause);
        setError(failure.message);
        setReloadRequired(true);
        if (failure.kind === "access") setView(null);
      }
    });

  useEffect(() => {
    run(async (valid) => {
      try {
        const result = await callbacks.current.load();
        if (!valid()) return;
        if (isSharingView(result, props.actorId, props.noteId)) {
          setView(result);
          await readLink(result, valid);
        } else
          setError(
            "現在の利用者とノートを確認できません。開き直してください。",
          );
      } catch (cause) {
        if (valid()) {
          setError(sharingFailure(cause).message);
          setReloadRequired(true);
        }
      }
    });
  }, [run, readLink, props.actorId, props.noteId]);

  useEffect(() => {
    if (confirmation && current()) confirmationHeading.current?.focus();
  }, [confirmation, current]);

  const close = () => {
    if (current() && !operation.busy) callbacks.current.onClose();
  };
  const cancelConfirmation = () => {
    if (!current() || operation.busy) return;
    setConfirmation(null);
    mainHeading.current?.focus();
  };
  const ask = (next: ShareOperation) => {
    if (!current() || operation.busy || !view?.canEdit || reloadRequired)
      return;
    setError(null);
    setNotice(null);
    setConfirmation({ expected: view.expected, operation: next });
  };
  const submit = () => {
    if (!confirmation || !view?.canEdit || reloadRequired) return;
    const input = confirmation;
    run(async (valid) => {
      setError(null);
      setNotice(null);
      setUrl(null);
      setPassword("");
      let result: SharingView;
      try {
        result = await callbacks.current.change(input);
      } catch (cause) {
        if (!valid()) return;
        const failure = sharingFailure(cause);
        setConfirmation(null);
        setError(failure.message);
        if (failure.kind === "unknown") {
          setUnknown(true);
          setReloadRequired(true);
        }
        if (failure.kind === "conflict" || failure.kind === "access")
          setReloadRequired(true);
        if (failure.kind === "access") setView(null);
        return;
      }
      if (!valid()) return;
      if (!isSharingView(result, props.actorId, props.noteId)) {
        setView(null);
        setConfirmation(null);
        setReloadRequired(true);
        setUnknown(true);
        setError("変更の応答を確認できません。現在の設定を取得してください。");
        return;
      }
      setView(result);
      setConfirmation(null);
      setUnknown(false);
      setNotice("共有設定を変更しました。");
      mainHeading.current?.focus();
      await readLink(result, valid);
      if (valid()) callbacks.current.onChanged();
    });
  };
  const reveal = () => {
    if (!view?.canEdit || view.visibility === "private" || reloadRequired)
      return;
    const expected = view.expected;
    run(async (valid) => {
      setError(null);
      setNotice(null);
      setUrl(null);
      await readLink({ ...view, expected }, valid);
    });
  };
  const copy = () => {
    if (
      !url ||
      !view?.canEdit ||
      view.visibility === "private" ||
      reloadRequired
    )
      return;
    const text = url;
    run(async (valid) => {
      setNotice(null);
      try {
        await navigator.clipboard.writeText(text);
        if (valid()) setNotice("共有リンクをコピーしました。");
      } catch {
        if (valid()) {
          setNotice(
            "コピーできませんでした。下のリンクを選択してコピーしてください。",
          );
          linkInput.current?.focus();
          linkInput.current?.select();
        }
      }
    });
  };

  const copyPublic = () => {
    if (!view?.publicUrl || view.visibility !== "public" || reloadRequired)
      return;
    const text = view.publicUrl;
    run(async (valid) => {
      try {
        await navigator.clipboard.writeText(text);
        if (valid()) setNotice("公開URLをコピーしました。");
      } catch {
        if (valid()) {
          setNotice(
            "コピーできませんでした。公開URLを選択してコピーしてください。",
          );
          publicLinkInput.current?.focus();
          publicLinkInput.current?.select();
        }
      }
    });
  };

  if (!sameSharingActor(props.currentActor(), props.actorId, props.actorEpoch))
    return null;
  const editable =
    !!view?.canEdit && !reloadRequired && !operation.busy && !confirmation;
  const profileHref = sharingProfileHref(props.profileHref);
  const passwordIssue = passwordError(password);
  return (
    <SharingDialog
      titleId={titleId}
      current={current}
      onClose={confirmation ? cancelConfirmation : close}
      busy={operation.busy}
    >
      <div className="sharing-heading">
        <h2 id={titleId} tabIndex={-1} ref={mainHeading}>
          共有設定
        </h2>
        <button type="button" onClick={close} disabled={operation.busy}>
          閉じる
        </button>
      </div>
      <p className="sharing-muted">
        共有するのは保存済みの本文です。編集中の未保存内容は保存・破棄しません。
      </p>
      {operation.busy && <p role="status">確認しています…</p>}
      {error && (
        <p role="alert" className="sharing-error">
          {error}
        </p>
      )}
      {unknown && (
        <p className="sharing-warning">
          変更が受け付けられたか不明です。操作を自動では再送しません。「現在の設定を確認」で状態を確認してください。
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {(!view || reloadRequired || unknown) && (
        <button type="button" onClick={() => load()} disabled={operation.busy}>
          現在の設定を確認
        </button>
      )}
      {view && (
        <>
          <h3 className="sharing-note-title">{view.title || "無題"}</h3>
          <dl className="sharing-summary">
            <dt>閲覧できる人</dt>
            <dd>{sharingAudience(view)}</dd>
            <dt>著者</dt>
            <dd>{authorLabel(view.author)}</dd>
            <dt>パスワード</dt>
            <dd>
              {view.hasPassword ? "設定済み（値は表示しません）" : "なし"}
            </dd>
            <dt>共有リンク</dt>
            <dd>
              {view.hasLink
                ? view.visibility === "private"
                  ? "発行済み・現在は無効"
                  : "発行済み"
                : "未発行"}
            </dd>
          </dl>
          {view.visibility === "public" && view.publicUrl && (
            <div className="sharing-link">
              <label htmlFor={`${urlId}-public`}>
                公開URL（ハンドルや所有先の変更で変わりません）
              </label>
              <input
                id={`${urlId}-public`}
                ref={publicLinkInput}
                readOnly
                value={view.publicUrl}
                onFocus={(event) => {
                  if (current()) event.currentTarget.select();
                }}
              />
              <button
                type="button"
                onClick={copyPublic}
                disabled={operation.busy || reloadRequired}
              >
                公開URLをコピー
              </button>
              <a
                href={view.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                公開ページを開く
              </a>
            </div>
          )}
          {view.ownDisplayName === null && (
            <p>
              あなたの表示名は未設定です。未設定でも限定公開にできます。
              {profileHref && (
                <a
                  href={profileHref}
                  onClick={(event) => {
                    if (!current() || operation.busy) event.preventDefault();
                  }}
                >
                  表示名を設定
                </a>
              )}
            </p>
          )}
          {!view.canEdit && (
            <p>
              閲覧専用です。共有設定を変更したり、共有リンクを取得したりすることはできません。
            </p>
          )}
          {view.expected.scope.workspaceId && (
            <p>
              ワークスペース全体の公開設定とは別に、ノートを個別に公開できます。
              ワークスペースが非公開でも、公開ノートは誰でも閲覧できます。
            </p>
          )}
          {view.canEdit && (
            <>
              <div className="sharing-actions">
                <button
                  type="button"
                  disabled={!editable || view.visibility === "private"}
                  onClick={() =>
                    ask({ kind: "visibility", visibility: "private" })
                  }
                >
                  非公開にする
                </button>
                <button
                  type="button"
                  disabled={!editable || view.visibility === "link"}
                  onClick={() =>
                    ask({ kind: "visibility", visibility: "link" })
                  }
                >
                  限定公開にする
                </button>
                <button
                  type="button"
                  disabled={
                    !editable ||
                    view.visibility === "public" ||
                    view.publicPrerequisite !== null
                  }
                  onClick={() =>
                    ask({
                      kind: "visibility",
                      visibility: "public",
                      confirmPasswordRemoval: true,
                    })
                  }
                >
                  公開する
                </button>
              </div>
              {view.publicPrerequisite === "handle" && (
                <p>
                  公開には所有者のハンドルが必要です。
                  {profileHref && (
                    <a
                      href={profileHref}
                      onClick={(event) => {
                        if (!current() || operation.busy)
                          event.preventDefault();
                      }}
                    >
                      プロフィールを設定
                    </a>
                  )}
                </p>
              )}
              {view.publicPrerequisite === "slug" && (
                <p>
                  公開にはワークスペースのスラッグが必要です。オーナーが一般設定で設定してください。
                  {view.expected.scope.workspaceId && (
                    <a
                      href={`/workspaces/${view.expected.scope.workspaceId}/settings`}
                      onClick={(event) => {
                        if (!current() || operation.busy)
                          event.preventDefault();
                      }}
                    >
                      ワークスペース設定
                    </a>
                  )}
                </p>
              )}
              <p className="sharing-muted">
                限定公開は検索エンジンの対象になりません。リンクを知る人が閲覧できます。
                公開は誰でも閲覧でき、公開検索や検索エンジンの対象になります。すでに配信した内容や外部キャッシュの即時回収は保証されません。
              </p>
              {view.visibility === "private" && (
                <p>
                  非公開のままパスワード保護を準備できます。非公開中はリンクを表示しません。
                  {view.hasLink &&
                    "限定公開にすると同じリンクが使えます。閲覧時のパスワードは再入力が必要です。"}
                </p>
              )}
              {view.visibility !== "private" && (
                <div className="sharing-link">
                  <button type="button" onClick={reveal} disabled={!editable}>
                    共有リンクを表示
                  </button>
                  {url && (
                    <>
                      <label htmlFor={urlId}>
                        共有リンク（選択してコピーできます）
                      </label>
                      <input
                        id={urlId}
                        ref={linkInput}
                        type="text"
                        readOnly
                        value={url}
                        spellCheck={false}
                        autoComplete="off"
                        onFocus={(event) => {
                          if (current()) event.currentTarget.select();
                        }}
                      />
                      <button type="button" onClick={copy} disabled={!editable}>
                        コピー
                      </button>
                    </>
                  )}
                </div>
              )}
              {view.hasLink && (
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => ask({ kind: "regenerate" })}
                >
                  リンクを再発行
                </button>
              )}
              {view.visibility !== "public" && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!passwordIssue) ask({ kind: "password", password });
                  }}
                >
                  <label htmlFor={passwordId}>
                    {view.hasPassword
                      ? "新しいパスワード"
                      : "パスワードで保護する（任意）"}
                  </label>
                  <input
                    id={passwordId}
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    disabled={!editable}
                    onChange={(event) => {
                      if (current()) setPassword(event.target.value);
                    }}
                    aria-describedby={`${passwordId}-help`}
                  />
                  <p id={`${passwordId}-help`} className="sharing-muted">
                    8文字以上、UTF-8で1024バイト以内。前後の空白もそのまま使います。
                  </p>
                  {password && passwordIssue && (
                    <p className="sharing-error">{passwordIssue}</p>
                  )}
                  <button type="submit" disabled={!editable || !!passwordIssue}>
                    {view.hasPassword ? "パスワードを変更" : "パスワードを設定"}
                  </button>
                </form>
              )}
              {view.hasPassword && (
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => ask({ kind: "remove-password" })}
                >
                  パスワードを解除
                </button>
              )}
            </>
          )}
        </>
      )}
      {confirmation && (
        <section
          className="sharing-confirm"
          aria-labelledby={`${titleId}-confirm`}
        >
          <h3 id={`${titleId}-confirm`} ref={confirmationHeading} tabIndex={-1}>
            共有設定の変更を確認
          </h3>
          <p>{confirmationText(confirmation.operation)}</p>
          <div className="sharing-actions">
            <button
              type="button"
              onClick={cancelConfirmation}
              disabled={operation.busy}
            >
              取り消す
            </button>
            <button
              type="button"
              className={
                confirmation.operation.kind === "regenerate" ||
                (confirmation.operation.kind === "visibility" &&
                  confirmation.operation.visibility !== "public")
                  ? "hollow-destructive"
                  : undefined
              }
              onClick={submit}
              disabled={operation.busy}
            >
              変更を確定
            </button>
          </div>
        </section>
      )}
    </SharingDialog>
  );
}

function confirmationText(operation: ShareOperation) {
  switch (operation.kind) {
    case "regenerate":
      return "古い限定リンクは使えなくなります。パスワード設定と公開URLは維持します。非公開中なら非公開のままです。";
    case "password":
      return "パスワードを保存すると、すでに通過した閲覧者も再入力が必要になります。";
    case "remove-password":
      return "限定公開中は、リンクを知る全員がパスワードなしで閲覧できるようになります。非公開中は非公開のままです。";
    case "visibility":
      return operation.visibility === "private"
        ? "公開ページと共有リンクから閲覧できなくなります。現在の所有者またはメンバーは引き続き閲覧できます。配信済み内容や検索エンジンの即時削除は保証されません。"
        : operation.visibility === "public"
          ? "保存済みの本文を誰でも閲覧できるようにし、公開検索の対象にします。パスワードがある場合は解除し、以前の通過許可を失効させます。公開しますか？"
          : "保存済みの本文を、共有リンクを知っている人が閲覧できるようになります。公開ページは無効になります。パスワード設定がある場合は通過が必要です。";
  }
}
