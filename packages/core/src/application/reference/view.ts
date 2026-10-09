import type { ReferenceEntry } from "@repo/core/domain/reference/entity";

type ReaderFields = Pick<
  ReferenceEntry,
  "kind" | "state" | "current" | "url" | "bytes" | "reason"
>;
export type ReferenceReaderEntry = Readonly<
  Pick<ReaderFields, "kind" | "state" | "current" | "bytes" | "reason"> & {
    source:
      | Readonly<{ kind: "url"; url: string }>
      | Readonly<{ kind: "data"; mediaType: string }>;
  }
>;

export function referenceReaderEntries(
  entries: readonly ReaderFields[],
): readonly ReferenceReaderEntry[] {
  return entries.map((entry) => ({
    kind: entry.kind,
    state: entry.state,
    current: entry.current,
    source: entry.url.startsWith("data:")
      ? {
          kind: "data",
          mediaType: entry.url.slice(5).split(/[;,]/, 1)[0]?.slice(0, 60) ?? "",
        }
      : { kind: "url", url: entry.url },
    bytes: entry.bytes,
    reason: entry.reason,
  }));
}
