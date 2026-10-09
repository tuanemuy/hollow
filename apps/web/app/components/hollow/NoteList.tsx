"use client";

import type { BrowseNote } from "@repo/core/application/browse/ports";
import { Link } from "@tanstack/react-router";
import { HighlightedText } from "@/components/browse/TextPreview";
import { noteStatus } from "./ImportJobs";

export function NoteList({
  notes,
  layout = "list",
  zone,
  canEdit = false,
  pending = false,
  onTrash,
  onTag,
  onEditTags,
  onRemoveTag,
  selecting = false,
  selectedIds = [],
  selectionPending = false,
  onSelect,
}: {
  notes: readonly BrowseNote[];
  layout?: "tile" | "list" | "calendar";
  zone: string;
  canEdit?: boolean;
  pending?: boolean;
  onTrash: (note: BrowseNote) => void;
  onTag: (id: string) => void;
  onEditTags: (note: BrowseNote) => void;
  onRemoveTag: (note: BrowseNote, tag: { id: string; name: string }) => void;
  selecting?: boolean;
  selectedIds?: readonly string[];
  selectionPending?: boolean;
  onSelect?: (id: string) => void;
}) {
  const selected = new Set(selectedIds);
  return (
    <ul className={`browse-notes browse-notes-${layout}`}>
      {notes.map((note) => (
        <li key={note.id} className="browse-note">
          {selecting && (
            <label className="batch-note-check">
              <input
                type="checkbox"
                checked={selected.has(note.id)}
                disabled={selectionPending}
                onChange={() => onSelect?.(note.id)}
              />
              「{note.title}」を選択
            </label>
          )}
          <Link
            to="/notes/$noteId"
            params={{ noteId: note.id }}
            className="browse-note-link"
          >
            <div className="browse-preview">
              {note.thumbnailUrl && (
                <img
                  src={note.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  width={320}
                  height={180}
                />
              )}
              {note.mediaLabel && (
                <span className="browse-media">{note.mediaLabel}</span>
              )}
              {note.excerpt.length ? (
                <p>
                  <HighlightedText parts={note.excerpt} excerpt />
                </p>
              ) : (
                <p className="browse-preview-empty">
                  {note.status === "ready" ? "本文は空です" : "本文の準備前"}
                </p>
              )}
            </div>
            <div className="browse-note-summary">
              <h2>
                <HighlightedText
                  parts={
                    note.titleParts.length
                      ? note.titleParts
                      : [{ text: note.title, match: false }]
                  }
                />
              </h2>
              <p className="browse-metadata">
                <time dateTime={note.updatedAt}>
                  {new Date(note.updatedAt).toLocaleDateString("ja-JP", {
                    timeZone: zone,
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <span>{noteStatus[note.status]}</span>
              </p>
            </div>
          </Link>
          <div className="browse-note-footer">
            <Link
              to="/notes/$noteId"
              params={{ noteId: note.id }}
              search={{ sharing: "1" }}
              aria-label={`「${note.title}」の公開状態と共有設定を確認`}
            >
              {note.sharing.visibility === "private"
                ? "非公開"
                : note.sharing.visibility === "link"
                  ? "限定公開"
                  : "公開"}
              {note.sharing.hasPassword ? " · パスワードあり" : ""}
              {note.sharing.visibility !== "private" && note.sharing.hasLink
                ? " · リンクあり"
                : ""}
            </Link>
            <div className="browse-tags">
              {note.tags.map((tag) => (
                <span className="tag-inline" key={tag.id}>
                  <button
                    type="button"
                    className="browse-tag"
                    onClick={() => onTag(tag.id)}
                    disabled={tag.id.startsWith("pending:")}
                    aria-label={`タグ「${tag.name}」で絞り込む`}
                  >
                    {tag.name}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={pending || tag.id.startsWith("pending:")}
                      onClick={() => onRemoveTag(note, tag)}
                      aria-label={`「${note.title}」のタグ「${tag.name}」を外す`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canEdit && (
              <button
                type="button"
                className="tag-add"
                disabled={pending}
                onClick={() => onEditTags(note)}
                aria-label={`「${note.title}」にタグを追加`}
              >
                ＋ タグ
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                className="browse-trash"
                disabled={pending}
                aria-label={`「${note.title}」を削除`}
                onClick={() => onTrash(note)}
              >
                削除
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
