"use client";

import { useState } from "react";

export function BrowseMonthFilter({
  month,
  context,
  apply,
}: {
  month: string | undefined;
  context: string;
  apply(month: string): void;
}) {
  const [source, setSource] = useState({ month, context });
  const [draft, setDraft] = useState(month ?? "");
  if (source.month !== month || source.context !== context) {
    setSource({ month, context });
    setDraft(month ?? "");
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(draft);
      }}
    >
      <label>
        作成月
        <input
          type="month"
          min="0001-01"
          max="9999-12"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <button type="submit">適用</button>
    </form>
  );
}
