export type SharedAssetReference = Readonly<{ token: string; assetId: string }>;
export function parseSharedAssetUrl(
  value: string,
): SharedAssetReference | null {
  const match = /^\/s\/([A-Za-z0-9_-]{43})\/assets\/([a-f0-9-]{36})$/.exec(
    value,
  );
  return match?.[1] && match[2] ? { token: match[1], assetId: match[2] } : null;
}
