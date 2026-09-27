"use client";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { useSharingActor } from "./SharingActorProvider";

export function useAuthenticationOperation() {
  const router = useRouter();
  const actor = useSharingActor();
  const currentActor = actor?.currentActor;
  const live = useRef({ mounted: false, revision: 0 });
  useEffect(() => {
    live.current.mounted = true;
    const invalidate = () => {
      live.current.revision++;
    };
    const unsubscribe = router.subscribe("onBeforeNavigate", invalidate);
    window.addEventListener("hollow:signed-out", invalidate);
    return () => {
      live.current.mounted = false;
      invalidate();
      unsubscribe();
      window.removeEventListener("hollow:signed-out", invalidate);
    };
  }, [router]);
  return useCallback(() => {
    const revision = ++live.current.revision;
    const expected = currentActor?.();
    const href = router.state.location.href;
    return () => {
      const current = currentActor?.();
      return (
        live.current.mounted &&
        revision === live.current.revision &&
        href === router.state.location.href &&
        current?.id === expected?.id &&
        current?.epoch === expected?.epoch
      );
    };
  }, [currentActor, router]);
}
