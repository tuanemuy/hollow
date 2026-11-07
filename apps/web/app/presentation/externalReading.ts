type FetchMetadata = {
  destination: string | undefined;
  mode: string | undefined;
  site: string | undefined;
};

const trustworthy = (appUrl: string) => {
  const url = new URL(appUrl);
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost") ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]"))
  );
};

export function externalReadingAllowed(
  appUrl: string,
  metadata: FetchMetadata,
) {
  return (
    trustworthy(appUrl) &&
    metadata.destination === "empty" &&
    (metadata.mode === "cors" || metadata.mode === "same-origin") &&
    metadata.site === "same-origin"
  );
}

/**
 * A top-level document the user opened from this app or typed in themselves;
 * a navigation another site started (`cross-site` / `same-site`) is refused.
 */
export function externalDocumentReadingAllowed(
  appUrl: string,
  metadata: FetchMetadata,
) {
  return (
    trustworthy(appUrl) &&
    metadata.destination === "document" &&
    metadata.mode === "navigate" &&
    (metadata.site === "same-origin" || metadata.site === "none")
  );
}
