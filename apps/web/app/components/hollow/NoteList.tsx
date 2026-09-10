"use client";

import type { NoteView } from "@repo/core/application/note/view";
import { Link } from "@tanstack/react-router";
import { noteStatus } from "./ImportJobs";

export function NoteList({ notes: items }: { notes: readonly NoteView[] }) {
  if (!items.length)
    return (
      <section className="hollow-empty">
        <span className="hollow-empty-mark" aria-hidden="true">
          ○
        </span>
        <h2>まだ、白紙です。</h2>
        <p>
          考えたこと、残しておきたいこと。
          <br />
          最初のノートを書いてみましょう。
        </p>
        <Link to="/notes/new" className="hollow-button hollow-primary">
          新規作成
        </Link>
      </section>
    );
  return (
    <ul className="hollow-note-list">
      {items.map((note) => (
        <li key={note.id}>
          <Link to="/notes/$noteId" params={{ noteId: note.id }}>
            <div>
              <h2>{note.title}</h2>
              <p>
                <time dateTime={note.updatedAt}>
                  {new Date(note.updatedAt).toLocaleDateString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span>非公開</span>
                <span>{noteStatus[note.status]}</span>
              </p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
