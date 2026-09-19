"use client";

import type {
  InvitationView,
  MemberView,
  WorkspaceSettingsView,
} from "@repo/core/application/workspace/invitationViews";
import type { WorkspaceRole } from "@repo/core/domain/workspace/entity";
import { Link, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { displayError } from "@/presentation/errorDisplay";
import {
  cancelInvitationFn,
  changeWorkspaceMemberFn,
  copyInvitationFn,
  getWorkspaceSettingsFn,
  issueInvitationsFn,
  leaveWorkspaceFn,
  listInvitationsFn,
  resendInvitationFn,
  updateWorkspaceSettingsFn,
} from "@/presentation/hollowInvitations";
import { checkWorkspaceSlugFn } from "@/presentation/hollowWorkspace";
import {
  invitationEmails,
  invitationIssueSchema,
  workspaceRoleSchema,
} from "@/presentation/invitationInput";
import {
  scopeSearch,
  workspaceInputProblem,
} from "@/presentation/workspaceInput";
import { WorkspaceDeletionSettings } from "../workspace-deletion/WorkspaceDeletionProvider";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { WorkspaceScopeLabel } from "./WorkspaceScope";
import "./workspace-settings.css";

const roles: Record<WorkspaceRole, string> = {
  owner: "オーナー",
  editor: "編集者",
  viewer: "閲覧者",
};
const ownerWarning =
  "オーナーはメンバーの招待・権限変更・除名とワークスペース設定を管理できます。信頼できる人にだけ付与してください。";
type InvitationPage = {
  items: readonly InvitationView[];
  nextCursor: string | null;
};
const date = (value: string) =>
  new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

function RoleOptions() {
  return (
    <>
      {Object.entries(roles).map(([value, label]) => (
        <option value={value} key={value}>
          {label}
        </option>
      ))}
    </>
  );
}

export function WorkspaceSettings({
  initial,
  invitations,
}: {
  initial: WorkspaceSettingsView;
  invitations: InvitationPage | null;
}) {
  const [tab, setTab] = useState<"members" | "general">("members");
  return (
    <section className="hollow-workspace-settings">
      <WorkspaceScopeLabel
        scope={{
          workspaceId: initial.id,
          name: initial.name,
          canEdit: initial.role !== "viewer",
          iconId: initial.iconId,
        }}
      />
      <p className="hollow-eyebrow">ワークスペース設定</p>
      <h1>{initial.name}</h1>
      <Link to="/notes" search={scopeSearch(initial.id)}>
        ワークスペースのノートへ
      </Link>
      <nav className="hollow-settings-tabs" aria-label="設定の種類">
        <button
          type="button"
          className="hollow-button"
          aria-pressed={tab === "members"}
          onClick={() => setTab("members")}
        >
          メンバー
        </button>
        <button
          type="button"
          className="hollow-button"
          aria-pressed={tab === "general"}
          onClick={() => setTab("general")}
        >
          一般
        </button>
      </nav>
      <div hidden={tab !== "members"}>
        <MemberList initial={initial} />
        {initial.role === "owner" && invitations && (
          <InvitationManager workspaceId={initial.id} initial={invitations} />
        )}
        <LeaveWorkspace initial={initial} />
      </div>
      <div hidden={tab !== "general"}>
        <WorkspaceIcon initial={initial} />
        <GeneralSettings initial={initial} />
        {initial.role === "owner" && (
          <WorkspaceDeletionSettings
            workspaceId={initial.id}
            name={initial.name}
          />
        )}
      </div>
    </section>
  );
}

function GeneralSettings({ initial }: { initial: WorkspaceSettingsView }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => ({
    name: initial.name,
    description: initial.description,
    slug: initial.slug ?? "",
    settingsVersion: initial.settingsVersion,
  }));
  useEffect(() => {
    setDraft((old) =>
      old.name === initial.name &&
      old.description === initial.description &&
      old.slug === (initial.slug ?? "")
        ? { ...old, settingsVersion: initial.settingsVersion }
        : old,
    );
  }, [
    initial.name,
    initial.description,
    initial.slug,
    initial.settingsVersion,
  ]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState<{
    slug: string;
    available: boolean;
    suggestions: readonly string[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, start] = useTransition();
  const [optimistic, indicate] = useOptimistic(
    false,
    (_old, value: boolean) => value,
  );
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    setAvailability(null);
    setChecking(false);
    const slug = draft.slug;
    if (
      initial.role !== "owner" ||
      !slug ||
      slug === initial.slug ||
      workspaceInputProblem("valid", "", slug)
    )
      return;
    setChecking(true);
    const timer = setTimeout(() => {
      void checkWorkspaceSlugFn({ data: { slug } })
        .then((result) => {
          if (!disposed) setAvailability({ slug, ...result });
        })
        .catch(() => {
          if (!disposed) setAvailability(null);
        })
        .finally(() => {
          if (!disposed) setChecking(false);
        });
    }, 300);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [draft.slug, initial.slug, initial.role]);
  const owner = initial.role === "owner";
  return (
    <section aria-labelledby="workspace-general-heading">
      <h2 id="workspace-general-heading">一般設定</h2>
      {!owner && <p>オーナーだけが一般設定を変更できます。</p>}
      <form
        className="hollow-workspace-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!owner || busy.current) return;
          const problem = workspaceInputProblem(
            draft.name,
            draft.description,
            draft.slug,
          );
          if (problem) {
            setError(problem);
            return;
          }
          busy.current = true;
          const pathname = router.state.location.pathname;
          const current = () =>
            alive.current && pathname === router.state.location.pathname;
          start(async () => {
            indicate(true);
            setError("");
            setMessage("");
            try {
              await updateWorkspaceSettingsFn({
                data: { workspaceId: initial.id, ...draft },
              });
              if (!current()) return;
              const latest = await getWorkspaceSettingsFn({
                data: { workspaceId: initial.id },
              });
              if (!current()) return;
              setDraft({
                name: latest.name,
                description: latest.description,
                slug: latest.slug ?? "",
                settingsVersion: latest.settingsVersion,
              });
              setMessage("一般設定を保存しました。");
              await router.invalidate();
            } catch (cause) {
              if (current())
                setError(
                  `保存結果を確認できませんでした。入力は保持しています。別のオーナーによる変更と競合した場合は、最新の設定を読み込み直して編集してください。${displayError(cause)}`,
                );
            } finally {
              busy.current = false;
            }
          });
        }}
      >
        <label>
          名前（必須・100文字以内）
          <input
            name="workspace-name"
            required
            value={draft.name}
            readOnly={!owner}
            disabled={pending}
            onChange={(event) =>
              setDraft({ ...draft, name: event.currentTarget.value })
            }
          />
        </label>
        <p className="hollow-help">
          {Array.from(draft.name.trim()).length} / 100 文字
        </p>
        <label>
          説明（任意・2,000文字以内）
          <textarea
            name="workspace-description"
            value={draft.description}
            readOnly={!owner}
            disabled={pending}
            onChange={(event) =>
              setDraft({ ...draft, description: event.currentTarget.value })
            }
          />
        </label>
        <label>
          識別名（任意）
          <input
            name="workspace-slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={draft.slug}
            readOnly={!owner}
            disabled={pending}
            onChange={(event) =>
              setDraft({
                ...draft,
                slug: event.currentTarget.value.toLowerCase(),
              })
            }
          />
        </label>
        <p className="hollow-help">
          3〜63文字の英小文字・数字・内部のハイフン。空欄にできます。識別名を設定しても公開されません。
        </p>
        {checking && <p role="status">識別名の空きを確認中…</p>}
        {availability?.slug === draft.slug && (
          <div role="status">
            <p>
              {availability.available
                ? "現在、この識別名は利用可能です。保存時に最終確認します。"
                : "この識別名は利用できません。"}
            </p>
            {availability.suggestions.map((slug) => (
              <button
                type="button"
                className="hollow-button"
                key={slug}
                disabled={pending}
                onClick={() => setDraft({ ...draft, slug })}
              >
                {slug}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="hollow-message">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {owner && (
          <div className="hollow-actions">
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "編集中の一般設定を破棄し、最新の設定を読み込みますか？",
                  )
                )
                  return;
                start(async () => {
                  setError("");
                  try {
                    const latest = await getWorkspaceSettingsFn({
                      data: { workspaceId: initial.id },
                    });
                    if (!alive.current) return;
                    setDraft({
                      name: latest.name,
                      description: latest.description,
                      slug: latest.slug ?? "",
                      settingsVersion: latest.settingsVersion,
                    });
                    setMessage("最新の一般設定を読み込みました。");
                    await router.invalidate();
                  } catch (cause) {
                    if (alive.current) setError(displayError(cause));
                  }
                });
              }}
            >
              入力を取り消して最新を読込
            </button>
            <button
              type="submit"
              className="hollow-button hollow-primary"
              disabled={pending || availability?.available === false}
            >
              {pending || optimistic ? "保存中…" : "一般設定を保存"}
            </button>
          </div>
        )}
      </form>
      <p className="hollow-help">
        公開設定・ワークスペース全体の削除は、まだ利用できません。
      </p>
    </section>
  );
}

