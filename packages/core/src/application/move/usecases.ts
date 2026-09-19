import { BusinessRuleError } from "@repo/core/domain/error";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { capacityLimit } from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { requireNote, requireScope } from "../workspace/access";
import type { MoveExpected, MovePreview } from "./ports";

export const sameMoveScope = (a: NoteOwner, b: NoteOwner) =>
  a.kind === "personal"
    ? b.kind === "personal" && a.accountId === b.accountId
    : b.kind === "workspace" && a.workspaceId === b.workspaceId;
const changed = () =>
  new BusinessRuleError(
    "MOVE_CHANGED",
    "移動条件が変わりました。最新の影響を確認し直してください。",
  );
export async function authorizeMove(
  c: HollowUnitOfWorkContext,
  accountId: string,
  noteId: string,
  destination?: NoteOwner,
) {
  const note = await requireNote(
    c,
    await c.notes.findById(noteId),
    accountId,
    "edit",
  );
  if (destination) {
    await requireScope(c, destination, accountId, "edit");
    if (sameMoveScope(note.owner, destination)) throw changed();
  }
  if (await c.moves.hasConversion(noteId))
    throw new BusinessRuleError(
      "MOVE_CONVERSION_ACTIVE",
      "変換・再生成処理中のノートは移動できません。処理終了後に再試行してください。",
    );
  return note;
}
export function equalMoveExpected(a: MoveExpected, b: MoveExpected) {
  return JSON.stringify(a) === JSON.stringify(b);
}
export async function movePreviewInTransaction(
  c: HollowUnitOfWorkContext,
  expected: MoveExpected,
  now: Date,
): Promise<MovePreview> {
  const sourceUsed = await c.capacity.usedBytes(expected.source.owner, now);
  const destinationUsed = await c.capacity.usedBytes(
    expected.destination.owner,
    now,
  );
  return {
    expected,
    sourceCapacity: {
      used: sourceUsed,
      limit: capacityLimit(expected.source.owner),
      after: sourceUsed - expected.sourceRelease,
    },
    destinationCapacity: {
      used: destinationUsed,
      limit: capacityLimit(expected.destination.owner),
      after: destinationUsed + expected.destinationIncrease,
    },
    gained: await c.moves.audience(expected, "gained", undefined),
    lost: await c.moves.audience(expected, "lost", undefined),
    interrupted: await c.moves.interruptions(expected.noteId),
  };
}
export async function listMoveDestinations(
  container: HollowContainer,
  token: string | null,
  input: { noteId: string; after?: string | undefined },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    const note = await authorizeMove(c, account.id, input.noteId);
    return c.moves.destinations(account.id, note.owner, input.after);
  });
}
export async function previewNoteMove(
  container: HollowContainer,
  token: string | null,
  input: { noteId: string; destination: NoteOwner },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await authorizeMove(c, account.id, input.noteId, input.destination);
    const now = container.clock.now();
    return movePreviewInTransaction(
      c,
      await c.moves.inspect(input.noteId, input.destination, now),
      now,
    );
  });
}
export async function readMoveAudience(
  container: HollowContainer,
  token: string | null,
  input: {
    expected: MoveExpected;
    direction: "gained" | "lost";
    after?: string | undefined;
  },
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    await authorizeMove(
      c,
      account.id,
      input.expected.noteId,
      input.expected.destination.owner,
    );
    const current = await c.moves.inspect(
      input.expected.noteId,
      input.expected.destination.owner,
      container.clock.now(),
    );
    if (!equalMoveExpected(current, input.expected)) throw changed();
    return c.moves.audience(current, input.direction, input.after);
  });
}
export async function moveNote(
  container: HollowContainer,
  token: string | null,
  expected: MoveExpected,
) {
  return container.unitOfWorkProvider.run(async (c) => {
    const account = await requireAccount(container, c.accounts, token);
    return moveNoteInTransaction(
      c,
      account.id,
      expected,
      container.clock.now(),
    );
  });
}
export async function moveNoteInTransaction(
  c: HollowUnitOfWorkContext,
  accountId: string,
  expected: MoveExpected,
  now: Date,
) {
  await authorizeMove(
    c,
    accountId,
    expected.noteId,
    expected.destination.owner,
  );
  const current = await c.moves.inspect(
    expected.noteId,
    expected.destination.owner,
    now,
  );
  if (!equalMoveExpected(current, expected)) throw changed();
  if (
    current.version === Number.MAX_SAFE_INTEGER ||
    current.ownershipGeneration === Number.MAX_SAFE_INTEGER
  )
    throw changed();
  const result = await movePreviewInTransaction(c, current, now);
  if (result.destinationCapacity.after > result.destinationCapacity.limit)
    throw new BusinessRuleError(
      "MOVE_QUOTA",
      "移動先の保存容量上限を超えるため移動できません。容量を確認して再試行してください。",
    );
  await c.moves.apply(current, now);
  return {
    noteId: current.noteId,
    owner: current.destination.owner,
    version: current.version + 1,
  };
}
