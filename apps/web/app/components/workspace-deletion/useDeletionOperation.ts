"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ownsDeletionOperation } from "./model";

export function useDeletionOperation(
  actorId: string,
  currentActor: () => string | null,
) {
  const alive = useRef(true);
  const reader = useRef(currentActor);
  reader.current = currentActor;
  const active = useRef<symbol | null>(null);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      active.current = null;
    };
  }, []);
  const ownsContext = () => alive.current && reader.current() === actorId;
  const run = (action: (current: () => boolean) => Promise<void>) => {
    if (!ownsContext() || active.current) return;
    const token = Symbol("workspace-deletion");
    active.current = token;
    setBusy(true);
    const current = () =>
      ownsDeletionOperation(
        alive.current,
        actorId,
        reader.current(),
        active.current,
        token,
      );
    start(async () => {
      try {
        await action(current);
      } finally {
        if (current()) setBusy(false);
        if (active.current === token) active.current = null;
      }
    });
  };
  return { busy, run, ownsContext };
}