function MemberList({ initial }: { initial: WorkspaceSettingsView }) {
  const router = useRouter();
  const [page, setPage] = useState(initial);
  const [cursor, setCursor] = useState<string | null>(null);
  const [shownCursor, setShownCursor] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [members, removeOptimistic] = useOptimistic(
    page.members,
    (previous, accountId: string) =>
      previous.filter((member) => member.accountId !== accountId),
  );
  const generation = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ++generation.current;
    };
  }, []);
  useEffect(() => {
    ++generation.current;
    setPage(initial);
    setCursor(null);
    setShownCursor(null);
    setReading(false);
  }, [initial]);
  const read = (next: string | null) => {
    const ticket = ++generation.current;
    setCursor(next);
    setReading(true);
    setError("");
    void getWorkspaceSettingsFn({
      data: { workspaceId: initial.id, ...(next ? { cursor: next } : {}) },
    })
      .then((result) => {
        if (alive.current && ticket === generation.current) {
          setPage(result);
          setShownCursor(next);
        }
      })
      .catch((cause) => {
        if (alive.current && ticket === generation.current)
          setError(displayError(cause));
      })
      .finally(() => {
        if (alive.current && ticket === generation.current) setReading(false);
      });
  };
  return (
    <section aria-labelledby="workspace-members-heading">
      <h2 id="workspace-members-heading">メンバー</h2>
      {initial.role !== "owner" && <p>メンバー一覧は読み取り専用です。</p>}
      <p className="hollow-help">
        表示名が未設定の場合はメールアドレスを表示します。参加記録がない日付は「不明」と表示します。
      </p>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {reading && <p role="status">メンバーを読み込み中…</p>}
      {shownCursor !== cursor && (
        <p role="status">
          選択したページは未取得です。前回の一覧を表示しています。
        </p>
      )}
      <ul className="hollow-settings-list" aria-busy={reading || pending}>
        {members.map((member) => (
          <MemberRow
            key={member.accountId}
            member={member}
            workspaceId={initial.id}
            self={member.accountId === initial.accountId}
            owner={initial.role === "owner"}
            lastOwner={member.role === "owner" && page.ownerCount === 1}
            disabled={reading || pending || shownCursor !== cursor}
            onRemove={() => {
              if (
                !window.confirm(
                  `${member.email} を除名しますか？ このワークスペースのノートにアクセスできなくなります。作成したノートは残ります。`,
                )
              )
                return;
              const pathname = router.state.location.pathname;
              start(async () => {
                removeOptimistic(member.accountId);
                setError("");
                try {
                  await changeWorkspaceMemberFn({
                    data: {
                      workspaceId: initial.id,
                      accountId: member.accountId,
                      role: null,
                      expectedRole: member.role,
                      ownerConfirmed: false,
                    },
                  });
                  if (
                    !alive.current ||
                    pathname !== router.state.location.pathname
                  )
                    return;
                  await router.invalidate();
                } catch (cause) {
                  if (
                    alive.current &&
                    pathname === router.state.location.pathname
                  )
                    setError(
                      `除名結果を確認できませんでした。一覧を更新して確認してください。${displayError(cause)}`,
                    );
                }
              });
            }}
          />
        ))}
      </ul>
      {members.length === 0 && <p>このページにメンバーはいません。</p>}
      <nav className="hollow-trash-actions" aria-label="メンバーのページ移動">
        <button
          type="button"
          className="hollow-button"
          disabled={!cursor || pending || reading}
          onClick={() => read(null)}
        >
          先頭へ
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={
            !page.nextCursor || pending || reading || shownCursor !== cursor
          }
          onClick={() => {
            if (page.nextCursor) read(page.nextCursor);
          }}
        >
          次の50件
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={pending || reading}
          onClick={() => read(cursor)}
        >
          メンバーを更新
        </button>
      </nav>
    </section>
  );
}

