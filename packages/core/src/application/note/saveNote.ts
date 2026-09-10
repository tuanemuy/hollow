import { BusinessRuleError } from "@repo/core/domain/error";
import { interruptDisplay } from "@repo/core/domain/note/displayStyle";
import {
  assertHtmlSize,
  createNote,
  editNote,
} from "@repo/core/domain/note/entity";
import {
  conflictingHumanVersion,
  sameNoteContent,
  type WysOriginHint,
} from "@repo/core/domain/note/revision";
import { selectedScope } from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import { saveAssetReferences } from "../asset/references";
import type { HollowContainer } from "../di/hollowTypes";
import { ConflictError } from "../errors";
import { inspectDependencies, isDependency } from "../reference/dependencies";
import { reuseReferences } from "../reference/reuse";
import { scheduleReferences } from "../reference/schedule";
import { requireNote, requireScope, scopeView } from "../workspace/access";
import { commitNote, ensureRevisionHead } from "./commitNote";
import { toNoteView } from "./view";
import { readWysContext } from "./wysContext";

export type SaveNoteInput = Readonly<{
  workspaceId?: string;
  title: string;
  html: string;
  id?: string;
  version?: number;
  draftId?: string;
  importReferences?: boolean;
  cause?: "manual" | "autosave" | "title";
  confirmedVersion?: number;
  wysOrigin?: WysOriginHint;
}>;

export async function saveNote(
  container: HollowContainer,
  sessionToken: string | null,
  input: SaveNoteInput,
) {
  assertHtmlSize(input.html);
  const document = container.referencing?.processor.prepare(input.html);
  const sanitized = container.htmlSanitizer.sanitize(
    document?.html ?? input.html,
  );
  if (document?.candidates.some(isDependency))
    await container.unitOfWorkProvider.run(async (context) => {
      const account = await requireAccount(
        container,
        context.accounts,
        sessionToken,
      );
      if (input.id)
        await requireNote(
          context,
          await context.notes.findById(input.id),
          account.id,
          "edit",
        );
      else
        await requireScope(
          context,
          selectedScope(account.id, input),
          account.id,
          "edit",
        );
    });
  const inspections = document
    ? await inspectDependencies(container, document)
    : new Map<string, string>();
  const result = await container.unitOfWorkProvider.run(async (context) => {
    const { accounts, notes, imports } = context;
    const account = await requireAccount(container, accounts, sessionToken);
    const now = container.clock.now();
    if (input.id) {
      const previous = await requireNote(
        context,
        await notes.findById(input.id),
        account.id,
        "edit",
      );
      const original = await imports.findByNote(input.id);
      if (original?.state === "processing")
        throw new BusinessRuleError(
          "NOTE_PROCESSING",
          "変換中は編集できません。処理の完了をお待ちください。",
        );
      const head = await ensureRevisionHead(context, previous);
      if (
        (input.confirmedVersion !== undefined &&
          input.confirmedVersion !== previous.version) ||
        (input.version !== undefined &&
          (input.version > previous.version ||
            conflictingHumanVersion(head, account.id, input.version) !==
              null) &&
          input.confirmedVersion !== previous.version)
      )
        throw new ConflictError(
          "NOTE_CONFLICT",
          "別の利用者が更新しました。最新の内容を確認してから上書きするか、変更を破棄してください。",
        );
      const reused = await reuseReferences(
        container,
        context,
        previous,
        sanitized.html,
      );
      const refs = await saveAssetReferences(
        container,
        context,
        account.id,
        reused.html,
        previous.id,
        input.draftId,
      );
      const candidate = editNote(previous, input.title, refs.html, now);
      const note = sameNoteContent(previous, candidate)
        ? previous
        : { ...candidate, display: interruptDisplay(previous.display) };
      if (original) await imports.saveOriginal({ ...original, state: "ready" });
      const settings = await context.references.settings(note.id);
      await commitNote(container, context, {
        previous,
        note,
        draftId: input.draftId,
        actor: { kind: "user", accountId: account.id },
        cause: input.cause ?? "manual",
        ...(input.wysOrigin ? { wysOrigin: input.wysOrigin } : {}),
        afterCurrent: async (_current, changed) => {
          if (
            document &&
            (changed ||
              (input.importReferences !== undefined &&
                input.importReferences !== (settings?.enabled ?? true)))
          )
            await scheduleReferences(
              container,
              context,
              note,
              account.id,
              {
                ...document,
                html: refs.html,
                notices: [...document.notices, ...reused.notices],
              },
              input.importReferences,
              null,
              inspections,
            );
        },
      });
      return {
        note: {
          ...toNoteView(note),
          scope: await scopeView(context, note.owner, account.id),
        },
        wysContext: await readWysContext(context, note),
        removed: [
          ...new Set([
            ...sanitized.removed,
            ...(document?.notices ?? []).map((n) => n.message),
            ...reused.notices.map((n) => n.message),
          ]),
        ],
      };
    }
    if (input.wysOrigin)
      throw new BusinessRuleError(
        "WYS_ORIGIN_UNAVAILABLE",
        "新規ノートには変換前の版を指定できません。未保存HTMLを保持して編集を続けてください。",
      );
    if (
      !input.title.trim() &&
      !sanitized.text.trim() &&
      !/<(?:img|video|audio|hr)\b/.test(sanitized.html)
    )
      throw new BusinessRuleError(
        "EMPTY_DRAFT",
        "タイトルまたは本文を入力してください。",
      );
    const noteId = container.idGenerator.next();
    const owner = await requireScope(
      context,
      selectedScope(account.id, input),
      account.id,
      "edit",
    );
    if (input.draftId) {
      const draft = await context.assets.findDraft(input.draftId);
      if ((draft?.workspaceId ?? null) !== (input.workspaceId ?? null))
        throw new BusinessRuleError(
          "DRAFT_SCOPE",
          "下書きの保存先が変わりました。元のスペースで保存してください。",
        );
    }
    const refs = await saveAssetReferences(
      container,
      context,
      account.id,
      sanitized.html,
      noteId,
      input.draftId,
    );
    const note = createNote(
      {
        id: noteId,
        accountId: account.id,
        owner,
        title: input.title,
        html: refs.html,
        text: sanitized.text,
      },
      now,
    );
    await commitNote(container, context, {
      previous: null,
      note,
      draftId: input.draftId,
      actor: { kind: "user", accountId: account.id },
      cause: input.cause ?? "manual",
      afterCurrent: async () => {
        if (document)
          await scheduleReferences(
            container,
            context,
            note,
            account.id,
            { ...document, html: refs.html },
            input.importReferences,
            null,
            inspections,
          );
      },
    });
    return {
      note: {
        ...toNoteView(note),
        scope: await scopeView(context, note.owner, account.id),
      },
      wysContext: await readWysContext(context, note),
      removed: [
        ...new Set([
          ...sanitized.removed,
          ...(document?.notices ?? []).map((n) => n.message),
        ]),
      ],
    };
  });
  container.referencing?.wake();
  return result;
}
