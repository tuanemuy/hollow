"use client";

import type { DisplayNameProfile } from "@repo/core/domain/sharing/entity";
import { useId, useRef, useState } from "react";
import {
  displayNameError,
  type SharingActorProps,
  sameSharingActor,
  sharingFailure,
  sharingReturnHref,
} from "./model";
import { useSharingOperation } from "./useSharingOperation";
import "./sharing.css";

export type DisplayNameIslandProps = SharingActorProps &
  Readonly<{
    initial: DisplayNameProfile;
    save: (input: {
      value: string;
      expectedVersion: number;
    }) => Promise<DisplayNameProfile>;
    refresh: () => Promise<DisplayNameProfile>;
    returnHref?: string;
    onSaved: () => void;
  }>;

export function DisplayNameIsland(props: DisplayNameIslandProps) {
  return (
    <DisplayNameForm key={`${props.actorId}:${props.actorEpoch}`} {...props} />
  );
}

function DisplayNameForm(props: DisplayNameIslandProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const operation = useSharingOperation(props);
  const inputId = useId();
  const ownInitial =
    props.initial.accountId === props.actorId ? props.initial : null;
  const [profile, setProfile] = useState<DisplayNameProfile | null>(ownInitial);
  const [value, setValue] = useState(ownInitial?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(!ownInitial);
  const [unknown, setUnknown] = useState(false);
  const issue = displayNameError(value);
  const returnHref = sharingReturnHref(props.returnHref);

  const refresh = () =>
    operation.run(async (valid) => {
      setError(null);
      setNotice(null);
      let result: DisplayNameProfile;
      try {
        result = await callbacks.current.refresh();
      } catch (cause) {
        if (!valid()) return;
        const failure = sharingFailure(cause);
        setError(failure.message);
        setRefreshRequired(true);
        if (failure.kind === "access") setProfile(null);
        return;
      }
      if (!valid()) return;
      if (result.accountId !== props.actorId) {
        setProfile(null);
        setRefreshRequired(true);
        setError("現在の利用者を確認できません。設定を開き直してください。");
        return;
      }
      setProfile(result);
      setRefreshRequired(false);
      setNotice(
        "現在の設定を取得しました。入力中の表示名は保持しています。保存する場合は内容を確認して、もう一度保存してください。",
      );
    });

  const save = () => {
    if (!profile || issue || refreshRequired) return;
    const input = { value, expectedVersion: profile.version };
    operation.run(async (valid) => {
      setError(null);
      setNotice(null);
      let result: DisplayNameProfile;
      try {
        result = await callbacks.current.save(input);
      } catch (cause) {
        if (!valid()) return;
        const failure = sharingFailure(cause);
        setError(failure.message);
        if (failure.kind === "unknown") {
          setUnknown(true);
          setRefreshRequired(true);
        }
        if (failure.kind === "conflict" || failure.kind === "access")
          setRefreshRequired(true);
        if (failure.kind === "access") setProfile(null);
        return;
      }
      if (!valid()) return;
      if (result.accountId !== props.actorId) {
        setProfile(null);
        setUnknown(true);
        setRefreshRequired(true);
        setError("保存の応答を確認できません。現在の設定を確認してください。");
        return;
      }
      setProfile(result);
      setValue(result.displayName ?? "");
      setUnknown(false);
      setNotice("表示名を保存しました。");
      callbacks.current.onSaved();
    });
  };

  if (!sameSharingActor(props.currentActor(), props.actorId, props.actorEpoch))
    return null;
  return (
    <section
      className="sharing-profile"
      aria-labelledby={`${inputId}-title`}
      aria-busy={operation.busy}
    >
      <h2 id={`${inputId}-title`}>表示名</h2>
      <p>
        共有ノートの著者名として表示されます。メールアドレスは表示名として公開しません。
      </p>
      {error && (
        <p role="alert" className="sharing-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {unknown && (
        <p className="sharing-warning">
          保存結果は不明です。同じ名前が表示されても、先ほどの保存成功とは判断できません。自動で再送しません。
        </p>
      )}
      {operation.busy && <p role="status">確認しています…</p>}
      {profile && <p>現在の表示名: {profile.displayName ?? "表示名未設定"}</p>}
      {profile && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <label htmlFor={inputId}>新しい表示名</label>
          <input
            id={inputId}
            type="text"
            autoComplete="nickname"
            value={value}
            disabled={operation.busy}
            onChange={(event) => {
              if (operation.current()) setValue(event.target.value);
            }}
            aria-invalid={!!issue}
            aria-describedby={`${inputId}-help`}
          />
          <p id={`${inputId}-help`} className="sharing-muted">
            前後の空白を除いて50文字まで。空欄で保存すると「表示名未設定」になります。改行・制御文字は使えません。
          </p>
          {issue && <p className="sharing-error">{issue}</p>}
          <button
            type="submit"
            disabled={operation.busy || refreshRequired || !!issue}
          >
            表示名を保存
          </button>
        </form>
      )}
      <button type="button" onClick={refresh} disabled={operation.busy}>
        現在の設定を確認
      </button>
      {returnHref && (
        <p>
          <a
            href={returnHref}
            onClick={(event) => {
              if (!operation.current() || operation.busy)
                event.preventDefault();
            }}
          >
            ノートの共有設定へ戻る
          </a>
          <span className="sharing-muted">
            （未保存の表示名は反映しません）
          </span>
        </p>
      )}
    </section>
  );
}
