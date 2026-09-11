import type {
  BrowseIndexRepository,
  NoteProjection,
} from "@repo/core/application/browse/ports";
import {
  BROWSE_VERSION,
  TAG_NORMALIZATION_VERSION,
} from "@repo/core/domain/browse/query";
import type { NoteOwner } from "@repo/core/domain/note/entity";
import { and, asc, eq, gt, ne, or, sql } from "drizzle-orm";
import { noteProjections, noteTags, tags } from "../browseSchema";
import { notes } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

export class LibsqlBrowseIndexRepository implements BrowseIndexRepository {
  constructor(private readonly db: HollowTransaction) {}
  async tagsForNote(noteId: string, scope: NoteOwner) {
    return this.db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .innerJoin(noteTags, eq(noteTags.tagId, tags.id))
      .innerJoin(notes, eq(notes.id, noteTags.noteId))
      .where(
        and(
          eq(notes.id, noteId),
          eq(notes.lifecycle, "active"),
          eq(tags.meaningVersion, TAG_NORMALIZATION_VERSION),
          eq(
            tags.scopeKey,
            scope.kind === "personal"
              ? `p:${scope.accountId}`
              : `w:${scope.workspaceId}`,
          ),
          scope.kind === "personal"
            ? and(
                sql`${notes.ownerWorkspaceId} is null`,
                eq(notes.ownerAccountId, scope.accountId),
              )
            : eq(notes.ownerWorkspaceId, scope.workspaceId),
        ),
      )
      .orderBy(asc(tags.normalizedKey), asc(tags.id))
      .limit(50);
  }
  async save(noteId: string, noteVersion: number, p: NoteProjection) {
    const fields = {
      noteId,
      noteVersion,
      meaningVersion: p.version,
      titleText: p.title.display,
      titleKey: p.title.normalized,
      titleWords: ` ${(p.title.normalized.match(/[a-z0-9]+/g) ?? []).join(" ")} `,
      titleSegments: p.title.segments,
      bodyText: p.body.display,
      bodyKey: p.body.normalized,
      bodyWords: ` ${(p.body.normalized.match(/[a-z0-9]+/g) ?? []).join(" ")} `,
      bodySegments: { ranges: p.body.segments, words: p.body.words },
      tokens: p.tokens,
      leadImage: p.leadImage,
      mediaLabel: p.mediaLabel,
    };
    await this.db
      .insert(noteProjections)
      .values(fields)
      .onConflictDoUpdate({ target: noteProjections.noteId, set: fields });
  }
  async sourceMatches(noteId: string, title: string, html: string) {
    const rows = await this.db
      .select({ id: notes.id })
      .from(notes)
      .innerJoin(noteProjections, eq(noteProjections.noteId, notes.id))
      .where(
        and(
          eq(notes.id, noteId),
          eq(notes.title, title),
          eq(notes.html, html),
          eq(noteProjections.noteVersion, notes.version),
          eq(noteProjections.meaningVersion, BROWSE_VERSION),
        ),
      );
    return rows.length === 1;
  }
  async remove(noteId: string) {
    await this.db
      .delete(noteProjections)
      .where(eq(noteProjections.noteId, noteId));
  }
  async pending(limit: number, after?: string) {
    return this.db
      .select({
        id: notes.id,
        version: notes.version,
        title: notes.title,
        html: notes.html,
      })
      .from(notes)
      .leftJoin(noteProjections, eq(noteProjections.noteId, notes.id))
      .where(
        and(
          after ? gt(notes.id, after) : undefined,
          or(
            sql`${noteProjections.id} is null`,
            ne(noteProjections.meaningVersion, BROWSE_VERSION),
            ne(noteProjections.noteVersion, notes.version),
          ),
        ),
      )
      .orderBy(asc(notes.id))
      .limit(limit);
  }
}
