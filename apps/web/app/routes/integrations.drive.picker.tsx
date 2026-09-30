import { createFileRoute, redirect } from "@tanstack/react-router";
import { DrivePickerPage } from "@/components/hollow/DrivePickerPage";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/integrations/drive/picker")({
  beforeLoad: async ({ context, preload }) => {
    if (preload || context.driveDocument.kind !== "drive-picker")
      return { user: null };
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin", reloadDocument: true });
    return { user };
  },
  component: Page,
});

function Page() {
  const { user, driveDocument } = Route.useRouteContext();
  return (
    <DrivePickerPage
      key={user?.id ?? "unavailable"}
      enabled={!!user && driveDocument.kind === "drive-picker"}
      {...(user ? { accountId: user.id } : {})}
    />
  );
}
