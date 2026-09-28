export type Page = Readonly<{
  ordinal: number;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}>;
export function inspect(
  bytes: Uint8Array,
  signal: AbortSignal,
): Promise<readonly Page[]>;
export function redraw(
  bytes: Uint8Array,
  ordinal: number,
  signal: AbortSignal,
): Promise<Page & Readonly<{ png: Uint8Array }>>;
