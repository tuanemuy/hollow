import { z } from "zod";

export const searchDiagnosticSchema = z.object({
  kind: z.literal("diagnostic"),
  stage: z.enum([
    "monitor-ready",
    "worker-start",
    "worker-result",
    "send-ack",
    "worker-exit",
    "deadline",
    "invalid-budget",
    "invalid-input",
    "ipc-disconnect",
    "send-error",
    "worker-error",
    "worker-failure",
  ]),
  remainingMs: z.number().finite(),
});

export type SearchDiagnostic = Readonly<{
  request: number;
  stage:
    | "accepted"
    | "fork"
    | "result"
    | "close"
    | "cancel"
    | "fork-error"
    | "child-error"
    | "invalid-reply"
    | z.infer<typeof searchDiagnosticSchema>["stage"];
  elapsedMs: number;
  queue: number;
  remainingMs?: number;
  code?: number | null;
  signal?: string | null;
}>;
