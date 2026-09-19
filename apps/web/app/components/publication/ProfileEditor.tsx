"use client";

import type {
  HandleAvailability,
  ProfileView,
  SaveProfileInput,
} from "@repo/core/application/publication/views";
import { publicHandle } from "@repo/core/domain/account/profile";
import { useEffect, useId, useRef, useState } from "react";
import {
  draftAfterProfileResponse,
  iconInputIssue,
  needsHandleConfirmation,
  type ProfileDraft,
  type PublicationActorProps,
  profileDraft,
  profileIsDirty,
  profileIssues,
  publicationFailure,
  samePublicationActor,
  saveProfileInput,
} from "./model";
import { PublicationConfirmation } from "./PublicationConfirmation";
import { usePublicationOperation } from "./usePublicationOperation";
import "./publication.css";

export type ProfileEditorProps = PublicationActorProps &
  Readonly<{
    initial: ProfileView;
    save: (input: SaveProfileInput) => Promise<ProfileView>;
    refresh: () => Promise<ProfileView>;
    checkHandle: (handle: string) => Promise<HandleAvailability>;
    uploadIcon: (
      file: File,
      expectedProfileVersion: number,
    ) => Promise<ProfileView>;
    removeIcon: (expectedProfileVersion: number) => Promise<ProfileView>;
    onSaved?: (view: ProfileView) => void;
    onDirtyChange?: (dirty: boolean) => void;
  }>;

type Confirmation =
  | Readonly<{ kind: "profile"; input: SaveProfileInput; oldHandle: string }>
  | Readonly<{ kind: "remove-icon"; version: number }>;

export function ProfileEditor(props: ProfileEditorProps) {
  return (
    <ProfileForm key={`${props.actorId}:${props.actorEpoch}`} {...props} />
  );
}

