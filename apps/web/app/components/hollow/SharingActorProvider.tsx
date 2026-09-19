"use client";
import { useRouter, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
} from "react";
import { z } from "zod";

const actorSchema = z.object({ user: z.object({ id: z.uuid() }) });
type Actor = Readonly<{ id: string; epoch: number }>;
const Context = createContext<{
  actor: Actor | null;
  currentActor: () => Actor | null;
} | null>(null);
export function useSharingActor() {
  return useContext(Context);
}
export function SharingActorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const actorId = useRouterState({
    select: (state) => {
      const parsed = state.matches
        .map((m) => actorSchema.safeParse(m.context))
        .find((r) => r.success);
      return parsed?.success ? parsed.data.user.id : null;
    },
  });
  const live = useRef({ id: actorId, epoch: 0 });
  if (live.current.id !== actorId)
    live.current = { id: actorId, epoch: live.current.epoch + 1 };
  const currentActor = useCallback(() => {
    const parsed = router.state.matches
      .map((m) => actorSchema.safeParse(m.context))
      .find((r) => r.success);
    const id = parsed?.success ? parsed.data.user.id : null;
    if (live.current.id !== id)
      live.current = { id, epoch: live.current.epoch + 1 };
    return id ? { id, epoch: live.current.epoch } : null;
  }, [router]);
  return (
    <Context.Provider
      value={{
        actor: actorId ? { id: actorId, epoch: live.current.epoch } : null,
        currentActor,
      }}
    >
      {children}
    </Context.Provider>
  );
}
