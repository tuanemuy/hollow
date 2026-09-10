import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VerifyEmail } from "@/components/hollow/Auth";

const searchSchema = z.object({ token: z.string().max(256).catch("") });
export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => searchSchema.parse(search),
  component: VerificationPage,
});
function VerificationPage() {
  const { token } = Route.useSearch();
  return <VerifyEmail token={token} />;
}
