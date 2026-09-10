"use client";

import type { InvitationLandingView } from "@repo/core/application/workspace/invitationViews";
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
  declineInvitationFn,
  joinInvitationFn,
} from "@/presentation/hollowInvitationAuth";
import { scopeSearch } from "@/presentation/workspaceInput";
import { useInvitationNotice } from "./InvitationNotice";
import { workspaceIconUrl } from "./WorkspaceIcon";
import "./workspace-settings.css";

const roles = { owner: "オーナー", editor: "編集者", viewer: "閲覧者" };

export function InvitationLanding({ view }: { view: InvitationLandingView }) {
  const router = useRouter();
  const notifyDeclined = useInvitationNotice();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [operation, indicate] = useOptimistic<
    "join" | "decline" | null,
    "join" | "decline"
  >(null, (_old, next) => next);
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <section className="hollow-workspace-settings hollow-invitation-landing">
      <p className="hollow-eyebrow">ワークスペースへの招待</p>
      <h1>{view.name}</h1>
      {view.iconId && (
        <img
          src={
            workspaceIconUrl(view.workspaceId, view.iconId) +
            (view.status === "pending"
              ? `?invitationId=${view.id}&generation=${view.generation}`
              : "")
          }
          width={64}
          height={64}
          alt="ワークスペースアイコン"
        />
      )}
      {view.description && (
        <p className="hollow-settings-description">{view.description}</p>
      )}
      <dl>
        <dt>付与されるロール</dt>
        <dd>{roles[view.role]}</dd>
        <dt>招待者</dt>
        <dd>{view.issuer}</dd>
        <dt>有効期限</dt>
        <dd>
          <time dateTime={view.expiresAt}>
            {new Date(view.expiresAt).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })}
          </time>
        </dd>
      </dl>
      {view.role === "owner" && (
        <p className="hollow-message">
          オーナーはメンバーの招待・権限変更・除名とワークスペース設定を管理できます。
        </p>
      )}
      {view.status === "joined" ? (
        <>
          <p>
            このワークスペースに参加済みです。現在のロールは変更されません。
          </p>
          <Link
            to="/notes"
            search={scopeSearch(view.workspaceId)}
            className="hollow-button hollow-primary"
          >
            ワークスペースを開く
          </Link>
        </>
      ) : (
        <>
          <p>
            この画面を開いただけでは参加しません。「参加する」を選ぶとメンバーになります。
          </p>
          {!view.signedIn ? (
            <div>
              <p>
                サインインまたはアカウント作成を完了すると、この招待の確認へ戻ります。
              </p>
              <div className="hollow-actions">
                <Link
                  to="/signin"
                  search={{
                    invitation: true,
                    invitationId: view.id,
                    invitationGeneration: view.generation,
                  }}
                  className="hollow-button hollow-primary"
                >
                  サインインして確認
                </Link>
                <Link
                  to="/signup"
                  search={{
                    invitation: true,
                    invitationId: view.id,
                    invitationGeneration: view.generation,
                  }}
                  className="hollow-button"
                >
                  アカウントを作成
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p>参加するアカウント：{view.accountEmail}</p>
              {!view.emailMatches && (
                <div className="hollow-message">
                  <p>
                    サインイン中のメールアドレスは招待先と異なります。このアカウントで参加するか確認してください。
                  </p>
                  <label className="hollow-settings-checkbox">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={pending}
                      onChange={(event) =>
                        setConfirmed(event.currentTarget.checked)
                      }
                    />
                    {view.accountEmail} で参加します
                  </label>
                </div>
              )}
              <button
                type="button"
                className="hollow-button hollow-primary"
                disabled={pending || (!view.emailMatches && !confirmed)}
                onClick={() => {
                  if (busy.current) return;
                  busy.current = true;
                  const location = router.state.location.href;
                  start(async () => {
                    indicate("join");
                    setError("");
                    try {
                      const result = await joinInvitationFn({
                        data: {
                          confirmDifferentEmail: confirmed,
                          expected: {
                            id: view.id,
                            generation: view.generation,
                          },
                        },
                      });
                      if (
                        !alive.current ||
                        router.state.location.href !== location
                      )
                        return;
                      await router.navigate({
                        to: "/notes",
                        search: scopeSearch(result.workspaceId),
                      });
                      await router.invalidate();
                    } catch (cause) {
                      if (
                        alive.current &&
                        router.state.location.href === location
                      )
                        setError(
                          `参加結果を確認できませんでした。同じ操作で参加済みか確認できます。${displayError(cause)}`,
                        );
                    } finally {
                      busy.current = false;
                    }
                  });
                }}
              >
                {operation === "join" ? "参加中…" : "参加する"}
              </button>
            </div>
          )}
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={() => {
              if (
                busy.current ||
                !window.confirm(
                  "この招待を辞退しますか？ 招待リンクは利用できなくなります。",
                )
              )
                return;
              busy.current = true;
              const location = router.state.location.href;
              start(async () => {
                indicate("decline");
                setError("");
                try {
                  await declineInvitationFn({
                    data: {
                      expected: { id: view.id, generation: view.generation },
                    },
                  });
                  if (
                    alive.current &&
                    router.state.location.href === location
                  ) {
                    notifyDeclined();
                    await router.navigate({
                      to: view.signedIn ? "/notes" : "/",
                      search: {},
                    });
                    await router.invalidate();
                  }
                } catch (cause) {
                  if (alive.current && router.state.location.href === location)
                    setError(displayError(cause));
                } finally {
                  busy.current = false;
                }
              });
            }}
          >
            {operation === "decline" ? "辞退中…" : "参加しない"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
    </section>
  );
}
