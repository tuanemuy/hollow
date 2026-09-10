import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { InvitationLanding } from "@/components/hollow/InvitationLanding";
import { Shell } from "@/components/hollow/Shell";
import { displayError } from "@/presentation/errorDisplay";
import {
  beginInvitationFn,
  getInvitationLandingFn,
} from "@/presentation/hollowInvitationAuth";
import { invitationSelection } from "@/presentation/invitationInput";
export const Route = createFileRoute("/invitations")({
  validateSearch: (search) =>
    z
      .object({
        token: z.string().max(512).optional(),
        invitationId: z.uuid().optional(),
        invitationGeneration: z.number().int().positive().optional(),
      })
      .refine(
        (v) =>
          (v.invitationId === undefined) ===
          (v.invitationGeneration === undefined),
      )
      .parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    deps.token
      ? beginInvitationFn({ data: { token: deps.token } })
      : getInvitationLandingFn({
          data: { expected: invitationSelection(deps) },
        }),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: InvitationPage,
  errorComponent: ({ error }) => (
    <Shell>
      <section className="hollow-workspace-settings">
        <h1>招待を確認できません</h1>
        <p role="alert">{displayError(error)}</p>
        <p>
          辞退・取消・再送・期限切れの場合、元のリンクは利用できません。オーナーに再発行を依頼してください。
        </p>
        <Link to="/notes" search={{}}>
          ノートへ戻る
        </Link>
      </section>
    </Shell>
  ),
});
function InvitationPage() {
  const view = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const [preparationError, setPreparationError] = useState("");
  const [attempt, retry] = useState(0);
  const latestAttempt = useRef(0);
  useEffect(() => {
    let active = true;
    if (search.token) {
      setPreparationError("");
      void router
        .navigate({
          to: "/invitations",
          search: {
            invitationId: view.id,
            invitationGeneration: view.generation,
          },
          replace: true,
        })
        .catch((cause) => {
          if (active && latestAttempt.current === attempt)
            setPreparationError(displayError(cause));
        });
    }
    return () => {
      active = false;
    };
  }, [router, search.token, view.id, view.generation, attempt]);
  if (search.token)
    return (
      <Shell {...(view.accountEmail ? { email: view.accountEmail } : {})}>
        <section className="hollow-workspace-settings">
          <h1>招待を準備しています</h1>
          <p role="status">
            秘密のリンクを表示URLから取り除いています。完了後に参加する対象を確認できます。
          </p>
          {preparationError && <p role="alert">{preparationError}</p>}
          <button
            type="button"
            className="hollow-button"
            onClick={() => {
              latestAttempt.current++;
              retry(latestAttempt.current);
            }}
          >
            準備を再試行
          </button>
          <p>進まない場合は招待メールのリンクを開き直してください。</p>
          <Link to="/signin" search={{}}>
            通常のサインインへ
          </Link>
        </section>
      </Shell>
    );
  return (
    <Shell {...(view.accountEmail ? { email: view.accountEmail } : {})}>
      <InvitationLanding key={`${view.id}:${view.generation}`} view={view} />
    </Shell>
  );
}
