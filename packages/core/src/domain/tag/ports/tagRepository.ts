import type { Tag, TagCounts } from "../entity";

export interface TagRepository {
  find(id: string): Promise<Tag | null>;
  findByKey(scopeKey: string, key: string): Promise<Tag | null>;
  ensure(tag: Omit<Tag, "mutationRevision">): Promise<Tag>;
  selected(noteId: string): Promise<readonly Tag[]>;
  attach(noteId: string, tagId: string): Promise<boolean>;
  detach(noteId: string, tagId: string): Promise<boolean>;
  counts(tagId: string, scopeKey: string): Promise<TagCounts>;
  overlap(sourceId: string, targetId: string): Promise<number>;
  rename(id: string, name: string, key: string, version: string): Promise<void>;
  merge(sourceId: string, targetId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