function MemberRow({
  member,
  workspaceId,
  self,
  owner,
  lastOwner,
  disabled,
  onRemove,
}: {
  member: MemberView;
  workspaceId: string;
  self: boolean;
  owner: boolean;
  lastOwner: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, changeOptimistic] = useOptimistic(
    member.role,
    (_old, value: WorkspaceRole) => value,
  );
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <li>
      <div>
        <h3>
          {member.displayName ?? member.email}
          {self ? "（自分）" : ""}
        </h3>
        <p>{member.email}</p>
        <p>
          参加日：
          {member.joinedAt ? (
            <time dateTime={member.joinedAt}>{date(member.joinedAt)}</time>
          ) : (
            "不明"
          )}
        </p>
      </div>
      {owner && !self ? (
        <div className="hollow-settings-member-actions">
          <label>
            ロール
            <select
              aria-label={`${member.email} のロール`}
              value={role}
              disabled={disabled || pending || lastOwner}
              onChange={(event) => {
                const next = workspaceRoleSchema.parse(
                  event.currentTarget.value,
                );
                if (next === member.role) return;
                const confirmed =
                  next !== "owner" ||
                  window.confirm(
                    `${ownerWarning}\n${member.email} をオーナーにしますか？`,
                  );
                if (!confirmed) return;
                const pathname = router.state.location.pathname;
                start(async () => {
                  changeOptimistic(next);
                  setError("");
                  try {
                    await changeWorkspaceMemberFn({
                      data: {
                        workspaceId,
                        accountId: member.accountId,
                        role: next,
                        expectedRole: member.role,
                        ownerConfirmed: next === "owner" && confirmed,
                      },
                    });
                    if (
                      alive.current &&
                      pathname === router.state.location.pathname
                    )
                      await router.invalidate();
                  } catch (cause) {
                    if (
                      alive.current &&
                      pathname === router.state.location.pathname
                    )
                      setError(
                        `ロール変更結果を確認できませんでした。一覧を更新して確認してください。${displayError(cause)}`,
                      );
                  }
                });
              }}
            >
              <RoleOptions />
            </select>
          </label>
          <button
            type="button"
            className="hollow-button hollow-danger"
            disabled={disabled || pending || lastOwner}
            onClick={onRemove}
          >
            除名
          </button>
        </div>
      ) : (
        <p>
          {roles[role]}
          {owner && self ? " · 自分のロールは変更できません" : ""}
        </p>
      )}
      {lastOwner && (
        <p className="hollow-help">最後のオーナーは降格・除名できません。</p>
      )}
      {pending && <p role="status">ロールを変更中…</p>}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
    </li>
  );
}

