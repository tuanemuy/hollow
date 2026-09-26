import type { Note } from "@repo/core/domain/note/entity";
import type {
  PdfAnonymousAuthority,
  PdfAnonymousRequest,
} from "@repo/core/domain/pdf/anonymous";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import { buildPdfSnapshot, pdfNotFound } from "./snapshot";

export type PdfAnonymousAccess =
  | Readonly<{
      kind: "public";
      publicId: string;
      urlGeneration: number;
      browser: string;
    }>
  | Readonly<{ kind: "link"; token: string; browser: string }>;

export async function currentPdfAnonymousNote(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  targetNoteId: string,
  browserHash: string,
  authority: PdfAnonymousAuthority,
): Promise<Note> {
  const note = await u.notes.findById(targetNoteId);
  const sharing = await u.sharing.find(targetNoteId);
  if (
    !note ||
    note.lifecycle.kind !== "active" ||
    !sharing ||
    !(await u.sharing.scope(targetNoteId))
  )
    return pdfNotFound();
  if (authority.kind === "public") {
    const identity = await u.publicNotes.find(targetNoteId);
    if (
      sharing.visibility !== "public" ||
      identity?.publicId !== authority.publicId ||
      identity.urlGeneration !== authority.urlGeneration ||
      identity.accessEpoch !== authority.accessEpoch
    )
      return pdfNotFound();
  } else {
    if (
      sharing.visibility === "private" ||
      sharing.tokenHash !== authority.tokenHash ||
      sharing.linkGeneration !== authority.linkGeneration ||
      sharing.grantEpoch !== authority.grantEpoch
    )
      return pdfNotFound();
    if (authority.proof.kind === "none") {
      if (sharing.passwordHash !== null) return pdfNotFound();
    } else {
      const grant = await u.sharing.findGrant(targetNoteId, browserHash);
      if (
        !sharing.passwordHash ||
        authority.proof.expiresAt <= c.clock.now() ||
        !grant ||
        grant.expiresAt <= c.clock.now() ||
        grant.linkGeneration !== authority.linkGeneration ||
        grant.grantEpoch !== authority.grantEpoch
      )
        return pdfNotFound();
    }
  }
  return note;
}

export async function initialPdfAnonymousSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  access: PdfAnonymousAccess,
) {
  const browserHash = c.tokens.hash(access.browser);
  let noteId: string;
  let authority: PdfAnonymousAuthority;
  if (access.kind === "public") {
    const identity = await u.publicNotes.resolve(
      access.publicId,
      access.urlGeneration,
    );
    if (!identity) return pdfNotFound();
    noteId = identity.noteId;
    authority = {
      kind: "public",
      publicId: identity.publicId,
      urlGeneration: identity.urlGeneration,
      accessEpoch: identity.accessEpoch,
    };
  } else {
    const tokenHash = c.tokens.hash(access.token);
    const sharing = await u.sharing.findByTokenHash(tokenHash);
    if (!sharing) return pdfNotFound();
    noteId = sharing.noteId;
    const grant = sharing.passwordHash
      ? await u.sharing.findGrant(noteId, browserHash)
      : null;
    if (sharing.passwordHash && !grant) return pdfNotFound();
    authority = {
      kind: "link",
      tokenHash,
      linkGeneration: sharing.linkGeneration,
      grantEpoch: sharing.grantEpoch,
      proof: grant
        ? {
            kind: "grant",
            verifiedAt: grant.verifiedAt,
            expiresAt: grant.expiresAt,
          }
        : { kind: "none" },
    };
  }
  const note = await currentPdfAnonymousNote(
    c,
    u,
    noteId,
    browserHash,
    authority,
  );
  return {
    snapshot: await buildPdfSnapshot(c, u, note),
    authority,
    browserHash,
  };
}

export async function readPdfAnonymousSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: PdfAnonymousRequest,
) {
  const note = await currentPdfAnonymousNote(
    c,
    u,
    request.targetNoteId,
    request.browserHash,
    request.authority,
  );
  return buildPdfSnapshot(c, u, note);
}
