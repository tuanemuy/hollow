"use client";

import type { NoteView } from "@repo/core/application/note/view";
import { Link, useBlocker, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { BrowserWysEditor } from "@/adapters/wys/browser";
import type { WysCanonicalAcknowledgement } from "@/adapters/wys/canonicalMedia";
import type { Plan as WysPlan } from "@/adapters/wys/model";
import { displayError } from "@/presentation/errorDisplay";
import { extractSerializedError } from "@/presentation/errorResponse";
import { renderNoteFn } from "@/presentation/hollowMedia";
import { getWysContextFn, saveNoteFn } from "@/presentation/hollowNotes";
import { readReferencesFn } from "@/presentation/hollowReferences";
import {
  getNoteVersionFn,
  listRevisionsFn,
} from "@/presentation/hollowRevisions";
import { BrowserHtmlEditor } from "./BrowserHtmlEditor";
import { frameDocument, mediaMarkup } from "./editorMedia";
import {
  type EditorMode,
  editorModeKey,
  isEditorMode,
  readEditorMode,
  resolveEditorMode,
  writeEditorMode,
} from "./editorMode";
import {
  createEditorModeRequests,
  type EditorModeRequest,
} from "./editorModeRequest";
import {
  clearCreationBackup,
  type EditorDraft as Draft,
  draftKey,
  editorRecoveryDownload,
  editorSaveCause,
  hasUnseenEditorUpdate,
  oneShotEditorConfirmation,
  readEditorBackup,
  sameDraft as same,
  sameBody,
  settleEditorSave,
  writeEditorBackup,
} from "./editorSave";
import { HtmlDiagnostics } from "./HtmlDiagnostics";
import { HtmlSourceEditor } from "./HtmlSourceEditor";
import { NoteContent } from "./NoteContent";
import { useEditorMedia } from "./useEditorMedia";
import { VisualEditor } from "./VisualEditor";
import { WysEditor } from "./WysEditor";
import {
  discardedWysRecovery,
  prepareDiscardedWys,
  type WysDiscardBaseline,
} from "./wysDiscard";
import {
  acknowledgeWysRecovery,
  confirmWysRecoveryOrigin,
  shouldWarnWys,
  type WysRecovery,
  type WysSavedRestoreTarget,
  wysAfterSourceEdit,
  wysRestoreTarget,
  wysWarningKey,
} from "./wysRecovery";
import "./editor-media.css";

const blank: Draft = { title: "", html: "" };

export function NoteEditor({
  note,
  userId,
  initialMode,
}: {
  note?: NoteView;
  userId: string;
  initialMode?: EditorMode | undefined;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(note ?? blank);
  const [saved, setSaved] = useState<Draft>(note ?? blank);
  const [mode, setMode] = useState<EditorMode>(
    initialMode ?? (note ? "html" : "wysiwyg"),
  );
  const [modeRequests] = useState(createEditorModeRequests);
  const [modePrompt, setModePrompt] = useState<EditorModeRequest>();
  const [modeNotice, setModeNotice] = useState("");
  const [wysPlan, setWysPlan] = useState<WysPlan>();
  const wysDiscardBaseline = useRef<WysDiscardBaseline | undefined>(undefined);
  const [wysAcknowledgement, setWysAcknowledgement] =
    useState<WysCanonicalAcknowledgement>();
  const [wysBaselineConverted, setWysBaselineConverted] = useState(false);
  const [wysPreparing, setWysPreparing] = useState(false);
  const [wysDiscard, setWysDiscard] = useState<
    { kind: "preparing" } | { kind: "failed"; reason: string }
  >();
  const [checkingRecovery, startRecoveryCheck] = useTransition();
  const [wysPrompt, setWysPrompt] = useState<{
    request: EditorModeRequest;
    value: Draft;
    plan: WysPlan;
    metadata: WysRecovery;
    initial: boolean;
    htmlOriginal: boolean;
  }>();
  const [wysRemember, setWysRemember] = useState(false);
  const [wysReprepare, setWysReprepare] = useState<string>();
  const [wysOriginAvailable, setWysOriginAvailable] = useState<
    boolean | undefined
  >();
  const [wysSavedOrigin, setWysSavedOrigin] =
    useState<WysSavedRestoreTarget | null>(null);
  const wysInitialStarted = useRef(false);
  const wysCreationContinuation = useRef(false);
  const wysBusy = useRef(false);
  const [sourceSelection, setSourceSelection] = useState<{
    offset: number;
    sequence: number;
  }>();
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const analysis = useRef<{ html: string; ready: boolean }>({
    html: "",
    ready: false,
  });
  const visualState = useRef({ busy: true, composing: false, error: false });
  const composing = useRef(false);
  const changeModeRef = useRef<(request: EditorModeRequest) => Promise<void>>(
    async () => {},
  );
  const [externalUpdate, setExternalUpdate] = useState(false);
  const [updateCheckError, setUpdateCheckError] = useState("");
  const [historyPrompt, setHistoryPrompt] = useState(false);
  const [conflict, setConflict] = useState<{
    version: number;
    finish: boolean;
    cause: "manual" | "autosave";
    history: boolean;
    targetMode?: EditorModeRequest | undefined;
  } | null>(null);
  const notifiedVersion = useRef(note?.version ?? -1);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [recoveryNoteId, setRecoveryNoteId] = useState<string>();
  const [navigating, setNavigating] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const [referenceSettingsLoaded, setReferenceSettingsLoaded] = useState(!note);
  const current = useRef(draft);
  const currentMode = useRef(mode);
  currentMode.current = mode;
  const persisted = useRef(note);
  const initial = useRef(note ?? blank);
  const inFlight = useRef(false);
  const leaving = useRef(false);
  const navigationLocked = useRef(false);
  const updateDraft = useCallback(
    (next: Draft) => {
      if (navigationLocked.current) return;
      current.current = next;
      setDraft(next);
      try {
        writeEditorBackup(
          localStorage,
          userId,
          note?.id,
          persisted.current?.id,
          next,
          true,
          currentMode.current,
        );
      } catch {
        setStorageError(
          "ブラウザへの退避に失敗しました。内容をダウンロードして保管してください。",
        );
      }
    },
    [note?.id, userId],
  );
  const [mediaAlt, setMediaAlt] = useState("");
  const wysInsertMedia = useRef<
    | ((input: {
        src: string;
        kind: "image" | "video";
        alt: string;
      }) => boolean)
    | null
  >(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const media = useEditorMedia({
    noteId: persisted.current?.id,
    draftId: draft.draftId,
    onDraft: (draftId) => {
      const next = { ...current.current, draftId };
      current.current = next;
      setDraft(next);
    },
    onInsert: (asset, alt, draftId, removedItems) => {
      if (
        currentMode.current === "wysiwyg" &&
        wysInsertMedia.current?.({ src: asset.url, kind: asset.kind, alt })
      ) {
        const next = { ...current.current, draftId };
        current.current = next;
        setDraft(next);
        setRemoved((items) => [...items, ...removedItems]);
        setError("");
        return;
      }
      const html =
        current.current.html +
        mediaMarkup(asset, alt, { noteId: persisted.current?.id, draftId });
      const next = {
        ...current.current,
        html,
        draftId,
        wys: wysAfterSourceEdit(
          current.current.html,
          html,
          current.current.wys,
        ),
      };
      current.current = next;
      setDraft(next);
      setRemoved((items) => [...items, ...removedItems]);
      setError("");
    },
  });
  const key = draftKey(userId, note?.id);
  const dirty = !same(draft, saved);
  current.current = draft;
  const editingNoteId = note?.id;
  const historyNoteId = persisted.current?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: A different editor context invalidates outstanding mode requests.
  useEffect(
    () => () => modeRequests.cancel(),
    [modeRequests, userId, editingNoteId],
  );

  const cancelModeRequest = useCallback(() => {
    modeRequests.cancel();
    setModePrompt(undefined);
    setModeNotice("");
    setWysPrompt(undefined);
    wysBusy.current = false;
    setWysPreparing(false);
    setWysDiscard((value) =>
      value?.kind === "preparing"
        ? {
            kind: "failed",
            reason:
              "編集画面の準備を取り消しました。保存済み本文を保持しています。",
          }
        : value,
    );
  }, [modeRequests]);

  useEffect(() => {
    if (!editingNoteId) return;
    let disposed = false;
    void readReferencesFn({ data: { noteId: editingNoteId } })
      .then((settings) => {
        if (disposed) return;
        setDraft((value) =>
          value.importReferences === undefined
            ? { ...value, importReferences: settings.enabled }
            : value,
        );
        setSaved((value) => ({ ...value, importReferences: settings.enabled }));
        setReferenceSettingsLoaded(true);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "参照取り込みの設定を取得できません。本文は保存できますが、参照設定は現在の値を維持します。",
          );
      });
    return () => {
      disposed = true;
    };
  }, [editingNoteId]);

  useBlocker({
    shouldBlockFn: () =>
      composing.current ||
      visualState.current.composing ||
      (!leaving.current &&
        (media.hasUnresolved() || !same(current.current, saved)) &&
        !window.confirm(
          "未保存の変更または未完了のメディアがあります。画面を離れると未完了ファイルは再選択が必要です。離れますか？",
        )),
    enableBeforeUnload: () =>
      !leaving.current &&
      (media.hasUnresolved() || !same(current.current, saved)),
  });

  useEffect(() => {
    const beforeSignOut = (event: Event) => {
      if (
        inFlight.current ||
        media.hasUnresolved() ||
        composing.current ||
        visualState.current.composing
      ) {
        event.preventDefault();
        setError(
          "保存・メディア処理が終わるか、未完了ファイルを除去してからサインアウトしてください。",
        );
        return;
      }
      if (
        !same(current.current, saved) &&
        !window.confirm(
          "未保存の変更があります。内容をこのブラウザに退避してサインアウトしますか？",
        )
      )
        event.preventDefault();
    };
    const signedOut = () => {
      modeRequests.cancel();
      leaving.current = true;
    };
    window.addEventListener("hollow:before-signout", beforeSignOut);
    window.addEventListener("hollow:signed-out", signedOut);
    return () => {
      window.removeEventListener("hollow:before-signout", beforeSignOut);
      window.removeEventListener("hollow:signed-out", signedOut);
    };
  }, [saved, media.hasUnresolved, modeRequests]);

  useEffect(() => {
    try {
      const stored = readEditorBackup(localStorage, key);
      const bridge = editingNoteId
        ? readEditorBackup(localStorage, draftKey(userId))
        : null;
      if (
        bridge?.noteId === editingNoteId &&
        bridge?.mode === "wysiwyg" &&
        bridge.draft.wys &&
        sameBody(bridge.draft, initial.current)
      ) {
        const continued = { ...initial.current, wys: bridge.draft.wys };
        current.current = continued;
        setDraft(continued);
        setSaved(continued);
        wysCreationContinuation.current = true;
      }
      const rawMode = localStorage.getItem(editorModeKey(userId));
      if (rawMode !== null && !isEditorMode(rawMode))
        setModeNotice(
          "端末に保存されたモードが無効なため、標準のモードで開きました。入力や退避は保持しています。",
        );
      const restoredMode = resolveEditorMode({
        isNew: !editingNoteId,
        backup: stored?.mode,
        explicit: initialMode,
        device: readEditorMode(localStorage, userId),
      });
      setMode(restoredMode);
      if (stored) {
        if (
          !same(stored.draft, initial.current) ||
          (!editingNoteId && stored.noteId)
        )
          setRecovery(
            restoredMode === "wysiwyg" && !stored.draft.wys
              ? {
                  ...stored.draft,
                  wys: {
                    version: 1,
                    converted: true,
                    originSaved: false,
                    origin: null,
                    ...(editingNoteId || stored.noteId
                      ? { invalidOrigin: true as const }
                      : {}),
                  },
                }
              : stored.draft,
          );
        if (!editingNoteId) setRecoveryNoteId(stored.noteId);
      }
      if (editingNoteId)
        clearCreationBackup(localStorage, userId, editingNoteId);
    } catch {
      setStorageError(
        "このブラウザでは未保存内容を退避できません。離れる前に保存してください。",
      );
    }
    setReady(true);
  }, [key, editingNoteId, userId, initialMode]);

  useEffect(() => {
    if (
      !note ||
      !persisted.current ||
      note.version <= persisted.current.version
    )
      return;
    if (
      hasUnseenEditorUpdate(
        note.version,
        persisted.current.version,
        notifiedVersion.current,
      )
    ) {
      notifiedVersion.current = note.version;
      setExternalUpdate(true);
    }
  }, [note]);

  useEffect(() => {
    if (!editingNoteId) return;
    let disposed = false;
    let checking = false;
    const check = async () => {
      if (disposed || checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const observed = await getNoteVersionFn({
          data: { noteId: editingNoteId },
        });
        if (disposed) return;
        setUpdateCheckError("");
        if (
          hasUnseenEditorUpdate(
            observed.version,
            persisted.current?.version ?? -1,
            notifiedVersion.current,
          )
        ) {
          notifiedVersion.current = observed.version;
          setExternalUpdate(true);
        }
      } catch {
        if (!disposed)
          setUpdateCheckError(
            "他の画面からの更新を確認できません。入力内容は保持しています。通信が戻ると確認を再開します。",
          );
      } finally {
        checking = false;
      }
    };
    const changed = (event: StorageEvent) => {
      if (
        event.key === `hollow:note-update:${userId}` &&
        event.newValue === persisted.current?.id
      ) {
        void check();
      }
    };
    window.addEventListener("storage", changed);
    const visible = () => void check();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    const timer = window.setInterval(visible, 5000);
    void check();
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [editingNoteId, userId]);

  useEffect(() => {
    if (!ready || recovery) return;
    try {
      writeEditorBackup(
        localStorage,
        userId,
        note?.id,
        persisted.current?.id,
        draft,
        dirty,
        mode,
      );
    } catch {
      setStorageError(
        "ブラウザへの退避に失敗しました。内容をダウンロードして保管してください。",
      );
    }
  }, [draft, dirty, note?.id, userId, ready, recovery, mode]);

  const save = useCallback(
    (
      finish = false,
      cause: "manual" | "autosave" = "manual",
      history = false,
      confirmedVersion?: number,
      targetMode?: EditorModeRequest,
    ) => {
      if (finish || history) cancelModeRequest();
      if (targetMode && !modeRequests.owns(targetMode)) return;
      if (inFlight.current || recovery) return;
      if (composing.current || visualState.current.composing) {
        setError(
          "文字変換を確定してから保存・切替してください。入力は保持しています。",
        );
        return;
      }
      if (wysBusy.current || (currentMode.current === "wysiwyg" && !wysPlan)) {
        setError(
          "WYSIWYGの準備・確認を完了してください。入力は保持しています。",
        );
        return;
      }
      if (media.hasUnresolved()) {
        setError(
          "メディアの完了を待っています。失敗したファイルは再試行または除去してください。",
        );
        return;
      }
      const snapshot = current.current;
      if (!persisted.current && sameBody(snapshot, blank)) {
        if (finish) {
          leaving.current = true;
          void router.navigate({ to: "/notes" });
        }
        return;
      }
      if (new TextEncoder().encode(snapshot.html).byteLength > 800 * 1024) {
        setError(
          "本文は 800 KB 以内にしてください。ノートの分割をお試しください。",
        );
        return;
      }
      inFlight.current = true;
      setConflict(null);
      startTransition(async () => {
        try {
          let hadRemovals = removed.length > 0;
          const consumeConfirmation =
            oneShotEditorConfirmation(confirmedVersion);
          await settleEditorSave({
            read: () => current.current,
            persist: async (snapshot) => {
              let value = snapshot;
              const started = Date.now();
              while (
                currentMode.current === "html"
                  ? analysis.current.html !== value.html ||
                    !analysis.current.ready
                  : currentMode.current === "visual" && visualState.current.busy
              ) {
                if (Date.now() - started > 10000)
                  throw new Error(
                    "最新の構文・補正結果を確認してから保存してください。入力は保持しています。",
                  );
                await new Promise((resolve) => window.setTimeout(resolve, 50));
                value = current.current;
              }
              if (
                composing.current ||
                visualState.current.composing ||
                (currentMode.current === "visual" && visualState.current.error)
              )
                throw new Error(
                  "文字の対応または入力確定を確認してください。入力は保持しています。",
                );
              if (new TextEncoder().encode(value.html).byteLength > 800 * 1024)
                throw new Error("本文は 800 KB 以内にしてください。");
              const old = persisted.current;
              const wys = value.wys;
              if (
                wys?.converted &&
                !wys.originSaved &&
                wys.invalidOrigin &&
                value.html !== old?.html
              )
                throw new Error(
                  "変換前の版を確認できません。最新本文は保持しています。HTMLで回復して続けてください。",
                );
              const confirmed = consumeConfirmation();
              const result = await saveNoteFn({
                data: {
                  ...value,
                  ...(wys?.converted && !wys.originSaved && wys.origin
                    ? {
                        wysOrigin: {
                          revisionNo: wys.origin.revisionNo,
                          capturedNoteVersion: wys.origin.capturedNoteVersion,
                        },
                      }
                    : {}),
                  cause: editorSaveCause(value, old, cause),
                  ...(confirmed !== undefined
                    ? { confirmedVersion: confirmed }
                    : {}),
                  ...(old ? { id: old.id, version: old.version } : {}),
                },
              });
              return { ...result, submitted: value };
            },
            accept: (_snapshot, result) => {
              const snapshot = result.submitted;
              persisted.current = result.note;
              setWysSavedOrigin(result.wysContext.origin);
              const accepted = {
                ...result.note,
                draftId: snapshot.draftId,
                importReferences: snapshot.importReferences,
                wys: snapshot.wys
                  ? acknowledgeWysRecovery(
                      snapshot.wys,
                      result.wysContext.origin?.revisionNo,
                    )
                  : undefined,
              };
              setSaved(accepted);
              setRemoved((items) => [...items, ...result.removed]);
              hadRemovals ||= result.removed.length > 0;
              setError("");
              const unchanged = same(current.current, snapshot);
              if (
                result.wysContext.origin &&
                current.current.wys &&
                snapshot.wys?.converted &&
                result.wysContext.origin.revisionNo ===
                  snapshot.wys.origin?.revisionNo &&
                current.current.wys.origin?.revisionNo ===
                  snapshot.wys?.origin?.revisionNo
              ) {
                current.current = {
                  ...current.current,
                  wys: { ...current.current.wys, originSaved: true },
                };
                setDraft(current.current);
              }
              if (unchanged) {
                if (
                  currentMode.current === "wysiwyg" &&
                  snapshot.draftId &&
                  snapshot.html !== result.note.html
                )
                  setWysAcknowledgement({
                    submitted: snapshot.html,
                    canonical: result.note.html,
                    draftId: snapshot.draftId,
                    noteId: result.note.id,
                  });
                current.current = accepted;
                setDraft(current.current);
              }
              try {
                writeEditorBackup(
                  localStorage,
                  userId,
                  note?.id,
                  result.note.id,
                  current.current,
                  !same(current.current, accepted),
                  currentMode.current,
                );
                localStorage.setItem(
                  `hollow:note-update:${userId}`,
                  result.note.id,
                );
                localStorage.removeItem(`hollow:note-update:${userId}`);
              } catch {
                setStorageError(
                  "ブラウザの退避領域を更新できませんでした。サーバーへの保存は完了しています。",
                );
              }
              return accepted;
            },
            refresh: () => router.invalidate(),
            continueSaving: finish || !note || Boolean(targetMode),
            shouldNavigate: () =>
              Boolean(targetMode && modeRequests.owns(targetMode)) ||
              ((finish || !note) && !hadRemovals),
            lock: (locked) => {
              if (targetMode && note) return;
              navigationLocked.current = locked;
              flushSync(() => setNavigating(locked));
            },
            navigate: async (result) => {
              if (targetMode && note) {
                if (modeRequests.owns(targetMode))
                  await changeModeRef.current(targetMode);
                setModePrompt((prompt) =>
                  prompt === targetMode ? undefined : prompt,
                );
                return;
              }
              leaving.current = true;
              if (finish)
                await router.navigate({
                  to: "/notes/$noteId",
                  params: { noteId: result.note.id },
                  hash: history ? "note-history" : "",
                });
              else
                await router.navigate({
                  to: "/notes/$noteId/edit",
                  params: { noteId: result.note.id },
                  search: {
                    mode:
                      targetMode && modeRequests.owns(targetMode)
                        ? targetMode.target
                        : currentMode.current,
                  },
                  replace: true,
                });
              try {
                clearCreationBackup(localStorage, userId, result.note.id);
              } catch {
                setStorageError(
                  "保存は完了しましたが、移行前の退避情報を消去できませんでした。",
                );
              }
            },
          });
        } catch (failure) {
          if (
            extractSerializedError(failure).code === "WYS_ORIGIN_UNAVAILABLE" &&
            current.current.wys?.converted &&
            !current.current.wys.originSaved
          )
            updateDraft({
              ...current.current,
              wys: { ...current.current.wys, invalidOrigin: true },
            });
          setError(
            `未保存です。${displayError(failure)} 再試行するか、内容をダウンロードしてください。`,
          );
          const id = persisted.current?.id;
          if (extractSerializedError(failure).code === "NOTE_CONFLICT" && id) {
            try {
              const latest = await getNoteVersionFn({ data: { noteId: id } });
              setConflict({
                version: latest.version,
                finish,
                cause,
                history,
                targetMode:
                  targetMode && modeRequests.owns(targetMode)
                    ? targetMode
                    : undefined,
              });
            } catch (readFailure) {
              setError(
                `未保存の内容は保持しています。最新の状態を確認できません。${displayError(readFailure)}`,
              );
            }
          }
        } finally {
          leaving.current = false;
          inFlight.current = false;
        }
      });
    },
    [
      note,
      recovery,
      router,
      userId,
      media.hasUnresolved,
      removed,
      cancelModeRequest,
      modeRequests,
      wysPlan,
      updateDraft,
    ],
  );

  useEffect(() => {
    void analysisVersion;
    if (
      !dirty ||
      pending ||
      media.items.length > 0 ||
      !ready ||
      recovery ||
      conflict ||
      error ||
      wysPreparing ||
      wysPrompt ||
      (mode === "wysiwyg" && !wysPlan) ||
      (mode === "html" &&
        (analysis.current.html !== draft.html || !analysis.current.ready)) ||
      composing.current ||
      (mode === "visual" &&
        (visualState.current.busy ||
          visualState.current.composing ||
          visualState.current.error))
    )
      return;
    const timeout = window.setTimeout(() => {
      if (current.current === draft) save(false, "autosave");
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [
    dirty,
    draft,
    pending,
    ready,
    recovery,
    conflict,
    error,
    save,
    media.items.length,
    mode,
    analysisVersion,
    wysPreparing,
    wysPrompt,
    wysPlan,
  ]);
  useEffect(() => {
    const retry = () => {
      if (!same(current.current, saved)) save(false, "autosave");
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [save, saved]);

  function discard(confirm = true) {
    cancelModeRequest();
    if (inFlight.current) {
      setError("保存が完了してから破棄してください。");
      return false;
    }
    if (composing.current || visualState.current.composing) {
      setError("文字変換を確定してから破棄してください。");
      return false;
    }
    if (
      confirm &&
      (dirty || media.hasUnresolved()) &&
      !window.confirm("未保存の変更を破棄し、最後に保存した内容に戻しますか？")
    )
      return false;
    media.clear();
    const metadata =
      currentMode.current === "wysiwyg"
        ? discardedWysRecovery(
            saved,
            persisted.current?.id,
            wysDiscardBaseline.current,
          )
        : saved.wys;
    const snapshot = metadata ? { ...saved, wys: metadata } : saved;
    setDraft(snapshot);
    current.current = snapshot;
    setError("");
    setRemoved([]);
    setRecovery(null);
    setConflict(null);
    if (currentMode.current === "wysiwyg") {
      setWysPlan(undefined);
      setWysAcknowledgement(undefined);
      setWysReprepare(undefined);
      setWysBaselineConverted(snapshot.wys?.converted ?? false);
      void resetDiscardedWys(snapshot);
    }
    try {
      localStorage.removeItem(key);
    } catch {
      setStorageError("退避データを消去できませんでした。");
    }
    return true;
  }

  async function resetDiscardedWys(snapshot: Draft) {
    const request = modeRequests.begin("wysiwyg");
    wysBusy.current = true;
    setWysDiscard({ kind: "preparing" });
    const result = await prepareDiscardedWys(
      snapshot.html,
      request.signal,
      new BrowserWysEditor(),
      () => modeRequests.owns(request),
    );
    if (!modeRequests.owns(request)) return;
    wysBusy.current = false;
    if (
      currentMode.current !== "wysiwyg" ||
      current.current.html !== snapshot.html ||
      current.current.wys !== snapshot.wys ||
      composing.current ||
      media.hasUnresolved()
    ) {
      setWysDiscard({
        kind: "failed",
        reason:
          "準備中に入力が変わりました。現在の本文を保持して再試行できます。",
      });
      return;
    }
    if (result.kind === "ready") {
      setWysPlan(result.plan);
      setWysDiscard(undefined);
    } else if (result.kind === "failed") {
      setWysDiscard({ kind: "failed", reason: result.reason });
    }
  }

  function download() {
    const backup = editorRecoveryDownload(
      recovery ?? current.current,
      currentMode.current,
    );
    const url = URL.createObjectURL(
      new Blob([backup.content], { type: backup.mime }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = backup.filename;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function changeMode(request: EditorModeRequest) {
    if (!modeRequests.owns(request)) return;
    const next = request.target;
    try {
      if (next === "wysiwyg") {
        await prepareWys(request, false);
        return;
      }
      if (next === "visual") {
        const value = current.current;
        const analyzer = new BrowserHtmlEditor();
        setModeNotice("ビジュアル編集できる文字を確認しています…");
        try {
          const rendered = await renderNoteFn({
            data: {
              html: value.html,
              noteId: persisted.current?.id,
              draftId: value.draftId,
            },
          });
          if (!modeRequests.owns(request)) return;
          const projection = await analyzer.project(
            {
              generation: crypto.randomUUID(),
              canonical: rendered.canonical,
              rendered: rendered.html,
              document: frameDocument(
                rendered.html,
                rendered.assetUrls,
                location.origin,
                rendered.externalSources,
                note?.display.style,
              ),
            },
            request.signal,
          );
          if (!modeRequests.owns(request)) return;
          if (
            !same(current.current, value) ||
            composing.current ||
            visualState.current.composing ||
            media.hasUnresolved()
          ) {
            setModeNotice(
              "確認中に入力が変わりました。最新内容で切替をやり直してください。",
            );
            return;
          }
          if (!projection.texts.length || projection.issues.length) {
            setModeNotice(
              projection.issues[0] ??
                "編集できる文字がないため、ビジュアル編集へ切り替えできません。",
            );
            return;
          }
        } finally {
          analyzer.dispose();
        }
      }
      if (!modeRequests.owns(request)) return;
      setMode(next);
      currentMode.current = next;
      composing.current = false;
      visualState.current = { busy: false, composing: false, error: false };
      setError("");
      setModeNotice("");
      try {
        writeEditorMode(localStorage, userId, next);
      } catch {
        setStorageError(
          "この端末の既定モードを記録できません。現在の入力は保持しています。",
        );
      }
    } catch (cause) {
      if (modeRequests.owns(request))
        setModeNotice(`モードは変更していません。${displayError(cause)}`);
    }
  }
  function requestMode(next: EditorMode) {
    const request = modeRequests.begin(next);
    setModePrompt(undefined);
    setModeNotice("");
    setWysPrompt(undefined);
    wysBusy.current = false;
    setWysPreparing(false);
    setWysDiscard(undefined);
    if (next === currentMode.current && (next !== "wysiwyg" || wysPlan)) return;
    if (
      pending ||
      media.hasUnresolved() ||
      composing.current ||
      visualState.current.composing
    ) {
      setModeNotice(
        "保存・メディア・文字変換の完了を待ってください。入力は保持しています。",
      );
      modeRequests.cancel();
      return;
    }
    if (dirty) setModePrompt(request);
    else void changeMode(request);
  }
  changeModeRef.current = changeMode;

  function acceptWys(value: NonNullable<typeof wysPrompt>, remember: boolean) {
    if (!modeRequests.owns(value.request)) return;
    if (
      !sameBody(current.current, value.value) ||
      composing.current ||
      visualState.current.composing ||
      media.hasUnresolved()
    ) {
      setWysPrompt(undefined);
      setModeNotice(
        "確認中に入力やメディアが変わりました。最新内容で準備し直してください。",
      );
      return;
    }
    const next = { ...current.current, wys: value.metadata };
    if (
      !value.value.wys &&
      !value.metadata.converted &&
      sameBody(value.value, saved)
    )
      wysDiscardBaseline.current = {
        noteId: persisted.current?.id,
        source: value.plan.source,
        recovery: value.metadata,
      };
    current.current = next;
    setDraft(next);
    setWysPlan(value.plan);
    setWysPrompt(undefined);
    setWysReprepare(undefined);
    setWysBaselineConverted(value.metadata.converted);
    setMode("wysiwyg");
    currentMode.current = "wysiwyg";
    setModeNotice("");
    setError("");
    try {
      if (remember) localStorage.setItem(wysWarningKey(userId), "hidden-v1");
      if (!value.initial) writeEditorMode(localStorage, userId, "wysiwyg");
    } catch {
      setStorageError(
        "この端末に警告・既定モードを記録できません。次回も確認します。",
      );
    }
  }
  async function prepareWys(request: EditorModeRequest, initial: boolean) {
    const value = current.current;
    const analyzer = new BrowserWysEditor();
    wysBusy.current = true;
    setWysPreparing(true);
    setModeNotice("WYSIWYGの編集モデルと保持内容を準備しています…");
    try {
      const context = persisted.current
        ? await getWysContextFn({ data: { id: persisted.current.id } })
        : null;
      if (!modeRequests.owns(request)) return;
      setWysSavedOrigin(context?.origin ?? null);
      let metadata = value.wys;
      if (metadata) {
        if (metadata.origin) {
          const list = await listRevisionsFn({
            data: { noteId: persisted.current?.id ?? metadata.origin.noteId },
          });
          if (!modeRequests.owns(request)) return;
          const confirmed = confirmWysRecoveryOrigin(
            metadata,
            persisted.current?.id ?? "",
            context?.origin ?? null,
            list.items,
          );
          setWysOriginAvailable(confirmed.available);
          metadata = confirmed.recovery;
        }
      } else {
        if (context && context.version !== persisted.current?.version)
          throw new Error(
            "準備中に保存済みの本文が更新されました。最新の内容を確認して開き直してください。入力は保持しています。",
          );
        metadata = {
          version: 1,
          converted: false,
          originSaved: false,
          origin: context?.currentRevision
            ? { noteId: context.noteId, ...context.currentRevision }
            : null,
        };
        setWysOriginAvailable(Boolean(metadata.origin));
      }
      const plan = await analyzer.prepare(value.html, request.signal);
      if (!modeRequests.owns(request)) return;
      const prepared = {
        request,
        value,
        plan,
        metadata,
        initial,
        htmlOriginal: context?.originalFormat === "html",
      };
      if (
        value.html &&
        !(initial && wysCreationContinuation.current) &&
        shouldWarnWys(localStorage, userId)
      ) {
        setWysPrompt(prepared);
        setModeNotice("");
      } else acceptWys(prepared, false);
    } catch (cause) {
      if (modeRequests.owns(request))
        setModeNotice(
          cause instanceof Error ? cause.message : displayError(cause),
        );
    } finally {
      analyzer.dispose();
      if (modeRequests.owns(request)) {
        wysBusy.current = false;
        setWysPreparing(false);
      }
    }
  }
  useEffect(() => {
    if (
      !ready ||
      recovery ||
      mode !== "wysiwyg" ||
      wysPlan ||
      wysInitialStarted.current
    )
      return;
    wysInitialStarted.current = true;
    void prepareWys(modeRequests.begin("wysiwyg"), true);
  });

  const restoreTarget = wysRestoreTarget(
    draft.wys,
    wysSavedOrigin,
    wysOriginAvailable,
  );
  return (
    <section className="hollow-editor">
      <div className="hollow-page-heading">
        <div>
          <p className="hollow-eyebrow">個人 / 非公開</p>
          <h1>{note ? "ノートを編集" : "新しいノート"}</h1>
        </div>
        <span className="hollow-save-state" role="status">
          {media.items.some((item) => item.status === "uploading")
            ? "メディアをアップロード中…"
            : navigating
              ? "保存済みのノートへ移動中…"
              : pending
                ? "保存中…"
                : dirty
                  ? "未保存"
                  : note || persisted.current
                    ? "保存済み"
                    : "入力すると自動保存"}
        </span>
      </div>
      {historyNoteId && (
        <p>
          <Link
            to="/notes/$noteId"
            params={{ noteId: historyNoteId }}
            hash="note-history"
            onClick={(event) => {
              cancelModeRequest();
              if (
                pending ||
                navigating ||
                composing.current ||
                visualState.current.composing
              ) {
                event.preventDefault();
                return;
              }
              if (dirty || media.hasUnresolved()) {
                event.preventDefault();
                setHistoryPrompt(true);
              }
            }}
          >
            詳細で版の履歴を見る
          </Link>
        </p>
      )}
      {historyPrompt && historyNoteId && (
        <fieldset
          className="hollow-message"
          aria-label="履歴へ移動する前の変更確認"
        >
          <p>
            履歴を開く前に、未保存の内容を保存するか破棄してください。履歴の選択だけで編集中の内容が置き換わることはありません。
          </p>
          <div className="hollow-actions">
            <button
              type="button"
              className="hollow-button"
              disabled={pending || media.items.length > 0}
              onClick={() => {
                setHistoryPrompt(false);
                save(true, "manual", true);
              }}
            >
              保存して履歴を見る
            </button>
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => {
                if (composing.current || visualState.current.composing) {
                  setError("文字変換を確定してから履歴を開いてください。");
                  return;
                }
                if (!discard(false)) return;
                cancelModeRequest();
                setHistoryPrompt(false);
                void router
                  .navigate({
                    to: "/notes/$noteId",
                    params: { noteId: historyNoteId },
                    hash: "note-history",
                  })
                  .catch((cause) => setError(displayError(cause)));
              }}
            >
              破棄して履歴を見る
            </button>
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => setHistoryPrompt(false)}
            >
              取消
            </button>
          </div>
        </fieldset>
      )}
      {recovery && (
        <div className="hollow-message" role="status">
          <p>このブラウザに未保存の内容があります。復元しますか？</p>
          <div className="hollow-actions">
            <button
              type="button"
              className="hollow-button"
              disabled={checkingRecovery}
              onClick={() => {
                cancelModeRequest();
                if (recoveryNoteId) {
                  leaving.current = true;
                  void router
                    .navigate({
                      to: "/notes/$noteId/edit",
                      params: { noteId: recoveryNoteId },
                      search: { mode },
                    })
                    .catch((cause) => {
                      leaving.current = false;
                      setError(displayError(cause));
                    });
                  return;
                }
                const restoring = recovery;
                const noteId = persisted.current?.id;
                if (restoring.wys && noteId) {
                  const request = modeRequests.begin(currentMode.current);
                  startRecoveryCheck(async () => {
                    try {
                      const context = await getWysContextFn({
                        data: { id: noteId },
                      });
                      const list = restoring.wys?.origin
                        ? await listRevisionsFn({ data: { noteId } })
                        : { items: [] };
                      if (!modeRequests.owns(request) || !restoring.wys) return;
                      const confirmed = confirmWysRecoveryOrigin(
                        restoring.wys,
                        noteId,
                        context.origin,
                        list.items,
                      );
                      setWysOriginAvailable(confirmed.available);
                      setWysSavedOrigin(context.origin);
                      updateDraft({ ...restoring, wys: confirmed.recovery });
                      setRecovery(null);
                    } catch (failure) {
                      if (modeRequests.owns(request))
                        setError(
                          `退避の元版を確認できません。退避本文は保持しています。${displayError(failure)}`,
                        );
                    }
                  });
                } else {
                  updateDraft(
                    restoring.wys
                      ? {
                          ...restoring,
                          wys: {
                            ...restoring.wys,
                            originSaved: false,
                            ...(restoring.wys.origin
                              ? { invalidOrigin: true as const }
                              : {}),
                          },
                        }
                      : restoring,
                  );
                  setRecovery(null);
                }
              }}
            >
              {checkingRecovery
                ? "退避の元版を確認中…"
                : recoveryNoteId
                  ? "作成済みノートを開いて復元する"
                  : "復元する"}
            </button>
            <button
              type="button"
              className="hollow-button"
              onClick={() => {
                cancelModeRequest();
                setRecovery(null);
                try {
                  localStorage.removeItem(key);
                } catch {
                  setStorageError("退避データを消去できませんでした。");
                }
              }}
            >
              退避内容を破棄
            </button>
          </div>
        </div>
      )}
      {storageError && (
        <p className="hollow-message" role="alert">
          {storageError}
        </p>
      )}
      {externalUpdate && (
        <p className="hollow-message" role="status">
          別の画面または自動処理でこのノートが更新されました。この画面の内容は変更していません。同じ利用者の変更は後の保存が優先されます。
          <button
            type="button"
            className="hollow-button"
            onClick={() => setExternalUpdate(false)}
          >
            閉じる
          </button>
        </p>
      )}
      {updateCheckError && (
        <p role="status" className="hollow-help">
          {updateCheckError}
        </p>
      )}
      <label htmlFor="note-title" className="hollow-label">
        タイトル
      </label>
      <input
        id="note-title"
        className="hollow-title-input"
        value={draft.title}
        maxLength={200}
        placeholder="無題"
        onChange={(event) => {
          updateDraft({ ...current.current, title: event.target.value });
          setError("");
        }}
        disabled={Boolean(recovery) || navigating}
      />
      <fieldset className="hollow-editor-tabs" aria-label="編集モード">
        <button
          type="button"
          aria-pressed={mode === "wysiwyg"}
          disabled={navigating}
          onClick={() => {
            requestMode("wysiwyg");
          }}
        >
          WYSIWYG
        </button>
        <button
          type="button"
          aria-pressed={mode === "html"}
          disabled={navigating}
          onClick={() => requestMode("html")}
        >
          HTML
        </button>
        <button
          type="button"
          aria-pressed={mode === "visual"}
          disabled={navigating}
          onClick={() => requestMode("visual")}
        >
          ビジュアル
        </button>
      </fieldset>
      {modeNotice && (
        <p role="status" className="hollow-message">
          {modeNotice}
        </p>
      )}
      <details id="editor-settings" className="hollow-message">
        <summary>編集設定</summary>
        <p>
          編集モードの既定と警告の非表示は、この利用者・この端末だけに適用します。
        </p>
        <button
          type="button"
          className="hollow-button"
          onClick={() => {
            try {
              localStorage.removeItem(wysWarningKey(userId));
              setModeNotice("WYSIWYG切替の警告を再表示する設定に戻しました。");
            } catch {
              setStorageError(
                "設定を記録できません。警告は安全側で表示します。",
              );
            }
          }}
        >
          WYSIWYGの警告を再表示する
        </button>
      </details>
      {wysPrompt && (
        <fieldset className="hollow-message" aria-label="WYSIWYGへの変換確認">
          <legend>WYSIWYGで編集を開始しますか？</legend>
          {wysPrompt.htmlOriginal && (
            <p>HTMLファイルから取り込んだノートです。</p>
          )}
          <p>
            HTMLの装飾や構造は編集時に正規化される場合があります。保持内容はHTMLで編集できます。確認だけでは本文を保存・変換しません。
          </p>
          <p>
            表現上の注意 {wysPrompt.plan.lossCount} 件・編集せず保持する内容など{" "}
            {wysPrompt.plan.noticeCount} 件
          </p>
          <ul>
            {[
              ...new Set(
                [...wysPrompt.plan.losses, ...wysPrompt.plan.notices].map(
                  (item) => item.reason,
                ),
              ),
            ].map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <details>
            <summary>安全な本文プレビュー</summary>
            <NoteContent
              html={wysPrompt.value.html}
              noteId={persisted.current?.id}
              draftId={wysPrompt.value.draftId}
              displayStyle={note?.display.style}
            />
          </details>
          <label className="hollow-check">
            <input
              type="checkbox"
              checked={wysRemember}
              onChange={(event) => setWysRemember(event.target.checked)}
            />
            この利用者・端末で次回から警告を表示しない
          </label>
          <button
            type="button"
            className="hollow-button"
            onClick={() => acceptWys(wysPrompt, wysRemember)}
          >
            確認してWYSIWYGで編集
          </button>
          <button
            type="button"
            className="hollow-button"
            onClick={() => {
              const initial = wysPrompt.initial;
              cancelModeRequest();
              if (initial) {
                setMode("html");
                currentMode.current = "html";
              }
            }}
          >
            変換を取消
          </button>
        </fieldset>
      )}
      {restoreTarget && historyNoteId && (
        <p className="hollow-message">
          変換前の版 {restoreTarget.revisionNo}
          {restoreTarget.pending ? "（今回の未保存変換）" : ""}
          （通常の直近20版の範囲内）
          {!restoreTarget.available ? (
            " は保持範囲外です。最新本文は編集・回収できます。"
          ) : (
            <Link
              to="/notes/$noteId"
              params={{ noteId: historyNoteId }}
              hash={`note-history-${restoreTarget.revisionNo}`}
              onClick={(event) => {
                cancelModeRequest();
                if (
                  pending ||
                  composing.current ||
                  media.hasUnresolved() ||
                  dirty
                ) {
                  event.preventDefault();
                  setHistoryPrompt(true);
                }
              }}
            >
              変換前を確認・元に戻す
            </Link>
          )}
        </p>
      )}
      {(draft.wys?.invalidOrigin || wysReprepare !== undefined) && (
        <div className="hollow-message" role="status">
          <p>
            {draft.wys?.invalidOrigin
              ? "変換前の版を確認できません。最新本文は保持しています。HTMLで回復して保存できます。"
              : "保存結果または挿入メディアで本文が更新されました。最新本文を反映すると、この画面の取り消し履歴を新しく開始します。"}
          </p>
          {wysReprepare !== undefined && (
            <button
              type="button"
              className="hollow-button"
              disabled={composing.current}
              onClick={() => {
                const request = modeRequests.begin("wysiwyg");
                void prepareWys(request, true);
              }}
            >
              最新本文をWYSIWYGへ反映
            </button>
          )}
          <button
            type="button"
            className="hollow-button"
            disabled={pending || composing.current || media.hasUnresolved()}
            onClick={() => {
              if (
                inFlight.current ||
                composing.current ||
                media.hasUnresolved()
              )
                return;
              cancelModeRequest();
              updateDraft({ ...current.current, wys: undefined });
              setMode("html");
              currentMode.current = "html";
              setWysPlan(undefined);
              setWysReprepare(undefined);
            }}
          >
            最新本文をHTMLで回復
          </button>
        </div>
      )}
      {modePrompt && (
        <fieldset className="hollow-message" aria-label="編集モードの切替確認">
          <legend>未保存の内容を保存して切り替えますか？</legend>
          <p>
            保存・安全な補正結果を確認できた後に切り替えます。取消・失敗時は現在のモードと入力を保持します。
          </p>
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={() => save(false, "manual", false, undefined, modePrompt)}
          >
            保存して切替
          </button>
          <button
            type="button"
            className="hollow-button"
            disabled={pending}
            onClick={cancelModeRequest}
          >
            切替を取消
          </button>
        </fieldset>
      )}
      <label className="hollow-check">
        <input
          type="checkbox"
          checked={draft.importReferences ?? true}
          disabled={Boolean(recovery) || pending || !referenceSettingsLoaded}
          onChange={(event) => {
            const next = {
              ...current.current,
              importReferences: event.target.checked,
            };
            current.current = next;
            setDraft(next);
            setError("");
            if (!persisted.current && sameBody(next, blank)) setSaved(next);
          }}
        />
        参照画像・動画・CSSを取り込む（新規は既定オン）
      </label>
      {!referenceSettingsLoaded && (
        <p className="hollow-help">
          既存の参照設定を確認しています。確認できるまでは保存時も現在の設定を維持します。
        </p>
      )}
      <p className="hollow-help">
        オフでも参照候補を保持します。取得済みのリソースは消えません。data URI
        は設定にかかわらず安全性を検査します。
      </p>
      <div className="hollow-message" hidden={mode === "visual"}>
        <label className="hollow-label" htmlFor="media-alt">
          挿入する画像・動画の説明（alt）
        </label>
        <input
          id="media-alt"
          className="hollow-input"
          value={mediaAlt}
          maxLength={1000}
          onChange={(event) => setMediaAlt(event.target.value)}
          disabled={Boolean(recovery)}
        />
        <input
          ref={mediaInput}
          type="file"
          hidden
          multiple
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm"
          onChange={(event) => {
            if (!inFlight.current && !recovery)
              media.add([...(event.currentTarget.files ?? [])], mediaAlt);
            else
              setError(
                "保存が終わってから、ファイルをもう一度選択してください。",
              );
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          className="hollow-button"
          disabled={Boolean(recovery) || pending}
          onClick={() => mediaInput.current?.click()}
        >
          画像・動画を挿入
        </button>
        <p className="hollow-muted">
          本文へファイルをドロップしても挿入できます。画像 20 MiB / 動画 200
          MiB。完了したファイルは本文の末尾へ追加します。
        </p>
        {media.items.map((item) => (
          <div key={item.id} role="status">
            <p>
              {item.file.name} —{" "}
              {item.status === "uploading"
                ? `${item.progress}%（保存は完了後）`
                : `挿入失敗: ${item.error}`}
            </p>
            {item.status === "uploading" && (
              <progress
                max={100}
                value={item.progress}
                aria-label={`${item.file.name} のアップロード進捗`}
              />
            )}
            {item.status === "failed" && (
              <button
                type="button"
                className="hollow-button"
                onClick={() => media.retry(item.id)}
              >
                再試行
              </button>
            )}
            <button
              type="button"
              className="hollow-button"
              onClick={() => media.remove(item.id)}
            >
              除去
            </button>
          </div>
        ))}
      </div>
      {mode === "html" ? (
        <div>
          <HtmlSourceEditor
            key={note?.id ?? "new"}
            value={draft.html}
            selection={sourceSelection}
            disabled={Boolean(recovery) || navigating}
            onFiles={(files) => {
              if (!recovery && !pending) media.add(files, mediaAlt);
            }}
            onCompositionChange={(active) => {
              composing.current = active;
              setAnalysisVersion((value) => value + 1);
            }}
            onChange={(html) => {
              updateDraft({
                ...current.current,
                html,
                wys: wysAfterSourceEdit(
                  current.current.html,
                  html,
                  current.current.wys,
                ),
              });
              setError("");
            }}
          />
          <HtmlDiagnostics
            html={draft.html}
            noteId={persisted.current?.id}
            draftId={draft.draftId}
            displayStyle={note?.display.style}
            onSelect={(offset) =>
              setSourceSelection((previous) => ({
                offset,
                sequence: (previous?.sequence ?? 0) + 1,
              }))
            }
            onReady={(html, ready) => {
              if (
                analysis.current.html !== html ||
                analysis.current.ready !== ready
              ) {
                analysis.current = { html, ready };
                setAnalysisVersion((value) => value + 1);
              }
            }}
          />
        </div>
      ) : mode === "visual" ? (
        !ready || recovery ? (
          <p role="status">退避内容の確認後にビジュアル編集を開始します。</p>
        ) : (
          <VisualEditor
            html={draft.html}
            noteId={persisted.current?.id}
            draftId={draft.draftId}
            displayStyle={note?.display.style}
            onUnavailable={(message) => {
              cancelModeRequest();
              setMode("html");
              currentMode.current = "html";
              setModeNotice(message);
              visualState.current = {
                busy: false,
                composing: false,
                error: false,
              };
            }}
            disabled={Boolean(recovery) || navigating}
            onChange={(html) => {
              updateDraft({
                ...current.current,
                html,
                wys: wysAfterSourceEdit(
                  current.current.html,
                  html,
                  current.current.wys,
                ),
              });
              setError("");
            }}
            onState={(state) => {
              if (
                JSON.stringify(state) !== JSON.stringify(visualState.current)
              ) {
                visualState.current = state;
                setAnalysisVersion((value) => value + 1);
              }
            }}
          />
        )
      ) : !ready || recovery || !wysPlan ? (
        <div role="status">
          {wysDiscard?.kind === "preparing" ? (
            <p>
              未保存の変更を破棄しました。保存済み本文の編集画面を準備しています…
            </p>
          ) : wysDiscard?.kind === "failed" ? (
            <>
              <p>
                {wysDiscard.reason}{" "}
                本文は保持しています。退避JSONの保存やHTML編集も利用できます。
              </p>
              <button
                type="button"
                className="hollow-button"
                onClick={() => void resetDiscardedWys(current.current)}
                disabled={pending || composing.current || media.hasUnresolved()}
              >
                編集画面の準備を再試行
              </button>
            </>
          ) : (
            <p>
              {wysPreparing
                ? "WYSIWYGの準備中…"
                : "内容・変換確認後にWYSIWYG編集を開始します。"}
            </p>
          )}
        </div>
      ) : (
        <WysEditor
          plan={wysPlan}
          html={draft.html}
          acknowledgement={wysAcknowledgement}
          disabled={Boolean(recovery) || navigating}
          scope={{ noteId: persisted.current?.id, draftId: draft.draftId }}
          displayStyle={note?.display.style}
          onNotice={setModeNotice}
          onReprepare={setWysReprepare}
          registerMediaInsertion={(handler) => {
            wysInsertMedia.current = handler;
          }}
          onRecover={(html) => {
            try {
              writeEditorBackup(
                localStorage,
                userId,
                note?.id,
                persisted.current?.id,
                { ...current.current, html },
                true,
                "wysiwyg",
              );
              return true;
            } catch {
              setStorageError(
                "最新本文の退避に失敗したため取り消し履歴を保持しました。退避JSONを保存してください。",
              );
              return false;
            }
          }}
          onCompositionChange={(active) => {
            composing.current = active;
            setAnalysisVersion((value) => value + 1);
          }}
          onFiles={(files) => {
            if (!recovery && !pending) media.add(files, mediaAlt);
          }}
          onChange={(html) => {
            updateDraft({
              ...current.current,
              html,
              wys: current.current.wys
                ? {
                    ...current.current.wys,
                    converted:
                      wysBaselineConverted ||
                      current.current.wys.originSaved ||
                      html !== wysPlan.source,
                  }
                : {
                    version: 1,
                    converted: html !== wysPlan.source,
                    originSaved: false,
                    origin: null,
                  },
            });
            setError("");
          }}
        />
      )}
      {conflict && historyNoteId && (
        <fieldset className="hollow-message" aria-label="競合した保存の確認">
          <legend>最新の内容を確認してください</legend>
          <p>
            保存の基準以降に別の利用者の変更があるか、基準を確認できません。この画面の入力は保持しています。確認した状態（更新番号{" "}
            {conflict.version}
            ）に対して一度だけ上書きを許可します。さらに変更されていれば、再確認が必要です。
          </p>
          <Link
            to="/notes/$noteId"
            params={{ noteId: historyNoteId }}
            target="_blank"
            rel="noopener noreferrer"
          >
            最新の内容を別タブで開く
          </Link>
          <div className="hollow-actions">
            <button
              type="button"
              className="hollow-button hollow-primary"
              disabled={pending || media.items.length > 0}
              onClick={() =>
                save(
                  conflict.finish,
                  conflict.cause,
                  conflict.history,
                  conflict.version,
                  conflict.targetMode && modeRequests.owns(conflict.targetMode)
                    ? conflict.targetMode
                    : undefined,
                )
              }
            >
              確認して上書き保存
            </button>
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => {
                if (!discard(false)) return;
                cancelModeRequest();
                void router
                  .navigate({
                    to: "/notes/$noteId",
                    params: { noteId: historyNoteId },
                  })
                  .catch((failure) => setError(displayError(failure)));
              }}
            >
              入力を破棄して最新の内容を開く
            </button>
            <button
              type="button"
              className="hollow-button"
              disabled={pending}
              onClick={() => {
                cancelModeRequest();
                setConflict(null);
              }}
            >
              取消・入力を保持
            </button>
          </div>
        </fieldset>
      )}
      {error && (
        <div className="hollow-message" role="alert">
          <p>{error}</p>
          <button
            className="hollow-button"
            type="button"
            onClick={() => save()}
            disabled={pending}
          >
            再試行
          </button>
        </div>
      )}
      {removed.length > 0 && (
        <div className="hollow-message" role="status">
          <p>安全のため、次の内容を除去して保存しました。</p>
          <ul>
            {[...new Set(removed)].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            type="button"
            className="hollow-button"
            onClick={() => setRemoved([])}
          >
            除去内容を確認して閉じる
          </button>
        </div>
      )}
      <p className="hollow-help">
        退避 JSON には、この画面の HTML
        とタイトルを保存します。未保存内容の回収用で、通常の HTML
        書き出しとは異なります。
      </p>
      <div className="hollow-editor-footer">
        <div className="hollow-actions">
          <button
            type="button"
            className="hollow-button"
            disabled={(!dirty && media.items.length === 0) || pending}
            onClick={() => discard()}
          >
            破棄
          </button>
          <button type="button" className="hollow-button" onClick={download}>
            退避 JSON を保存
          </button>
        </div>
        <div className="hollow-actions">
          <button
            type="button"
            className="hollow-button"
            disabled={
              pending || media.items.length > 0 || !dirty || Boolean(recovery)
            }
            onClick={() => save()}
          >
            保存
          </button>
          <button
            type="button"
            className="hollow-button hollow-primary"
            disabled={pending || media.items.length > 0 || Boolean(recovery)}
            onClick={() => save(true)}
          >
            完了
          </button>
        </div>
      </div>
    </section>
  );
}