function LeaveWorkspace({ initial }: { initial: WorkspaceSettingsView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [leaving, indicate] = useOptimistic(
    false,
    (_old, value: boolean) => value,
  );
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const lastOwner = initial.role === "owner" && initial.ownerCount === 1;
  return (
    <section className="hollow-settings-leave">
      <h2>ワークスペースから脱退</h2>
      <p>
        脱退するとこのワークスペースのノートにアクセスできなくなります。自分が作成したノートは残り、再参加には新しい招待が必要です。
      </p>
      <p className="hollow-help">
        脱退前にノートを個人へ移動する機能は、まだ利用できません。
      </p>
      {lastOwner && (
        <p>
          最後のオーナーは脱退できません。先に他のメンバーをオーナーにしてください。
        </p>
      )}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      <button
        type="button"
        className="hollow-button hollow-danger"
        disabled={pending || lastOwner}
        onClick={() => {
          if (
            !window.confirm(
              `「${initial.name}」から脱退しますか？ ノートへのアクセスを失います。作成したノートは残り、再参加には新しい招待が必要です。`,
            )
          )
            return;
          const pathname = router.state.location.pathname;
          start(async () => {
            indicate(true);
            setError("");
            try {
              await leaveWorkspaceFn({ data: { workspaceId: initial.id } });
              if (!alive.current || pathname !== router.state.location.pathname)
                return;
              await router.navigate({ to: "/notes", search: {} });
              await router.invalidate();
            } catch (cause) {
              if (alive.current && pathname === router.state.location.pathname)
                setError(
                  `脱退結果を確認できませんでした。保存先一覧も確認してください。${displayError(cause)}`,
                );
            }
          });
        }}
      >
        {pending || leaving ? "脱退中…" : "脱退する"}
      </button>
    </section>
  );
}

function InvitationManager({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: InvitationPage;
}) {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("editor");
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(initial);
  const [cursor, setCursor] = useState<string | null>(null);
  const [shownCursor, setShownCursor] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const [pending, start] = useTransition();
  const [issuing, indicate] = useOptimistic(
    false,
    (_old, value: boolean) => value,
  );
  const request = useRef<{ payload: string; id: string } | null>(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ++generation.current;
    };
  }, []);
  useEffect(() => {
    setPage(initial);
    setCursor(null);
    setShownCursor(null);
  }, [initial]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh restarts the bounded delivery poll.
  useEffect(() => {
    const ticket = ++generation.current;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const current = () =>
      !disposed && alive.current && ticket === generation.current;
    const read = async () => {
      if (!current()) return;
      setReading(true);
      try {
        const result = await listInvitationsFn({
          data: { workspaceId, ...(cursor ? { cursor } : {}) },
        });
        if (!current()) return;
        setPage(result);
        setShownCursor(cursor);
        if (
          ++polls < 12 &&
          result.items.some(
            (item) =>
              item.state === "pending" &&
              (item.deliveryState === "pending" ||
                item.deliveryState === "running"),
          )
        )
          timer = setTimeout(() => {
            void read();
          }, 5000);
      } catch (cause) {
        if (current())
          setError(`招待一覧を更新できません。${displayError(cause)}`);
      } finally {
        if (current()) setReading(false);
      }
    };
    void read();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [workspaceId, cursor, reload]);
  const refresh = () => {
    ++generation.current;
    setReload((value) => value + 1);
  };
  return (
    <section aria-labelledby="workspace-invitations-heading">
      <h2 id="workspace-invitations-heading">メンバーを招待</h2>
      <form
        className="hollow-workspace-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy.current) return;
          const recipients = invitationEmails(emails);
          if (
            !invitationIssueSchema.shape.emails.safeParse(recipients).success
          ) {
            setError("正しいメールアドレスを1〜10件入力してください。");
            return;
          }
          if (role === "owner" && !confirmed) {
            setError("オーナー権限の説明を確認してください。");
            return;
          }
          const payload = JSON.stringify([
            [...recipients].sort(),
            role,
            confirmed,
          ]);
          if (request.current?.payload !== payload)
            request.current = { payload, id: crypto.randomUUID() };
          const requestId = request.current.id;
          busy.current = true;
          const pathname = router.state.location.pathname;
          start(async () => {
            indicate(true);
            setError("");
            setMessage("");
            try {
              const result = await issueInvitationsFn({
                data: {
                  workspaceId,
                  emails: recipients,
                  role,
                  ownerConfirmed: confirmed,
                  requestId,
                },
              });
              if (!alive.current || pathname !== router.state.location.pathname)
                return;
              request.current = null;
              setEmails("");
              setConfirmed(false);
              setMessage(
                `${result.ids.length}件の招待を受け付けました。${result.skipped ? `既にメンバーの${result.skipped}件には送信していません。` : ""}配送状況は一覧で確認できます。`,
              );
              setCursor(null);
              refresh();
              await router.invalidate();
            } catch (cause) {
              if (alive.current && pathname === router.state.location.pathname)
                setError(
                  `入力は保持しています。同じ内容で再実行すると受付済みの結果を確認できます。${displayError(cause)}`,
                );
            } finally {
              busy.current = false;
            }
          });
        }}
      >
        <label>
          メールアドレス（1〜10件）
          <textarea
            name="invitation-emails"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            required
            value={emails}
            disabled={pending}
            onChange={(event) => setEmails(event.currentTarget.value)}
          />
        </label>
        <p className="hollow-help">
          改行またはカンマで区切ります。重複は1件、保留中の宛先は再送として扱います。
        </p>
        <label>
          付与するロール
          <select
            name="invitation-role"
            value={role}
            disabled={pending}
            onChange={(event) => {
              setRole(workspaceRoleSchema.parse(event.currentTarget.value));
              setConfirmed(false);
            }}
          >
            <RoleOptions />
          </select>
        </label>
        {role === "owner" && (
          <div className="hollow-message">
            <p>{ownerWarning}</p>
            <label className="hollow-settings-checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={pending}
                onChange={(event) => setConfirmed(event.currentTarget.checked)}
              />
              オーナーの権限を理解して招待します
            </label>
          </div>
        )}
        <p className="hollow-help">
          有効期限は14日。ワークスペースで24時間に100件、実行者ごとに1時間に20件までです。明示再送は同じ宛先へ60秒以上空けてください。配送失敗・取消でも受け付けた枠は戻りません。
        </p>
        <button
          type="submit"
          className="hollow-button hollow-primary"
          disabled={pending || (role === "owner" && !confirmed)}
        >
          {pending || issuing ? "招待を受付中…" : "招待する"}
        </button>
      </form>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <h3>招待の状態</h3>
      <p className="hollow-help">
        メール配送と参加は別の状態です。自動更新は最大1分です。その後は「招待を更新」で確認できます。
      </p>
      {reading && <p role="status">招待を確認中…</p>}
      {shownCursor !== cursor && (
        <p role="status">
          選択したページは未取得です。前回の一覧を表示しています。
        </p>
      )}
      <ul className="hollow-settings-list">
        {page.items.map((invitation) => (
          <InvitationRow
            key={`${invitation.id}:${invitation.generation}`}
            invitation={invitation}
            workspaceId={workspaceId}
            disabled={pending || reading || shownCursor !== cursor}
            onChanged={refresh}
          />
        ))}
      </ul>
      {!page.items.length && <p>このページに招待はありません。</p>}
      <nav className="hollow-trash-actions" aria-label="招待のページ移動">
        <button
          type="button"
          className="hollow-button"
          disabled={!cursor || pending || reading}
          onClick={() => {
            ++generation.current;
            setCursor(null);
          }}
        >
          先頭へ
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={
            !page.nextCursor || pending || reading || shownCursor !== cursor
          }
          onClick={() => {
            if (page.nextCursor) {
              ++generation.current;
              setCursor(page.nextCursor);
            }
          }}
        >
          次の50件
        </button>
        <button
          type="button"
          className="hollow-button"
          disabled={pending || reading}
          onClick={refresh}
        >
          招待を更新
        </button>
      </nav>
    </section>
  );
}

