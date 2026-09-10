import type { ReferenceEntry } from "@repo/core/domain/reference/entity";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { Candidate, ReferenceDocument } from "../ports/referenceProcessor";

export const isDependency = (candidate: { kind: string }) =>
  candidate.kind === "background" || candidate.kind === "font";

const unconfirmed =
  "取得対象外の外部依存です。接続先は未確認のため、表示時に安全性を確認します。";
const reasons: Readonly<Record<string, string>> = {
  REFERENCE_PRIVATE: "内部・特殊ネットワークへの参照のため表示を停止します。",
  REFERENCE_URL: "URLの形式・接続先ポートを許可できないため表示を停止します。",
  REFERENCE_DNS: "接続先を確認できなかったため表示を停止します。",
  REFERENCE_TIMEOUT:
    "接続先の安全確認が時間内に終わらなかったため表示を停止します。",
  REFERENCE_RESOURCE_LIMIT:
    "安全確認の件数上限で未確認のため表示を停止します。",
  REFERENCE_CANCELLED: "接続先の安全確認を中止したため表示を停止します。",
};
export type DependencyInspections = ReadonlyMap<string, string>;

export async function inspectDependencies(
  container: HollowContainer,
  document: ReferenceDocument,
  signal?: AbortSignal,
): Promise<DependencyInspections> {
  const urls = [
    ...new Set(document.candidates.filter(isDependency).map((c) => c.url)),
  ];
  const result = new Map<string, string>();
  for (const url of urls)
    if (!/^https?:\/\//i.test(url))
      result.set(
        url,
        "取得対象外の背景画像・フォントです。公開URLの基準を解決できないため表示を停止します。",
      );
  const remote = urls.filter((url) => /^https?:\/\//i.test(url));
  if (remote.length && container.referencing) {
    if (signal?.aborted)
      for (const url of remote)
        result.set(url, reasons.REFERENCE_CANCELLED ?? unconfirmed);
    else
      for (const checked of await container.referencing.fetcher.inspectMany(
        remote,
        { signal },
      ))
        result.set(
          checked.url,
          checked.allowed
            ? "取得対象外の外部依存です。前回の確認では公開接続先でした。表示時にも安全性を確認します。"
            : (reasons[checked.reason ?? "REFERENCE_DNS"] ?? unconfirmed),
        );
  }
  return result;
}

export async function syncDependencies(
  container: HollowContainer,
  context: HollowUnitOfWorkContext,
  noteId: string,
  candidates: readonly Candidate[],
  inspections: DependencyInspections,
  previous: readonly ReferenceEntry[],
) {
  const unique = new Map(
    candidates.filter(isDependency).map((c) => [`${c.kind}\0${c.url}`, c]),
  );
  const now = container.clock.now();
  for (const entry of previous)
    if (entry.current && isDependency(entry))
      await context.references.saveEntry({
        ...entry,
        current: false,
        updatedAt: now,
      });
  for (const candidate of unique.values()) {
    const prior = previous.find(
      (e) => e.kind === candidate.kind && e.url === candidate.url,
    );
    await context.references.saveEntry({
      id: prior?.id ?? container.idGenerator.next(),
      noteId,
      kind: candidate.kind,
      url: candidate.url,
      location: candidate.location,
      current: true,
      state: "external",
      reason:
        inspections.get(candidate.url) ??
        (prior?.reason?.startsWith("背景画像・フォントは外部サービスから表示")
          ? unconfirmed
          : prior?.reason) ??
        unconfirmed,
      assetId: null,
      finalUrl: null,
      bytes: 0,
      createdAt: prior?.createdAt ?? now,
      updatedAt: now,
    });
  }
}
