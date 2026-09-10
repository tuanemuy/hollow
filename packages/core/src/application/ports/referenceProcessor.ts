export type ReferenceKind =
  | "image"
  | "video"
  | "stylesheet"
  | "background"
  | "font";
export type Candidate = Readonly<{
  url: string;
  kind: ReferenceKind;
  location: string;
}>;
export type ReferenceNotice = Readonly<{
  code: string;
  location: string;
  message: string;
  source?: string;
}>;
export type ReferenceDocument = Readonly<{
  html: string;
  candidates: readonly Candidate[];
  notices: readonly ReferenceNotice[];
}>;

export interface ReferenceProcessor {
  hasDecoration(html: string): boolean;
  prepare(html: string): ReferenceDocument;
  styles(html: string): readonly {
    url: string;
    css: string;
    finalUrl: string;
    materialized: boolean;
  }[];
  rewrite(
    html: string,
    replacements: ReadonlyMap<string, string>,
    styles: readonly { url: string; css: string; finalUrl: string }[],
  ): ReferenceDocument;
  decodeCss(bytes: Uint8Array): string;
  decodeDataUri(uri: string): { bytes: Uint8Array; mime: string };
  encodeDataUri(bytes: Uint8Array, mime: string): string;
}

export interface SafeReferenceFetcher {
  inspect(
    url: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ url: string; allowed: boolean; reason: string | null }>;
  inspectMany(
    urls: readonly string[],
    options?: { signal?: AbortSignal | undefined },
  ): Promise<
    readonly { url: string; allowed: boolean; reason: string | null }[]
  >;
  fetch(
    url: string,
    options: { maxBytes: number; signal?: AbortSignal },
  ): Promise<{
    body: ReadableStream<Uint8Array>;
    finalUrl: string;
    contentType: string;
  }>;
}
