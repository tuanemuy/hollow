export function externalReadingAllowed(
  appUrl: string,
  metadata: {
    destination: string | undefined;
    mode: string | undefined;
    site: string | undefined;
  },
) {
  const url = new URL(appUrl);
  const trustworthy =
    url.protocol === "https:" ||
    (url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost") ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]"));
  return (
    trustworthy &&
    metadata.destination === "empty" &&
    (metadata.mode === "cors" || metadata.mode === "same-origin") &&
    metadata.site === "same-origin"
  );
}