function InvitationRow({
  invitation,
  workspaceId,
  disabled,
  onChanged,
}: {
  invitation: InvitationView;
  workspaceId: string;
  disabled: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    invitation.state,
    (_old, value: InvitationView["state"]) => value,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const stateLabel: Record<InvitationView["state"], string> = {
    pending: "参加待ち",
    accepted: "参加済み",
    declined: "辞退済み",
    cancelled: "取消済み",
    issuer_lost: "発行者の権限変更により再発行が必要",
    expired: "期限切れ",
  };
  const deliveryLabel: Record<InvitationView["deliveryState"], string> = {
    pending: "配送待ち",
    running: "配送処理中",
    sent: "メール配送済み",
    failed: "配送を停止・再送が必要",
    configuration: "配送設定の復旧待ち",
    stopped: "配送終了",
  };
  const data = {
    workspaceId,
    id: invitation.id,
    generation: invitation.generation,
  };
  return (
    <li>
      <h4>{invitation.email}</h4>
      <p>
        {roles[invitation.role]} · {stateLabel[state]}
      </p>
      <p>
        有効期限：
        <time dateTime={invitation.expiresAt}>
          {date(invitation.expiresAt)}
        </time>
      </p>
      <p>
        {deliveryLabel[invitation.deliveryState]} · 配送試行{" "}
        {invitation.attempts} 回
      </p>
      {invitation.failure && (
        <p className="hollow-message" role="status">
          {invitation.failure}
        </p>
      )}
      {(invitation.deliveryState === "failed" ||
        invitation.deliveryState === "configuration") && (
        <p className="hollow-help">
          招待の受付は完了しています。有効な間はリンクをコピーできます。配送設定の復旧、または明示再送で回復してください。
        </p>
      )}
      <div className="hollow-trash-actions">
        {invitation.canCopy && (
          <button
            type="button"
            className="hollow-button"
            disabled={disabled || pending}
            onClick={() =>
              start(async () => {
                setError("");
                setMessage("");
                try {
                  const result = await copyInvitationFn({ data });
                  if (!alive.current) return;
                  setCopyUrl(result.url);
                  try {
                    await navigator.clipboard.writeText(result.url);
                    if (alive.current)
                      setMessage(
                        "招待リンクをコピーしました。このリンクを持つ人は参加できます。共有先を確認してください。",
                      );
                  } catch {
                    if (alive.current)
                      setMessage(
                        "自動コピーできません。下のリンクを選択してコピーしてください。",
                      );
                  }
                } catch (cause) {
                  if (alive.current) setError(displayError(cause));
                }
              })
            }
          >
            リンクをコピー
          </button>
        )}
        {invitation.canResend && (
          <button
            type="button"
            className="hollow-button"
            disabled={disabled || pending}
            onClick={() => {
              if (
                !window.confirm(
                  `招待を再送し、旧リンクを無効にしますか？ 新しい有効期限は再送から14日です。${invitation.role === "owner" ? `\n${ownerWarning}` : ""}`,
                )
              )
                return;
              requestId.current ??= crypto.randomUUID();
              const id = requestId.current;
              start(async () => {
                setError("");
                setMessage("");
                setCopyUrl(null);
                try {
                  await resendInvitationFn({
                    data: {
                      workspaceId,
                      id: invitation.id,
                      requestId: id,
                      ownerConfirmed: invitation.role === "owner",
                    },
                  });
                  if (!alive.current) return;
                  requestId.current = null;
                  setMessage(
                    "新しい世代の招待を受け付けました。旧リンクは無効です。",
                  );
                  onChanged();
                  await router.invalidate();
                } catch (cause) {
                  if (alive.current)
                    setError(
                      `再送結果を確認できません。同じ再送操作で受付結果を確認できます。${displayError(cause)}`,
                    );
                }
              });
            }}
          >
            再送
          </button>
        )}
        {state === "pending" && (
          <button
            type="button"
            className="hollow-button hollow-danger"
            disabled={disabled || pending}
            onClick={() => {
              if (
                !window.confirm(
                  `${invitation.email} への招待を取り消しますか？ 配送済みメールは回収できませんが、リンクは無効になります。`,
                )
              )
                return;
              start(async () => {
                setOptimistic("cancelled");
                setCopyUrl(null);
                setError("");
                setMessage("");
                try {
                  await cancelInvitationFn({ data });
                  if (alive.current) {
                    onChanged();
                    await router.invalidate();
                  }
                } catch (cause) {
                  if (alive.current) setError(displayError(cause));
                }
              });
            }}
          >
            招待を取消
          </button>
        )}
      </div>
      {copyUrl && invitation.canCopy && (
        <div>
          <label className="hollow-settings-copy">
            招待リンク（共有先に注意）
            <input
              readOnly
              value={copyUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button
            type="button"
            className="hollow-button"
            onClick={() => setCopyUrl(null)}
          >
            リンクを隠す
          </button>
        </div>
      )}
      {pending && <p role="status">処理中…</p>}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </li>
  );
}
