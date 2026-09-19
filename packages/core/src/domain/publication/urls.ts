const identity =
  "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})";
const mediaPattern = new RegExp(`^/p/${identity}/(1)/assets/${identity}$`);
export function parsePublicAssetUrl(value: string) {
  const match = mediaPattern.exec(value);
  return match?.[1] && match[2] && match[3]
    ? { publicId: match[1], urlGeneration: 1, assetId: match[3] }
    : null;
}
