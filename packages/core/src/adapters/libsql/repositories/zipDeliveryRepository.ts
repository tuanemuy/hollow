import type { ZipDeliveryRepository } from "@repo/core/application/zip/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { ZipDelivery } from "@repo/core/domain/zip/entity";
import { and, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { zipDeliveries } from "../zipSchema";
import { deliveryRow, ownerAbsent, zipUnavailable } from "./zipHelpers";

export class LibsqlZipDeliveryRepository implements ZipDeliveryRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(zipDeliveries)
      .where(eq(zipDeliveries.id, id));
    return row ? deliveryRow(row) : null;
  }
  async prepare(delivery: ZipDelivery, now: Date) {
    if (delivery.state !== "ready" || delivery.expiresAt <= now)
      throw zipUnavailable();
    const [count] = await this.db.all<{ count: number }>(
      sql`select count(*) count from zip_deliveries where state!='closed'`,
    );
    if (Number(count?.count ?? 0) >= 2)
      throw new BusinessRuleError(
        "ZIP_DELIVERY_BUSY",
        "ZIP取得を使用中です。完了してからやり直してください。",
      );
    const { claim: _claim, ...values } = delivery;
    await this.db
      .insert(zipDeliveries)
      .values({ ...values, claimToken: null, runtimeId: null });
  }
  async claim(
    id: string,
    accountId: string,
    token: string,
    runtimeId: string,
    now: Date,
  ) {
    const [row] = await this.db
      .update(zipDeliveries)
      .set({ state: "sending", claimToken: token, runtimeId })
      .where(
        and(
          eq(zipDeliveries.id, id),
          eq(zipDeliveries.accountId, accountId),
          eq(zipDeliveries.state, "ready"),
          sql`${zipDeliveries.expiresAt}>${now.getTime()} and exists(select 1 from zip_artifacts a where a.id=${zipDeliveries.artifactId} and a.generation=${zipDeliveries.artifactGeneration} and a.state='ready' and a.expires_at>${now.getTime()})`,
        ),
      )
      .returning();
    return row ? deliveryRow(row) : null;
  }
  async beginClose(id: string, token: string, _now: Date) {
    await this.db
      .update(zipDeliveries)
      .set({ state: "closing" })
      .where(
        and(
          eq(zipDeliveries.id, id),
          eq(zipDeliveries.claimToken, token),
          eq(zipDeliveries.state, "sending"),
        ),
      );
  }
  async close(id: string, token: string | null) {
    return (
      (
        await this.db
          .update(zipDeliveries)
          .set({ state: "closed", claimToken: null, runtimeId: null })
          .where(
            and(
              eq(zipDeliveries.id, id),
              token
                ? eq(zipDeliveries.claimToken, token)
                : and(
                    sql`${zipDeliveries.claimToken} is null`,
                    eq(zipDeliveries.state, "ready"),
                  ),
              ownerAbsent("zip-delivery", id),
            ),
          )
          .returning({ id: zipDeliveries.id })
      ).length === 1
    );
  }
  async expireReady(now: Date) {
    await this.db.run(
      sql`update zip_deliveries set state='closed' where id in(select d.id from zip_deliveries d where d.state='ready' and (d.expires_at<=${now.getTime()} or not exists(select 1 from zip_artifacts a where a.id=d.artifact_id and a.state='ready' and a.expires_at>${now.getTime()})) order by d.expires_at,d.id limit 20)`,
    );
  }
  async recover(_now: Date) {
    await this.db.run(
      sql`update zip_deliveries set state='closed',claim_token=null,runtime_id=null where state!='closed' and not exists(select 1 from object_writes w where w.kind='zip-delivery' and w.owner_id=zip_deliveries.id and w.active=1)`,
    );
  }
  async prune(now: Date) {
    await this.db.run(
      sql`delete from zip_deliveries where id in(select id from zip_deliveries where state='closed' and expires_at<=${now.getTime()} order by expires_at,id limit 100)`,
    );
  }
}
