import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { BatchSelectionProvider } from "@/components/batch/BatchSelectionProvider";
import { InvitationNoticeProvider } from "@/components/hollow/InvitationNotice";
import { SharingActorProvider } from "@/components/hollow/SharingActorProvider";
import { PdfActivityProvider } from "@/components/pdf/PdfActivityProvider";
import { WorkspaceDeletionProvider } from "@/components/workspace-deletion/WorkspaceDeletionProvider";
import { ZipProvider } from "@/components/zip/ZipProvider";
import {
  type DriveDocumentBinding,
  driveDocumentNavigation,
} from "@/presentation/driveDocument";
import { sanitizeRouteError } from "@/presentation/errorDisplay";
import { errorResponseMiddleware } from "@/presentation/errorResponseMiddleware";
import { buildHead } from "@/presentation/head";
import appCss from "../styles/index.css?url";

// Server fns only reachable from `"use client"` components miss the
// rsc manifest (frozen before the client build phase). Pull their
// provider modules into a server-rendered route to register them.
import "@/components/todo/CreateTodoForm/action";
import "@/components/todo/TodoItem/action";
import "@/presentation/hollowAuth";
import "@/presentation/hollowNotes";
import "@/presentation/hollowImports";
import "@/presentation/hollowTrash";
import "@/presentation/hollowPurge";
import "@/presentation/hollowEmptyTrash";
import "@/presentation/hollowInvitations";
import "@/presentation/hollowIcons";
import "@/presentation/moveServerFn";
import "@/presentation/batchServerFn";
import "@/presentation/workspaceDeletionServerFn";
import "@/presentation/sharingServerFn";
import "@/presentation/publicationServerFn";
import "@/presentation/driveServerFn";

export const loadAppContext = createServerFn({ method: "GET" })
  .middleware([errorResponseMiddleware])
  .handler(async () => {
    const { getContainer } = await import(
      "@repo/core/application/di/containerStore"
    );
    const container = await getContainer();
    return { config: container.config };
  });

const SITE_ASSET_LINKS = [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
];

export const Route = createRootRouteWithContext<{
  driveDocument: DriveDocumentBinding;
}>()({
  staleTime: import.meta.env.DEV ? 0 : Number.POSITIVE_INFINITY,
  beforeLoad: ({ context, location, preload }) => {
    if (typeof window !== "undefined") {
      const decision = driveDocumentNavigation(
        context.driveDocument,
        location.href,
        preload,
      );
      if (decision.kind === "reload")
        throw redirect({ href: decision.href, reloadDocument: true });
      if (decision.kind === "unavailable") return { config: undefined };
    }
    return loadAppContext();
  },
  head: ({ match }) => {
    const stylesheet = { rel: "stylesheet", href: appCss };
    const baseLinks = [...SITE_ASSET_LINKS, stylesheet];
    const config = match.context?.config;
    const robots = { name: "robots", content: "noindex,nofollow" };
    if (!config) return { links: baseLinks, meta: [robots] };
    const { meta, links } = buildHead(config);
    return { meta: [...meta, robots], links: [...baseLinks, ...links] };
  },
  component: RootComponent,
  errorComponent: ({ error }) => (
    <RootDocument>
      <main className="hollow hollow-main">
        <p>Hollow</p>
        <h1>表示できませんでした</h1>
        <pre>{sanitizeRouteError(error)}</pre>
        <a href="/">ホームへ戻る</a>
      </main>
    </RootDocument>
  ),
  notFoundComponent: () => (
    <RootDocument>
      <main className="hollow hollow-main">
        <p>Hollow</p>
        <h1>ページが見つかりません</h1>
        <a href="/">ホームへ戻る</a>
      </main>
    </RootDocument>
  ),
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <SharingActorProvider>
          <PdfActivityProvider>
            <ZipProvider>
              <InvitationNoticeProvider>
                <BatchSelectionProvider>
                  <WorkspaceDeletionProvider>
                    {children}
                  </WorkspaceDeletionProvider>
                </BatchSelectionProvider>
              </InvitationNoticeProvider>
            </ZipProvider>
          </PdfActivityProvider>
        </SharingActorProvider>
        {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
        <Scripts />
      </body>
    </html>
  );
}
import "@/presentation/browseServerFn";
import "@/presentation/tagServerFn";
import "./-tags";
