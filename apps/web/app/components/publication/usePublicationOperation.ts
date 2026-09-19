"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ownsPublicationOperation,
  type PublicationActorProps,
  samePublicationActor,
} from "./model";

export function usePublicationOperation({
  actorId,
  actorEpoch,
  currentActor,
}: PublicationActorProps) {
  const reader = useRef(currentActor);
  reader.current = currentActor;
  const mounted = useRef(false);
  const active = useRef<object | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = null;
    };
  }, []);
  const current = useCallback(
    () =>
      mounted.current &&
      samePublicationActor(reader.current(), actorId, actorEpoch),
    [actorId, actorEpoch],
  );
  const run = useCallback(
    (action: (valid: () => boolean) => Promise<void>) => {
      if (!current() || active.current !== null) return;
      const token = {};
      active.current = token;
      setBusy(true);
      const valid = () =>
        ownsPublicationOperation(
          mounted.current,
          active.current,
          token,
          reader.current(),
          actorId,
          actorEpoch,
        );
      startTransition(async () => {
        try {
          await action(valid);
        } finally {
          if (valid()) {
            active.current = null;
            setBusy(false);
          }
        }
      });
    },
    [current, actorId, actorEpoch],
  );
  return { busy, current, run };
}
