import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";
import { RoutePendingFallback } from "./components/ui/RoutePendingFallback";
import { driveDocumentBinding } from "./presentation/driveDocument";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const driveDocument = driveDocumentBinding(getGlobalStartContext());
  return createRouter({
    routeTree,
    context: { driveDocument },
    ...(driveDocument.kind === "drive-picker"
      ? { ssr: { nonce: driveDocument.nonce } }
      : {}),
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPendingComponent: RoutePendingFallback,
    // Skip the fallback for sub-200ms navigations so it doesn't flash...
    defaultPendingMs: 200,
    // ...and once shown, keep it up for at least 300ms to avoid a flicker.
    defaultPendingMinMs: 300,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
