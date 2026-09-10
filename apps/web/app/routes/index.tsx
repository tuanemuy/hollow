import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/hollow/Shell";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (await currentUserFn()) throw redirect({ to: "/notes" });
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <Shell>
      <section className="hollow-landing">
        <p className="hollow-eyebrow">A QUIET SPACE FOR YOUR NOTES</p>
        <h1>
          残しておきたいことに、
          <br />
          静かな場所を。
        </h1>
        <p>
          ひらめきも、まとまった考えも。
          <br />
          自分だけのノートに書いて、いつでも読み返す。
        </p>
        <Link to="/signup" className="hollow-button hollow-primary">
          Hollow をはじめる <span aria-hidden="true">↗</span>
        </Link>
        <div className="hollow-landing-paper" aria-hidden="true">
          <span>今日のノート</span>
          <h2>余白から、はじめる。</h2>
          <p>言葉にしてみると、少しだけ見えてくる。</p>
          <div />
          <div />
          <div />
        </div>
      </section>
    </Shell>
  );
}
