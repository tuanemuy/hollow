import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginMethods } from "@/components/hollow/LoginMethods";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/settings/login-methods")({
  beforeLoad: async () => {
    const user = await currentUserFn();
    if (!user) throw redirect({ to: "/signin" });
    return { user };
  },
  component: Page,
});
function Page() {
  const { user } = Route.useRouteContext();
  return <LoginMethods key={user.id} email={user.email} />;
}
