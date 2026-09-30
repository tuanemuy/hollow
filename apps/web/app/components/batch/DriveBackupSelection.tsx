"use client";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useDriveBackupActivity } from "@/components/hollow/DriveBackupActivityProvider";
import { useAuthenticationOperation } from "@/components/hollow/useAuthenticationOperation";
import {
  driveBackupActivityFn,
  previewDriveBackupFn,
  requestDriveBackupBulkFn,
} from "@/presentation/driveBackupServerFn";
import { bootstrapAuthenticationFn } from "@/presentation/hollowAuth";
import { BatchDialog } from "./BatchDialog";
import { useBatchSelection } from "./BatchSelectionProvider";
import { type BatchContext, sameBatchContext } from "./model";

export function DriveBackupSelection({
  context,
  ids,
  workspaceId,
  disabled,
}: {
  context: BatchContext;
  ids: readonly string[];
  workspaceId: string | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        原本をDriveへバックアップ
      </button>
      {open && (
        <Confirmation
          key={JSON.stringify([context, ids])}
          context={context}
          ids={ids}
          workspaceId={workspaceId}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function Confirmation({
  context,
  ids,
  workspaceId,
  close,
}: {
  context: BatchContext;
  ids: readonly string[];
  workspaceId: string | null;
  close(): void;
}) {
  const router = useRouter();
  const selection = useBatchSelection();
  const { watch } = useDriveBackupActivity();
  const ticket = useAuthenticationOperation();
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewDriveBackupFn>
  > | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const life = useRef(true);
  const queued = useRef(false);
  const command = useRef<string | null>(null);
  const validScope = useCallback(
    () => life.current && sameBatchContext(context, selection.currentContext()),
    [context, selection.currentContext],
  );
  const read = useCallback(() => {
    if (!validScope()) return;
    if (busy.current) {
      queued.current = true;
      return;
    }
    busy.current = true;
    const auth = ticket();
    const current = () => validScope() && auth();
    const locator = command.current;
    start(async () => {
      try {
        if (locator) {
          const result = await driveBackupActivityFn({
            data: { commandId: locator },
          });
          if (
            !current() ||
            result.actor.accountId !== context.actorId ||
            locator !== command.current
          )
            return;
          if (result.receipt) {
            setAccepted(result.receipt.requestId);
            watch(result.receipt.receiptId);
            setError("");
          } else
            setError(
              "受付をまだ確認できません。自動では再送しません。しばらくして結果を確認してください。",
            );
        } else {
          const result = await previewDriveBackupFn({
            data: { noteIds: [...ids], workspaceId },
          });
          if (!current() || result.actor.accountId !== context.actorId) return;
          setPreview(result);
          setError("");
        }
      } catch {
        if (current())
          setError("現在の条件・受付結果を確認できません。再読してください。");
      } finally {
        busy.current = false;
        if (queued.current) {
          queued.current = false;
          read();
        }
      }
    });
  }, [watch, context.actorId, ids, ticket, validScope, workspaceId]);
  useEffect(() => {
    life.current = true;
    return () => {
      life.current = false;
      queued.current = false;
    };
  }, []);
  useEffect(() => {
    read();
  }, [read]);
  useEffect(
    () =>
      router.subscribe("onResolved", () => {
        if (validScope()) read();
      }),
    [read, router, validScope],
  );
  const confirm = () => {
    if (
      busy.current ||
      !validScope() ||
      !preview ||
      command.current ||
      preview.pending + preview.recorded === 0
    )
      return;
    const commandId = crypto.randomUUID();
    command.current = commandId;
    busy.current = true;
    const auth = ticket();
    const current = () => validScope() && auth();
    start(async () => {
      try {
        await bootstrapAuthenticationFn();
        if (!current()) return;
        const result = await requestDriveBackupBulkFn({
          data: {
            noteIds: [...ids],
            workspaceId,
            commandId,
            expectedDigest: preview.digest,
          },
        });
        if (!current()) return;
        setAccepted(result.requestId);
        watch(result.requestId);
        setError("");
        await router.invalidate();
      } catch {
        if (current())
          setError(
            "受付結果が不明です。結果を確認してください。選択は保持し、自動では再送しません。",
          );
      } finally {
        busy.current = false;
        if (validScope()) {
          queued.current = false;
          read();
        }
      }
    });
  };
  return (
    <BatchDialog
      title="原本の一括バックアップ"
      pending={pending}
      onClose={close}
      context={context}
      currentContext={selection.currentContext}
    >
      <p>
        固定した選択だけを本人のDriveへ保存します。新しく条件に一致したノートは追加しません。画面を離れても処理は続きます。
      </p>
      <p>
        取消は未開始分だけを止めます。開始済みは終了を待ち、成功・失敗・結果不明をそのまま残します。
      </p>
      {preview && (
        <>
          <p>保存先：{preview.folderName}</p>
          <dl>
            <dt>選択</dt>
            <dd>{preview.selected}件</dd>
            <dt>原本なし</dt>
            <dd>{preview.noOriginal}件</dd>
            <dt>編集不可・対象外</dt>
            <dd>{preview.denied}件</dd>
            <dt>処理中・前回の確認が必要</dt>
            <dd>{preview.processing}件</dd>
            <dt>保存済み（送信不要）</dt>
            <dd>{preview.recorded}件</dd>
            <dt>新しく処理する原本</dt>
            <dd>{preview.pending}件</dd>
          </dl>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {accepted && (
        <p role="status">
          受け付けました。ジョブ履歴で進捗と結果を確認できます。
        </p>
      )}
      <button type="button" disabled={pending} onClick={read}>
        {command.current ? "受付結果を確認" : "現在の対象を再確認"}
      </button>
      {!accepted && (
        <button
          type="button"
          disabled={
            pending ||
            !preview ||
            Boolean(command.current) ||
            preview.pending + preview.recorded === 0
          }
          onClick={confirm}
        >
          この固定対象をバックアップ
        </button>
      )}
    </BatchDialog>
  );
}
