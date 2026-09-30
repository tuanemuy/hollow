import { describe, expect, it } from "vitest";
import {
  createDriveDocumentContext,
  driveDocumentResponse,
} from "./driveDocument.node";

describe("dedicated Drive document response", () => {
  it("selects only exact document GET and HEAD with independent server nonces", () => {
    const url = "https://hollow.test/integrations/drive/picker";
    const first = createDriveDocumentContext(new Request(url));
    const next = createDriveDocumentContext(
      new Request(url, { method: "HEAD" }),
    );
    expect(first?.nonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
    expect(first?.drivePickerDocument.nonce).toBe(first?.nonce);
    expect(next?.nonce).not.toBe(first?.nonce);
    for (const path of [
      "/settings/drive",
      "/integrations/drive/picker/",
      "/api/integrations/drive/picker",
      "/notes/example",
    ])
      expect(
        createDriveDocumentContext(new Request(`https://hollow.test${path}`)),
      ).toBeUndefined();
    expect(
      createDriveDocumentContext(new Request(url, { method: "POST" })),
    ).toBeUndefined();
    expect(
      createDriveDocumentContext(
        new Request(`${url}?nonce=untrusted`, {
          headers: { nonce: "untrusted" },
        }),
      )?.nonce,
    ).not.toBe("untrusted");
  });
  it("binds policy to the same context and preserves the unbuffered stream", () => {
    const context = createDriveDocumentContext(
      new Request("https://hollow.test/integrations/drive/picker"),
    );
    const response = new Response("synthetic", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    const secured = driveDocumentResponse(response, context);
    expect(secured.body).toBe(response.body);
    expect(response.bodyUsed).toBe(false);
    expect(secured.headers.get("Content-Security-Policy")).toBe(
      `script-src 'self' 'nonce-${context?.nonce}' https://apis.google.com; script-src-attr 'none'; frame-src https://docs.google.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
    );
    expect(secured.headers.get("Cache-Control")).toBe("no-store, private");
    expect(secured.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
  it("keeps ordinary responses identical and does not impose HTML policy on redirects or JSON", () => {
    const response = new Response("ordinary", {
      headers: { "Content-Security-Policy": "sandbox" },
    });
    expect(driveDocumentResponse(response, undefined)).toBe(response);
    const context = createDriveDocumentContext(
      new Request("https://hollow.test/integrations/drive/picker"),
    );
    for (const sample of [
      new Response(null, { status: 303, headers: { Location: "/signin" } }),
      new Response("{}", { headers: { "Content-Type": "application/json" } }),
    ]) {
      const secured = driveDocumentResponse(sample, context);
      expect(secured.status).toBe(sample.status);
      expect(secured.headers.get("Content-Security-Policy")).toBeNull();
      expect(secured.headers.get("Pragma")).toBe("no-cache");
    }
    const error = driveDocumentResponse(
      new Response(null, {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }),
      context,
    );
    expect(error.status).toBe(500);
    expect(error.headers.has("Content-Security-Policy")).toBe(true);
  });
});
