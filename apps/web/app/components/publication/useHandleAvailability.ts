"use client";

import type { HandleAvailability } from "@repo/core/application/publication/views";
import { useEffect, useRef, useState } from "react";
import {
  type PublicationActorProps,
  publicationFailure,
  samePublicationActor,
} from "./model";

type Options = PublicationActorProps &
  Readonly<{
    input: string;
    handle: string | null;
    enabled: boolean;
    checkHandle: (handle: string) => Promise<HandleAvailability>;
  }>;
type Snapshot = Readonly<{
  input: string;
  actorId: string;
  actorEpoch: number;
  retry: number;
}> &
  (
    | Readonly<{ kind: "checking" }>
    | Readonly<{ kind: "result"; value: HandleAvailability }>
    | Readonly<{ kind: "error"; message: string }>
  );

export function useHandleAvailability(options: Options) {
  const callbacks = useRef(options);
  callbacks.current = options;
  const generation = useRef(0);
  const mounted = useRef(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [retry, setRetry] = useState(0);
  const { input, handle, actorId, actorEpoch, enabled } = options;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    const expected = ++generation.current;
    setSnapshot(null);
    if (!enabled || !handle) return;
    let disposed = false;
    const valid = () =>
      !disposed &&
      mounted.current &&
      expected === generation.current &&
      callbacks.current.enabled &&
      callbacks.current.input === input &&
      callbacks.current.handle === handle &&
      samePublicationActor(
        callbacks.current.currentActor(),
        actorId,
        actorEpoch,
      );
    const timer = setTimeout(() => {
      if (!valid()) return;
      const binding = { input, actorId, actorEpoch, retry };
      setSnapshot({ ...binding, kind: "checking" });
      void (async () => {
        try {
          const value = await callbacks.current.checkHandle(handle);
          if (!valid()) return;
          if (value.actorId !== actorId || value.handle !== handle) {
            setSnapshot({
              ...binding,
              kind: "error",
              message:
                "ハンドル確認の応答が一致しません。もう一度確認してください。",
            });
            return;
          }
          setSnapshot({ ...binding, kind: "result", value });
        } catch (cause) {
          if (valid())
            setSnapshot({
              ...binding,
              kind: "error",
              message: publicationFailure(cause).message,
            });
        }
      })();
    }, 300);
    return () => {
      disposed = true;
      clearTimeout(timer);
      generation.current++;
    };
  }, [input, handle, actorId, actorEpoch, enabled, retry]);

  const current =
    snapshot &&
    enabled &&
    snapshot.input === input &&
    snapshot.actorId === actorId &&
    snapshot.actorEpoch === actorEpoch &&
    snapshot.retry === retry &&
    samePublicationActor(options.currentActor(), actorId, actorEpoch)
      ? snapshot
      : null;
  const invalidate = () => {
    generation.current++;
    setSnapshot(null);
  };
  return {
    availability: current?.kind === "result" ? current.value : null,
    checking: current?.kind === "checking",
    error: current?.kind === "error" ? current.message : null,
    invalidate,
    recheck: () => {
      invalidate();
      setRetry((previous) => previous + 1);
    },
  };
}
