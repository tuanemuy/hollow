import type { ExternalRenderSources } from "@repo/core/application/ports/htmlSanitizer";
import type { DisplayStyle } from "@repo/core/domain/note/displayStyle";
import { displayError } from "@/presentation/errorDisplay";

export function mediaUploadError(response: unknown): string {
  if (response && typeof response === "object" && "error" in response)
    return displayError({ serialized: response.error });
  return "アップロードに失敗しました。形式・容量を確認して再試行してください。";
}

export type MediaScope = {
  noteId?: string | undefined;
  draftId?: string | undefined;
};
export type MediaAsset = {
  id: string;
  url: string;
  kind: "image" | "video";
  mime: string;
  bytes: number;
};

export function isMediaUrl(value: string, scope?: MediaScope): boolean {
  const match =
    /^\/api\/(notes|drafts)\/([A-Za-z0-9_-]+)\/assets\/([A-Za-z0-9_-]+)$/.exec(
      value,
    );
  if (!match) return false;
  return (
    !scope ||
    (match[1] === "notes"
      ? match[2] === scope.noteId
      : match[2] === scope.draftId)
  );
}

export function parseMediaUpload(value: unknown): {
  asset: MediaAsset;
  removed: readonly string[];
} {
  if (
    !value ||
    typeof value !== "object" ||
    !("asset" in value) ||
    !("removed" in value) ||
    !Array.isArray(value.removed) ||
    !value.removed.every((entry: unknown) => typeof entry === "string")
  )
    throw new Error("アップロードの応答を確認できませんでした。");
  const asset = value.asset;
  if (
    !asset ||
    typeof asset !== "object" ||
    !("id" in asset) ||
    typeof asset.id !== "string" ||
    !("url" in asset) ||
    typeof asset.url !== "string" ||
    !isMediaUrl(asset.url) ||
    !("kind" in asset) ||
    (asset.kind !== "image" && asset.kind !== "video") ||
    !("mime" in asset) ||
    typeof asset.mime !== "string" ||
    !("bytes" in asset) ||
    typeof asset.bytes !== "number" ||
    !Number.isSafeInteger(asset.bytes) ||
    asset.bytes <= 0
  )
    throw new Error("メディアの応答を確認できませんでした。");
  return {
    asset: {
      id: asset.id,
      url: asset.url,
      kind: asset.kind,
      mime: asset.mime,
      bytes: asset.bytes,
    },
    removed: value.removed,
  };
}

export function mediaFileError(file: {
  name: string;
  size: number;
}): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const image = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(
    extension ?? "",
  );
  const video = ["mp4", "webm"].includes(extension ?? "");
  if (!image && !video)
    return "PNG / JPG / GIF / WebP / SVG / MP4 / WebM を選択してください。";
  if (file.size <= 0) return "空のファイルは挿入できません。";
  if (file.size > (image ? 20 : 200) * 1024 * 1024)
    return image
      ? "画像は 20 MiB 以内にしてください。"
      : "動画は 200 MiB 以内にしてください。";
  return null;
}

export const escapeAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export function mediaMarkup(
  asset: MediaAsset,
  alt: string,
  scope: MediaScope,
): string {
  if (!isMediaUrl(asset.url, scope))
    throw new Error("メディアの URL を確認できませんでした。");
  const url = escapeAttribute(asset.url);
  return asset.kind === "image"
    ? `<p><img src="${url}" alt="${escapeAttribute(alt)}"></p>`
    : `<p><video src="${url}" controls preload="metadata" aria-label="${escapeAttribute(alt)}"></video></p>`;
}

export function frameDocument(
  html: string,
  assetUrls: readonly string[],
  origin: string,
  external: ExternalRenderSources = {
    images: [],
    media: [],
    backgrounds: [],
    fonts: [],
  },
  displayStyle: DisplayStyle = "default",
): string {
  const urls = assetUrls
    .filter(
      (url) =>
        isMediaUrl(url) ||
        /^\/api\/notes\/[a-f0-9-]{36}\/revisions\/[1-9]\d{0,15}\/assets\/[a-f0-9-]{36}$/.test(
          url,
        ),
    )
    .map((url) => `${origin}${url}`);
  const externalUrls = (values: readonly string[]) =>
    values.flatMap((value) => {
      try {
        const url = new URL(value);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.origin === origin ||
          url.hostname.includes("*") ||
          Array.from(value).some(
            (character) =>
              character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
          )
        )
          return [];
        return [url.href.replaceAll(";", "%3B").replaceAll("'", "%27")];
      } catch {
        return [];
      }
    });
  const sources = (values: readonly string[]) =>
    values.length ? [...new Set(values)].join(" ") : "'none'";
  const images = sources([
    ...urls,
    ...externalUrls([...external.images, ...external.backgrounds]),
    ...(assetUrls.some((url) => url.startsWith("data:image/"))
      ? ["data:"]
      : []),
  ]);
  const media = sources([
    ...urls,
    ...externalUrls(external.media),
    ...(assetUrls.some((url) => url.startsWith("data:video/"))
      ? ["data:"]
      : []),
  ]);
  const fonts = sources(externalUrls(external.fonts));
  const csp = `default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; style-src 'unsafe-inline'; font-src ${fonts}; img-src ${images}; media-src ${media}`;
  const defaultStyle =
    displayStyle === "default"
      ? "<style>body{font:16px/1.85 system-ui,sans-serif;color:#1d1d1f;margin:24px;overflow-wrap:anywhere}img,video,table{max-width:100%}pre{overflow:auto;background:#f5f5f7;padding:16px}h1,h2,h3{line-height:1.4}blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:16px}</style>"
      : "";
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}"><meta charset="utf-8">${defaultStyle}</head><body>${html}</body></html>`;
}

export function safeParentLink(value: string): boolean {
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}
