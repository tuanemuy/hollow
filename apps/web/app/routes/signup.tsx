import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/hollow/Auth";
import { currentUserFn } from "@/presentation/hollowAuth";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    if (await currentUserFn()) throw redirect({ to: "/notes" });
  },
  component: () => <AuthForm mode="signup" />,
});
