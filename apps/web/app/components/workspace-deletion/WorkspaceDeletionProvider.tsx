"use client";

import type { WorkspaceDeletionResult } from "@repo/core/domain/workspace/deletion";
import { useRouter, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { displayError } from "@/presentation/errorDisplay";
import type { requestWorkspaceDeletionSchema } from "@/presentation/workspaceDeletionInput";
import {
  requestWorkspaceDeletionFn,
  workspaceDeletionReceiptFn,
} from "@/presentation/workspaceDeletionServerFn";
import { scopeSearch } from "@/presentation/workspaceInput";
import {
  deletionIdentity,
  type PendingDeletionIdentity,
  type PendingWorkspaceDeletion,
  restoreDeletionIdentities,
} from "./model";
import { useDeletionOperation } from "./useDeletionOperation";
import { WorkspaceDeletionPanel } from "./WorkspaceDeletionPanel";
import { WorkspaceDeletionReceipt } from "./WorkspaceDeletionReceipt";

const actorSchema = z.object({ user: z.object({ id: z.uuid() }) });
const pendingSchema = z.array(
  z
    .object({ actorId: z.uuid(), workspaceId: z.uuid(), requestId: z.uuid() })
    .strict(),
);
type DeletionContext = {
  actorId: string | null;
  currentActor: () => string | null;
  pending: readonly PendingWorkspaceDeletion[];
  remember: (
    workspaceId: string,
    value: PendingWorkspaceDeletion | null,
  ) => void;
  accepted: (value: WorkspaceDeletionResult, navigate: boolean) => void;
};
const Context = createContext<DeletionContext | null>(null);
export const useWorkspaceDeletion = () => useContext(Context);
const request = (data: z.infer<typeof requestWorkspaceDeletionSchema>) =>
  requestWorkspaceDeletionFn({ data });
const lookup = (data: { requestId: string }) =>
  workspaceDeletionReceiptFn({ data });

export function WorkspaceDeletionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const actorId = useRouterState({
    select: (state) => {
      const actor = state.matches
        .map((match) => actorSchema.safeParse(match.context))
        .find((result) => result.success);
      return actor?.success ? actor.data.user.id : null;
    },
  });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const current = useRef({ actorId, epoch: 0, mounted: true });
  if (current.current.actorId !== actorId) current.current.epoch++;
  current.current.actorId = actorId;
  const currentActor = useCallback(
    () => (current.current.mounted ? current.current.actorId : null),
    [],
  );
  const [stored, setStored] = useState<{
    actorId: string | null;
    pending: readonly PendingWorkspaceDeletion[];
  }>({ actorId: null, pending: [] });
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const memory = useRef(
    new Map<
      string,
      { pending: readonly PendingDeletionIdentity[]; failed: boolean }
    >(),
  );
  const [storageFailure, setStorageFailure] = useState<string | null>(null);
  const [result, setResult] = useState<{
    actorId: string;
    value: WorkspaceDeletionResult;
  } | null>(null);
  const pending = stored.actorId === actorId ? stored.pending : [];
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!actorId) return;
    const cached = memory.current.get(actorId);
    if (cached) {
      setStored({
        actorId,
        pending: restoreDeletionIdentities(actorId, cached.pending),
      });
      setStorageFailure(cached.failed ? actorId : null);
      return;
    }
    try {
      const parsed = pendingSchema.safeParse(
        JSON.parse(
          sessionStorage.getItem(`hollow:workspace-deletion:${actorId}`) ??
            "[]",
        ),
      );
      if (currentActor() === actorId) {
        const rows = parsed.success
          ? parsed.data.filter((row) => row.actorId === actorId)
          : [];
        memory.current.set(actorId, { pending: rows, failed: false });
        setStored({
          actorId,
          pending: restoreDeletionIdentities(actorId, rows),
        });
        setStorageFailure(null);
      }
    } catch {
      if (currentActor() === actorId) {
        memory.current.set(actorId, { pending: [], failed: true });
        setStored({ actorId, pending: [] });
        setStorageFailure(actorId);
      }
    }
  }, [actorId, currentActor]);
  const remember = (
    workspaceId: string,
    value: PendingWorkspaceDeletion | null,
  ) => {
    if (
      !actorId ||
      currentActor() !== actorId ||
      (value && value.actorId !== actorId)
    )
      return;
    const previous = storedRef.current;
    const next = [
      ...(previous.actorId === actorId ? previous.pending : []).filter(
        (row) => row.input.workspaceId !== workspaceId,
      ),
      ...(value ? [value] : []),
    ];
    const updated = { actorId, pending: next };
    storedRef.current = updated;
    setStored(updated);
    const identities = next.map(deletionIdentity);
    memory.current.set(actorId, { pending: identities, failed: true });
    try {
      sessionStorage.setItem(
        `hollow:workspace-deletion:${actorId}`,
        JSON.stringify(identities),
      );
      memory.current.set(actorId, { pending: identities, failed: false });
      setStorageFailure(null);
    } catch {
      setStorageFailure(actorId);
    }
  };
  const accepted = (value: WorkspaceDeletionResult, navigate: boolean) => {
    if (!actorId || currentActor() !== actorId) return;
    const epoch = current.current.epoch;
    setResult({ actorId, value });
    for (const row of pending)
      if (row.input.requestId === value.requestId)
        remember(row.input.workspaceId, null);
    if (navigate)
      void router
        .navigate({ to: "/notes", search: scopeSearch() })
        .then(() => {
          if (currentActor() === actorId && current.current.epoch === epoch)
            void router.invalidate();
        })
        .catch(() => {});
  };
  return (
    <Context.Provider
      value={{ actorId, currentActor, pending, remember, accepted }}
    >
      {children}
      {actorId && storageFailure === actorId && pending.length > 0 && (
        <p className="workspace-deletion-notice" role="alert">
          このブラウザに受付番号を保存できませんでした。確認が終わるまで再読み込み・タブを閉じる操作を避けてください。閉じた場合は処理履歴で本人の受付結果を確認できます。
        </p>
      )}
      {actorId &&
        pending.map((row) => (
          <UnknownDeletion
            key={`${actorId}:${row.input.requestId}`}
            pending={row}
            currentActor={currentActor}
            onAccepted={(value) => accepted(value, false)}
          />
        ))}
      {actorId && result?.actorId === actorId && pathname !== "/notes/jobs" && (
        <WorkspaceDeletionReceipt
          key={`${actorId}:${result.value.requestId}`}
          actorId={actorId}
          currentActor={currentActor}
          result={result.value}
          refresh={lookup}
          onResult={(value) => accepted(value, false)}
        />
      )}
    </Context.Provider>
  );
}

