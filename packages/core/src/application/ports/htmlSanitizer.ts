export type SanitizedHtml = Readonly<{
  html: string;
  text: string;
  removed: readonly string[];
}>;
export type ExternalRenderSources = Readonly<{
  images: readonly string[];
  media: readonly string[];
  backgrounds: readonly string[];
  fonts: readonly string[];
}>;
export interface HtmlSanitizer {
  sanitize(html: string): SanitizedHtml;
  assetUrls(html: string): readonly string[];
  rewriteAssets(html: string, urls: ReadonlyMap<string, string>): string;
  render(
    html: string,
    allowedAssets: ReadonlySet<string>,
    externalSources?: ExternalRenderSources,
  ): Readonly<{
    html: string;
    links: readonly { id: string; url: string; label: string }[];
    removed: readonly string[];
    assetUrls: readonly string[];
    externalSources: ExternalRenderSources;
  }>;
}
