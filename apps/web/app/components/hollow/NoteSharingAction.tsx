"use client";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SharingPanel } from "@/components/sharing/SharingPanel";
import {
  changeSharingFn,
  getShareLinkFn,
  getSharingFn,
} from "@/presentation/sharingServerFn";
import { useSharingActor } from "./SharingActorProvider";
export function NoteSharingAction({
  noteId,
  actorId,
  autoOpen = false,
}: {
  noteId: string;
  actorId: string;
  autoOpen?: boolean;
}) {
  const session = useSharingActor();
  const router = useRouter();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const identity = JSON.stringify([
    session?.actor?.id,
    session?.actor?.epoch,
    noteId,
    location,
  ]);
  const [opened, setOpened] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = useRef(identity);
  current.current = identity;
  useEffect(() => {
    if (autoOpen) setOpened(identity);
  }, [autoOpen, identity]);
  const actor = session?.actor;
  if (!actor || actor.id !== actorId) return null;
  return (
    <>
      <button type="button" ref={trigger} onClick={() => setOpened(identity)}>
        共有設定
      </button>
      {opened === identity && (
        <SharingPanel
          key={identity}
          actorId={actor.id}
          actorEpoch={actor.epoch}
          currentActor={session.currentActor}
          noteId={noteId}
          load={() => getSharingFn({ data: { noteId } })}
          change={(input) => changeSharingFn({ data: input })}
          getLink={(expected) => getShareLinkFn({ data: { expected } })}
          onChanged={() => {
            if (current.current === identity) void router.invalidate();
          }}
          profileHref={`/settings/profile?noteId=${noteId}&resume=sharing`}
          onClose={() => {
            if (current.current !== identity) return;
            const now = session.currentActor();
            if (now?.id !== actor.id || now.epoch !== actor.epoch) return;
            setOpened(null);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}