function ProfileForm(props: ProfileEditorProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const operation = usePublicationOperation(props);
  const id = useId();
  const ownInitial =
    props.initial.actorId === props.actorId ? props.initial : null;
  const [profile, setProfile] = useState(ownInitial);
  const lastProfile = useRef(ownInitial);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    ownInitial
      ? profileDraft(ownInitial)
      : { displayName: "", handle: "", bio: "" },
  );
  const [file, setFile] = useState<File | null>(null);
  const [availability, setAvailability] = useState<HandleAvailability | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(!ownInitial);
  const [unknown, setUnknown] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [activity, setActivity] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const focusTarget = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef(false);
  const issues = profileIssues(draft);
  const invalid = Object.values(issues).some(Boolean);
  const dirty = Boolean(
    file || (lastProfile.current && profileIsDirty(draft, lastProfile.current)),
  );

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
      (focusTarget.current?.isConnected && !focusTarget.current.disabled
        ? focusTarget.current
        : refreshButton.current
      )?.focus();
    }
  }, [confirmation, operation.busy, operation.current]);

  const closeConfirmation = () => {
    if (!operation.current() || operation.busy) return;
    returnFocus.current = true;
    setConfirmation(null);
  };
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
    if (failure.kind === "access") setProfile(null);
  };
  const acceptResponse = (view: ProfileView, mutation: boolean) => {
    if (view.actorId === props.actorId) return true;
    setProfile(null);
    setRefreshRequired(true);
    if (mutation) setUnknown(true);
    setError(
      "現在の利用者の応答を確認できません。現在の設定を確認してください。",
    );
    return false;
  };
  const refresh = () =>
    operation.run(async (valid) => {
      setActivity("現在の設定を確認しています…");
      setError(null);
      setNotice(null);
      let view: ProfileView;
      try {
        view = await callbacks.current.refresh();
      } catch (cause) {
        if (valid()) fail(cause, false);
        return;
      }
      if (!valid() || !acceptResponse(view, false)) return;
      const initialized = lastProfile.current !== null;
      setDraft((previous) =>
        draftAfterProfileResponse(previous, view, "refresh", initialized),
      );
      lastProfile.current = view;
      setProfile(view);
      setRefreshRequired(false);
      setAvailability(null);
      setNotice(
        "現在の保存済み設定を取得しました。入力と選択中の画像は保持しています。内容を比較してから、必要な操作を明示的に行ってください。",
      );
    });

  const mutate = (
    work: () => Promise<ProfileView>,
    kind: "profile" | "upload" | "remove-icon",
  ) =>
    operation.run(async (valid) => {
      setActivity(
        kind === "profile"
          ? "プロフィールを保存しています…"
          : "アイコンを更新しています…",
      );
      setError(null);
      setNotice(null);
      let view: ProfileView;
      try {
        view = await work();
      } catch (cause) {
        if (!valid()) return;
        fail(cause, true);
        returnFocus.current = true;
        setConfirmation(null);
        return;
      }
      if (!valid()) return;
      returnFocus.current = true;
      setConfirmation(null);
      if (!acceptResponse(view, true)) return;
      lastProfile.current = view;
      setProfile(view);
      setRefreshRequired(false);
      setUnknown(false);
      if (kind === "profile") {
        setAvailability(null);
      } else if (kind === "upload") {
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
      }
      setDraft((previous) =>
        draftAfterProfileResponse(
          previous,
          view,
          kind === "profile" ? "save" : "icon",
        ),
      );
      setNotice(
        kind === "profile"
          ? "プロフィールを保存しました。"
          : kind === "upload"
            ? "アイコンを保存しました。名前・ハンドル・自己紹介の入力はまだ保存していません。"
            : "アイコンを削除しました。名前・ハンドル・自己紹介の入力はまだ保存していません。",
      );
      if (valid()) callbacks.current.onSaved?.(view);
    });

  const submitProfile = () => {
    if (
      !operation.current() ||
      operation.busy ||
      !profile ||
      refreshRequired ||
      invalid
    )
      return;
    focusTarget.current = saveButton.current;
    const input = saveProfileInput(draft, profile, false);
    if (needsHandleConfirmation(draft, profile) && profile.handle !== null) {
      focusTarget.current = saveButton.current;
      setConfirmation({ kind: "profile", input, oldHandle: profile.handle });
    } else mutate(() => callbacks.current.save(input), "profile");
  };
  const checkHandle = () => {
    if (!operation.current() || operation.busy || issues.handle) return;
    const handle = publicHandle(draft.handle);
    if (!handle) return;
    operation.run(async (valid) => {
      setActivity("ハンドルの空きを確認しています…");
      setError(null);
      setNotice(null);
      setAvailability(null);
      let result: HandleAvailability;
      try {
        result = await callbacks.current.checkHandle(handle);
      } catch (cause) {
        if (valid()) fail(cause, false);
        return;
      }
      if (!valid()) return;
      if (result.actorId !== props.actorId || result.handle !== handle) {
        setError(
          "ハンドル確認の応答が一致しません。もう一度確認してください。",
        );
        return;
      }
      setAvailability(result);
    });
  };
  const updateDraft = (field: keyof ProfileDraft, value: string) => {
    if (!operation.current() || operation.busy || confirmation) return;
    setDraft((previous) => ({ ...previous, [field]: value }));
    setNotice(null);
    if (field === "handle") setAvailability(null);
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
      <h2 id={`${id}-title`}>プロフィール</h2>
      <p>
        表示名・自己紹介・アイコンは公開ページとノートの著者表示に使われます。メールアドレスは公開しません。
      </p>
      {error && (
        <p className="publication-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {unknown && (
        <p className="publication-warning">
          直前の変更結果は不明です。現在の設定が入力と同じでも、その変更が成功したとは判断できません。自動で再送しません。
        </p>
      )}
      {refreshRequired && (
        <p className="publication-warning">
          変更前に「現在の設定を確認」で最新の版を取得してください。入力は保持しています。
        </p>
      )}
      {operation.busy && <p role="status">{activity}</p>}
      {profile && (
        <>
          <details className="publication-current">
            <summary>現在の保存済み設定</summary>
            <p>表示名: {profile.displayName ?? "表示名未設定"}</p>
            <p>ハンドル: {profile.handle ?? "未設定"}</p>
            <p>自己紹介: {profile.bio || "未設定"}</p>
          </details>
          {profile.url && (
            <a
              href={profile.url}
              onClick={(event) => {
                if (!operation.current() || operation.busy || confirmation)
                  event.preventDefault();
              }}
            >
              公開ページを見る
            </a>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitProfile();
            }}
          >
            <label htmlFor={`${id}-name`}>表示名</label>
            <input
              id={`${id}-name`}
              value={draft.displayName}
              autoComplete="nickname"
              disabled={operation.busy || !!confirmation}
              aria-invalid={!!issues.displayName}
              aria-describedby={`${id}-name-help`}
              onChange={(event) =>
                updateDraft("displayName", event.target.value)
              }
            />
            <p id={`${id}-name-help`} className="publication-muted">
              前後の空白を除いて50文字まで。空欄は「表示名未設定」となります。
            </p>
            {issues.displayName && (
              <p className="publication-error">{issues.displayName}</p>
            )}
            <label htmlFor={`${id}-handle`}>公開ハンドル</label>
            <input
              id={`${id}-handle`}
              value={draft.handle}
              autoCapitalize="none"
              spellCheck={false}
              disabled={operation.busy || !!confirmation}
              aria-invalid={!!issues.handle}
              aria-describedby={`${id}-handle-help`}
              onChange={(event) => updateDraft("handle", event.target.value)}
            />
            <p id={`${id}-handle-help`} className="publication-muted">
              3〜63文字の英小文字・数字・内部ハイフン。前後の空白を除き、英大文字は小文字になります。予約語は使えません。空欄で保存すると解除します。
            </p>
            {issues.handle && (
              <p className="publication-error">{issues.handle}</p>
            )}
            <div className="publication-actions">
              <button
                type="button"
                onClick={checkHandle}
                disabled={
                  operation.busy ||
                  !!confirmation ||
                  !!issues.handle ||
                  !draft.handle.trim()
                }
              >
                ハンドルの空きを確認
              </button>
            </div>
            {availability && (
              <div role="status">
                <p>
                  {availability.handle} は
                  {availability.available
                    ? "現在使用できます"
                    : "使用できません"}
                  。この確認では予約されません。
                </p>
                {availability.candidates.length > 0 && (
                  <>
                    <p>候補を入力欄へ入れる（保存は別操作）</p>
                    <ul className="publication-candidates">
                      {availability.candidates.slice(0, 3).map((candidate) => (
                        <li key={candidate}>
                          <button
                            type="button"
                            disabled={operation.busy || !!confirmation}
                            onClick={() => updateDraft("handle", candidate)}
                          >
                            {candidate}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            <label htmlFor={`${id}-bio`}>自己紹介</label>
            <textarea
              id={`${id}-bio`}
              value={draft.bio}
              disabled={operation.busy || !!confirmation}
              aria-invalid={!!issues.bio}
              aria-describedby={`${id}-bio-help`}
              onChange={(event) => updateDraft("bio", event.target.value)}
            />
            <p id={`${id}-bio-help`} className="publication-muted">
              前後の空白を除いて300文字まで。改行できます。HTMLは実行されません。現在{" "}
              {Array.from(draft.bio.trim()).length} 文字
            </p>
            {issues.bio && <p className="publication-error">{issues.bio}</p>}
            <div className="publication-actions">
              <button
                type="submit"
                ref={saveButton}
                disabled={
                  operation.busy || !!confirmation || refreshRequired || invalid
                }
              >
                プロフィールを保存
              </button>
            </div>
          </form>
          <section
            className="publication-icon"
            aria-labelledby={`${id}-icon-title`}
          >
            <h3 id={`${id}-icon-title`}>アイコン</h3>
            {profile.icon ? (
              <img
                src={profile.icon.url}
                alt="現在のプロフィールアイコン"
                width={80}
                height={80}
              />
            ) : (
              <p>アイコン未設定</p>
            )}
            <p className="publication-muted">
              PNG・JPEG・WebP、5
              MiB以内。512px以下の静止画像として保存します。画像だけを別に保存し、上の入力は変更しません。
            </p>
            <label htmlFor={`${id}-file`}>
              {profile.icon ? "新しい画像を選ぶ" : "画像を選ぶ"}
            </label>
            <input
              ref={fileInput}
              id={`${id}-file`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={operation.busy || !!confirmation}
              onChange={(event) => {
                if (!operation.current() || operation.busy || confirmation)
                  return;
                const selected = event.target.files?.[0] ?? null;
                const issue = selected ? iconInputIssue(selected) : null;
                setFile(issue ? null : selected);
                setError(issue);
                setNotice(null);
                if (issue) event.target.value = "";
              }}
            />
            {file && (
              <p className="publication-muted">
                選択中: {file.name}（まだ保存していません）
              </p>
            )}
            <div className="publication-actions">
              <button
                type="button"
                disabled={
                  operation.busy || !!confirmation || refreshRequired || !file
                }
                onClick={(event) => {
                  if (!operation.current() || !file || refreshRequired) return;
                  focusTarget.current = event.currentTarget;
                  const selected = file;
                  const version = profile.profileVersion;
                  mutate(
                    () => callbacks.current.uploadIcon(selected, version),
                    "upload",
                  );
                }}
              >
                {profile.icon ? "アイコンを変更" : "アイコンを保存"}
              </button>
              {file && (
                <button
                  type="button"
                  disabled={operation.busy || !!confirmation}
                  onClick={() => {
                    if (!operation.current()) return;
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  画像の選択を取り消す
                </button>
              )}
              {profile.icon && (
                <button
                  type="button"
                  disabled={operation.busy || !!confirmation || refreshRequired}
                  onClick={(event) => {
                    if (
                      !operation.current() ||
                      operation.busy ||
                      refreshRequired
                    )
                      return;
                    focusTarget.current = event.currentTarget;
                    setConfirmation({
                      kind: "remove-icon",
                      version: profile.profileVersion,
                    });
                  }}
                >
                  アイコンを削除
                </button>
              )}
            </div>
          </section>
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
      {confirmation && (
        <PublicationConfirmation
          titleId={`${id}-confirm`}
          current={operation.current}
          busy={operation.busy}
          onCancel={closeConfirmation}
        >
          <h3 id={`${id}-confirm`}>
            {confirmation.kind === "remove-icon"
              ? "アイコンを削除しますか？"
              : confirmation.input.handle
                ? "公開ハンドルを変更しますか？"
                : "公開ハンドルを解除しますか？"}
          </h3>
          {confirmation.kind === "profile" ? (
            <>
              <p>
                現在: {confirmation.oldHandle}
                <br />
                変更後: {confirmation.input.handle ?? "未設定"}
              </p>
              <p>
                旧プロフィールURLは新しいページへ転送されません。旧ハンドルは他の人が使えるようになります。公開ノートのURLと共有リンクは変わりません。
              </p>
              {!confirmation.input.handle && (
                <p>
                  本人所有の公開ノート（ゴミ箱を含む）がある場合は解除できません。先に公開状態や所属先を確認してください。
                </p>
              )}
              <p>入力した表示名・自己紹介も一緒に保存します。</p>
            </>
          ) : (
            <p>
              現在のアイコンを表示しなくなります。名前・ハンドル・自己紹介の入力は保存しません。
            </p>
          )}
          {operation.busy && <p role="status">{activity}</p>}
          <div className="publication-actions">
            <button
              type="button"
              disabled={operation.busy}
              onClick={closeConfirmation}
            >
              取り消す
            </button>
            <button
              type="button"
              disabled={operation.busy}
              onClick={() => {
                if (!operation.current() || operation.busy) return;
                if (confirmation.kind === "profile") {
                  const input = {
                    ...confirmation.input,
                    confirmHandleChange: true,
                  };
                  mutate(() => callbacks.current.save(input), "profile");
                } else {
                  const version = confirmation.version;
                  mutate(
                    () => callbacks.current.removeIcon(version),
                    "remove-icon",
                  );
                }
              }}
            >
              {confirmation.kind === "profile" ? "確認して保存" : "削除する"}
            </button>
          </div>
        </PublicationConfirmation>
      )}
    </section>
  );
}
