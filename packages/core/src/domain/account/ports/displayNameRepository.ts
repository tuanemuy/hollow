import type { DisplayNameProfile, ShareAuthor } from "../../sharing/entity";

export interface DisplayNameRepository {
  find(accountId: string): Promise<DisplayNameProfile>;
  save(
    accountId: string,
    expectedVersion: number,
    name: string | null,
  ): Promise<boolean>;
  author(accountId: string | null): Promise<ShareAuthor>;
}
