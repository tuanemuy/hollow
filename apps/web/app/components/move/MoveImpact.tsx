import type {
  MoveAudiencePage,
  MovePreview,
  MoveResources,
} from "@repo/core/application/move/ports";
import { moveBytes } from "./model";

const resources = [
  ["originals", "原本"],
  ["currentAssets", "現在の本文の画像・媒体"],
  ["heldAssets", "履歴などで保持中の媒体"],
  ["graceAssets", "回収待ちの媒体"],
  ["mediaReservations", "紐付け済み媒体の予約・回収負債"],
  ["referenceReservations", "参照取り込みの予約・回収負債"],
] as const satisfies readonly (readonly [keyof MoveResources, string])[];

function Audience({
  page,
  first,
  pending,
  onPage,
}: {
  page: MoveAudiencePage;
  first: boolean;
  pending: boolean;
  onPage: (direction: "gained" | "lost", after?: string) => void;
}) {
  const title =
    page.direction === "gained"
      ? "所属によって閲覧できるようになる人"
      : "所属による閲覧権限を失う人";
  return (
    <section className="move-audience" aria-label={title}>
      <h3>
        {title}（{page.total.toLocaleString("ja-JP")}人）
      </h3>
      {page.direction === "lost" && page.total > 0 && (
        <p className="move-warning">
          次の人は移動後、移動元の所属を根拠にした閲覧ができなくなります。有効な限定リンクなど、別の閲覧根拠は失効しません。
        </p>
      )}
      {page.items.length ? (
        <ul>
          {page.items.map((person) => (
            <li key={person.id}>{person.label}</li>
          ))}
        </ul>
      ) : (
        <p>該当する人はいません。</p>
      )}
      <div className="move-actions">
        {!first && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onPage(page.direction)}
          >
            最初の50人に戻る
          </button>
        )}
        {page.next && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (page.next) onPage(page.direction, page.next);
            }}
          >
            次の50人を確認
          </button>
        )}
      </div>
    </section>
  );
}

export function MoveImpact({
  preview,
  gained,
  lost,
  gainedFirst,
  lostFirst,
  pending,
  onPage,
}: {
  preview: MovePreview;
  gained: MoveAudiencePage;
  lost: MoveAudiencePage;
  gainedFirst: boolean;
  lostFirst: boolean;
  pending: boolean;
  onPage: (direction: "gained" | "lost", after?: string) => void;
}) {
  const { expected, sourceCapacity, destinationCapacity, interrupted } =
    preview;
  return (
    <div className="move-impact">
      <p className="move-path">
        <span>{expected.source.name}</span>
        <span aria-hidden="true">→</span>
        <strong>{expected.destination.name}</strong>
      </p>
      <p>確定時に、現在の権限・タグ・移管条件と保存容量を再確認します。</p>
      <p>
        共有設定は維持されます。現在：
        {expected.sharing.visibility === "private"
          ? "非公開"
          : expected.sharing.visibility === "link"
            ? "限定公開"
            : "公開"}
        、パスワード{expected.sharing.hasPassword ? "あり" : "なし"}
        。移動で限定リンクや通過済みの権限は再発行しません。リンクで閲覧できても編集権限は得られません。
      </p>
      <Audience
        page={gained}
        first={gainedFirst}
        pending={pending}
        onPage={onPage}
      />
      <Audience
        page={lost}
        first={lostFirst}
        pending={pending}
        onPage={onPage}
      />
      <section>
        <h3>タグは所属先ごとに独立しています</h3>
        <p>
          移動元のタグは引き継ぎません。移動先に同名のタグがある場合だけ付け替え、ない場合は外します。新しいタグは作成しません。
        </p>
        {expected.tags.length ? (
          <ul className="move-tags">
            {expected.tags.map((mapping) => (
              <li key={mapping.source.id}>
                <span>{mapping.source.name}</span>
                <span> → </span>
                {mapping.destination ? (
                  <span>
                    {mapping.destination.name}（移動先のタグへ付け替え）
                  </span>
                ) : (
                  <strong>外れる</strong>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>現在、このノートにタグはありません。</p>
        )}
      </section>
      <section>
        <h3>保存容量の移管</h3>
        <dl className="move-capacity">
          <dt>移動元の現在使用量 / 上限</dt>
          <dd>
            {moveBytes(sourceCapacity.used)} / {moveBytes(sourceCapacity.limit)}
          </dd>
          <dt>移動元から減る容量 → 移動後</dt>
          <dd>
            {moveBytes(expected.sourceRelease)} →{" "}
            {moveBytes(sourceCapacity.after)}
          </dd>
          <dt>移動先の現在使用量 / 上限</dt>
          <dd>
            {moveBytes(destinationCapacity.used)} /{" "}
            {moveBytes(destinationCapacity.limit)}
          </dd>
          <dt>移動先に増える容量 → 移動後</dt>
          <dd>
            {moveBytes(expected.destinationIncrease)} →{" "}
            {moveBytes(destinationCapacity.after)}
          </dd>
        </dl>
        {destinationCapacity.after > destinationCapacity.limit && (
          <p className="move-warning">
            表示時点で移動先の保存容量を超えています。容量を空けて影響を再確認してください。上限を超える移動は全体が拒否されます。
          </p>
        )}
        <details>
          <summary>移管される資源の内訳</summary>
          <dl className="move-capacity">
            {resources.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {expected.resources[key].count.toLocaleString("ja-JP")}件 ·{" "}
                  {moveBytes(expected.resources[key].bytes)}
                </dd>
              </div>
            ))}
            {expected.bundle && (
              <div>
                <dt>共有の添付原本</dt>
                <dd>{moveBytes(expected.bundle.bytes)}</dd>
              </div>
            )}
          </dl>
          <p>
            共有の添付原本は所属先ごとに一度だけ計上します。他のノートや未完の処理が保持している場合、移動元の容量は残ります。実ファイルを複製する操作ではありません。
          </p>
        </details>
      </section>
      <section>
        <h3>処理中の試行への影響</h3>
        <p>
          終了する媒体アップロード：
          {interrupted.mediaUploads.toLocaleString("ja-JP")}件、参照取り込み：
          {interrupted.referenceJobs.toLocaleString("ja-JP")}
          件、原本バックアップ：
          {(expected.backupImpact?.count ?? 0).toLocaleString("ja-JP")}件。
        </p>
        {(interrupted.mediaUploads > 0 ||
          interrupted.referenceJobs > 0 ||
          (expected.backupImpact?.count ?? 0) > 0) && (
          <p className="move-warning">
            旧所属先で開始したこれらの未完試行は終了し、遅れて届く結果は採用されません。必要な場合は移動後に新しい試行を開始してください。
          </p>
        )}
      </section>
      <p>
        本文・タイトル・作成日時・更新日時・履歴・原本は維持されます。ノート ID
        は変わりません。
      </p>
    </div>
  );
}