export function WorkspaceDeletionSettings({
  workspaceId,
  name,
}: {
  workspaceId: string;
  name: string;
}) {
  const context = useContext(Context);
  if (!context?.actorId) return null;
  return (
    <WorkspaceDeletionPanel
      workspaceId={workspaceId}
      name={name}
      actorId={context.actorId}
      currentActor={context.currentActor}
      request={request}
      lookup={lookup}
      pendingRequest={
        context.pending.find((row) => row.input.workspaceId === workspaceId) ??
        null
      }
      onPendingRequestChange={(value) => context.remember(workspaceId, value)}
      onAccepted={(value) => context.accepted(value, true)}
    />
  );
}

function UnknownDeletion({
  pending,
  currentActor,
  onAccepted,
}: {
  pending: PendingWorkspaceDeletion;
  currentActor: () => string | null;
  onAccepted: (result: WorkspaceDeletionResult) => void;
}) {
  const operation = useDeletionOperation(pending.actorId, currentActor);
  const [message, setMessage] = useState("");
  if (!operation.ownsContext()) return null;
  return (
    <section
      className="workspace-deletion-receipt"
      aria-label="ワークスペース削除の受付確認"
    >
      <p>
        ワークスペース削除の受付はまだ確認できていません。同じ要求の結果を確認してください。
      </p>
      <button
        type="button"
        className="hollow-button"
        disabled={operation.busy}
        onClick={() =>
          operation.run(async (current) => {
            try {
              const result = await lookup({
                requestId: pending.input.requestId,
              });
              if (!current()) return;
              if (result) onAccepted(result);
              else
                setMessage(
                  "結果はまだ確認できません。受付処理中または表示期限外の可能性があります。",
                );
            } catch (cause) {
              if (current()) setMessage(displayError(cause));
            }
          })
        }
      >
        {operation.busy ? "確認中…" : "削除の受付結果を確認"}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
