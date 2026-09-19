"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useSharingActor } from "@/components/hollow/SharingActorProvider";
import { displayError } from "@/presentation/errorDisplay";
import {
  getProfileFn,
  getWorkspacePublicationFn,
} from "@/presentation/publicationServerFn";
export function PublicPageLink({
  workspaceId,
}: {
  workspaceId?: string | undefined;
}) {
  const actor = useSharingActor();
  if (!actor?.actor) return null;
  return (
    <PublicPageLinkSession
      key={`${actor.actor.id}:${actor.actor.epoch}:${workspaceId ?? "personal"}`}
      actorId={actor.actor.id}
      actorEpoch={actor.actor.epoch}
      currentActor={actor.currentActor}
      workspaceId={workspaceId}
    />
  );
}
function PublicPageLinkSession({
  actorId,
  actorEpoch,
  currentActor,
  workspaceId,
}: {
  actorId: string;
  actorEpoch: number;
  currentActor: () => { id: string; epoch: number } | null;
  workspaceId: string | undefined;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () => {
    const a = currentActor();
    return mounted.current && a?.id === actorId && a.epoch === actorEpoch;
  };
  return (
    <>
      <button
        type="button"
        className="hollow-button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!current()) return;
            setError("");
            try {
              const value = workspaceId
                ? await getWorkspacePublicationFn({ data: { workspaceId } })
                : await getProfileFn();
              if (!current() || value.actorId !== actorId) return;
              const fallback = workspaceId
                ? `/workspaces/${workspaceId}/settings`
                : "/settings/profile";
              const target = new URL(
                value.url ?? fallback,
                window.location.origin,
              );
              if (target.origin !== window.location.origin)
                throw Error("公開ページを確認できません。");
              window.location.assign(target.href);
            } catch (cause) {
              if (current()) setError(displayError(cause));
            }
          })
        }
      >
        {pending
          ? "公開ページを確認中…"
          : workspaceId
            ? "このワークスペースの公開ページ"
            : "自分の公開ページを見る"}
      </button>
      {error && (
        <p role="alert" className="hollow-message">
          {error}
        </p>
      )}
    </>
  );
}
