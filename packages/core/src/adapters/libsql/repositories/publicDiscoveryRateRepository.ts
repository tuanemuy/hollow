import type { PublicDiscoveryRateRepository } from "@repo/core/application/publication/ports";
import { and, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { publicDiscoveryRates } from "../publicationSchema";

export class LibsqlPublicDiscoveryRateRepository
  implements PublicDiscoveryRateRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async reserve(browserHash: string | null, now: Date) {
    const keys: {
      kind: "global" | "browser";
      subjectHash: string;
      limit: number;
    }[] = [{ kind: "global", subjectHash: "", limit: 300 }];
    if (browserHash !== null)
      keys.push({ kind: "browser", subjectHash: browserHash, limit: 30 });
    const fresh = [];
    for (const key of keys) {
      const [row] = await this.db
        .select()
        .from(publicDiscoveryRates)
        .where(
          and(
            eq(publicDiscoveryRates.kind, key.kind),
            eq(publicDiscoveryRates.subjectHash, key.subjectHash),
          ),
        );
      const active = row && row.windowStart.getTime() + 60_000 > now.getTime();
      if (active && row.attempts >= key.limit)
        return new Date(row.windowStart.getTime() + 60_000);
      fresh.push({
        kind: key.kind,
        subjectHash: key.subjectHash,
        windowStart: active ? row.windowStart : now,
        attempts: active ? row.attempts + 1 : 1,
      });
    }
    for (const row of fresh)
      await this.db
        .insert(publicDiscoveryRates)
        .values(row)
        .onConflictDoUpdate({
          target: [publicDiscoveryRates.kind, publicDiscoveryRates.subjectHash],
          set: { windowStart: row.windowStart, attempts: row.attempts },
        });
    return null;
  }
  async prune(now: Date) {
    await this.db.run(
      sql`delete from public_discovery_rates where (kind,subject_hash) in(select kind,subject_hash from public_discovery_rates where window_start<=${now.getTime() - 60_000} order by window_start,kind,subject_hash limit 100)`,
    );
  }
}
