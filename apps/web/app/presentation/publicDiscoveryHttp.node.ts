import { publicRequestSchema } from "@repo/core/adapters/node/publication/wire";
import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { discoverPublic } from "@repo/core/application/publication/discovery";
import type { PublicDiscoveryRequest } from "@repo/core/application/publication/ports";
import { publicNotFound } from "@repo/core/application/publication/reading";
import { BusinessRuleError } from "@repo/core/domain/error";
import {
  publicHeaders,
  publicHttpError,
  publicPage,
} from "./publicationHttp.node";
import {
  renderPublicDiscovery,
  renderPublicSitemap,
} from "./publicDiscoveryHtml";

const cookieName = "hollow_public_browser";
function browserCookie(request: Request) {
  const values =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .filter((v) => v.startsWith(`${cookieName}=`)) ?? [];
  if (values.length > 1)
    throw new BusinessRuleError(
      "PUBLIC_BROWSER",
      "Cookie を確認して再読み込みしてください。",
    );
  const value = values[0]?.slice(cookieName.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function input(url: URL): PublicDiscoveryRequest {
  const profile = /^\/@([a-z0-9][a-z0-9-]{1,61}[a-z0-9])$/.exec(url.pathname);
  const workspace = /^\/w\/([a-z0-9][a-z0-9-]{1,61}[a-z0-9])$/.exec(
    url.pathname,
  );
  if (url.pathname === "/sitemap.xml") {
    if (url.search) throw publicNotFound();
    return { kind: "sitemap-index" };
  }
  const leaf =
    /^\/sitemap\/(notes|profiles|workspaces)\/(0|[1-9][0-9]{0,12})\.xml$/.exec(
      url.pathname,
    );
  if (leaf) {
    if (url.search) throw publicNotFound();
    return publicRequestSchema.parse({
      kind: "sitemap-leaf",
      catalogue: leaf[1],
      page: Number(leaf[2]),
    });
  }
  if (!profile && !workspace && url.pathname !== "/discover")
    throw publicNotFound();
  if (url.search.length > 32768)
    throw new BusinessRuleError(
      "PUBLIC_SEARCH_INPUT",
      "検索条件が長すぎます。",
    );
  const allowed = new Set(["q", "tag", "from", "until", "zone", "cursor"]);
  for (const key of url.searchParams.keys())
    if (
      !allowed.has(key) ||
      (key !== "tag" && url.searchParams.getAll(key).length !== 1)
    )
      throw new BusinessRuleError(
        "PUBLIC_SEARCH_INPUT",
        "検索条件を確認してください。",
      );
  return publicRequestSchema.parse({
    kind: "list",
    scope: profile
      ? { kind: "profile", handle: profile[1] }
      : workspace
        ? { kind: "workspace", slug: workspace[1] }
        : { kind: "all" },
    conditions: {
      query: url.searchParams.get("q") ?? "",
      tags: url.searchParams.getAll("tag"),
      zone: url.searchParams.get("zone") ?? "Asia/Tokyo",
      from: url.searchParams.get("from") || undefined,
      until: url.searchParams.get("until") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
    },
  });
}
export async function publicDiscoveryHttp(
  request: Request,
  c: HollowContainer,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    !(
      url.pathname === "/discover" ||
      /^\/@[^/]+$/.test(url.pathname) ||
      /^\/w\/[^/]+$/.test(url.pathname) ||
      url.pathname === "/sitemap.xml" ||
      url.pathname.startsWith("/sitemap/")
    )
  )
    return null;
  const headers = publicHeaders(false);
  headers.set("Vary", "Cookie");
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      headers.set("Allow", "GET, HEAD");
      return new Response(null, { status: 405, headers });
    }
    let parsed: PublicDiscoveryRequest;
    try {
      parsed = input(url);
    } catch (error) {
      if (error instanceof BusinessRuleError) throw error;
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "ZodError"
      )
        throw new BusinessRuleError(
          "PUBLIC_SEARCH_INPUT",
          "検索条件を確認してください。",
        );
      throw error;
    }
    if (parsed.kind === "list") {
      const sessions =
        request.headers
          .get("cookie")
          ?.split(";")
          .map((v) => v.trim())
          .filter((v) => v.startsWith("hollow_session=")) ?? [];
      const session =
        sessions.length === 1
          ? sessions[0]?.slice("hollow_session=".length)
          : null;
      if (session && /^[A-Za-z0-9_-]{43}$/.test(session))
        parsed = { ...parsed, viewerSessionHash: c.tokens.hash(session) };
    }
    let browser: string | null = null;
    if (parsed.kind === "list") {
      browser = browserCookie(request);
      if (!browser) {
        browser = c.tokens.generate();
        headers.append(
          "Set-Cookie",
          `${cookieName}=${browser}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${new URL(c.appUrl).protocol === "https:" ? "; Secure" : ""}`,
        );
      }
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(3000)]);
    const result = await discoverPublic(
      c,
      parsed,
      browser ? c.tokens.hash(browser) : null,
      signal,
    );
    if (result.kind === "limited") {
      headers.set(
        "Retry-After",
        String(
          Math.max(
            1,
            Math.ceil(
              (result.retryAt.getTime() - c.clock.now().getTime()) / 1000,
            ),
          ),
        ),
      );
      return new Response(
        request.method === "HEAD"
          ? null
          : publicPage(
              "検索回数の上限",
              "<h1>少し待って再試行してください</h1><p>短時間の検索回数が上限に達しました。この画面を後で再読み込みしてください。</p>",
            ),
        { status: 429, headers },
      );
    }
    if (result.value.kind === "list") {
      const rendered = renderPublicDiscovery(result.value.page);
      headers.set(
        "X-Robots-Tag",
        rendered.index ? "index, follow" : "noindex, nofollow",
      );
      return new Response(
        request.method === "HEAD"
          ? null
          : publicPage(rendered.title, rendered.body, {
              canonical: new URL(rendered.canonical, c.appUrl).href,
              description: rendered.description,
              image: new URL(rendered.image ?? "/public-default.svg", c.appUrl)
                .href,
            }),
        { headers },
      );
    }
    headers.set("Content-Type", "application/xml; charset=utf-8");
    headers.set("X-Robots-Tag", "noindex, follow");
    const xml = renderPublicSitemap(result.value, c.appUrl);
    return new Response(request.method === "HEAD" ? null : xml, { headers });
  } catch (error) {
    const response = publicHttpError(request, c, error);
    response.headers.set("Vary", "Cookie");
    for (const value of headers.getSetCookie())
      response.headers.append("Set-Cookie", value);
    return response;
  }
}
