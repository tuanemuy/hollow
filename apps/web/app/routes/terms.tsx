import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/hollow/Shell";

export const Route = createFileRoute("/terms")({ component: Terms });
function Terms() {
  return (
    <Shell>
      <article className="hollow-prose">
        <p className="hollow-eyebrow">HOLLOW</p>
        <h1>利用規約</h1>
        <p>
          この環境は開発・検証用の Hollow
          です。実際のサービス公開前に、運営者による利用規約とプライバシーポリシーの確定が必要です。
        </p>
        <h2>保存する情報</h2>
        <p>
          登録したメールアドレス、ハッシュ化したパスワード、セッション情報とノートをこの環境に保存します。未保存の編集内容は、復元のために利用中のブラウザへ退避します。
        </p>
        <h2>利用にあたって</h2>
        <p>
          自分が利用する権利を持つ内容を保存してください。検証環境には機密情報や第三者の個人情報を保存しないでください。必要なノートはダウンロードして手元にも保管してください。
        </p>
        <Link to="/signup">登録画面へ戻る</Link>
      </article>
    </Shell>
  );
}
