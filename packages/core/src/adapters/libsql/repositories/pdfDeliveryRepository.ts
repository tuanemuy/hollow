import type { PdfDeliveryRepository } from "@repo/core/application/pdf/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { PdfDelivery } from "@repo/core/domain/pdf/entity";
import { and, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfDeliveries } from "../pdfSchema";
import { currentPdfDemand, deliveryRow, pdfUnavailable } from "./pdfHelpers";

export class LibsqlPdfDeliveryRepository implements PdfDeliveryRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(pdfDeliveries)
      .where(eq(pdfDeliveries.id, id));
    return row ? deliveryRow(row) : null;
  }
  async begin(delivery: PdfDelivery, now: Date) {
    if (delivery.state !== "ready" || delivery.expiresAt <= now)
      throw pdfUnavailable();
    await this.db.run(
      sql`update pdf_deliveries set state='closed' where state='ready' and expires_at<=${now.getTime()}`,
    );
    const valid = await this.db.all(
      sql`select 1 from pdf_requests join pdf_artifacts a on a.id=pdf_requests.artifact_id where pdf_requests.id=${delivery.requestId} and pdf_requests.account_id=${delivery.accountId} and pdf_requests.state='succeeded' and a.id=${delivery.artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and ${currentPdfDemand}`,
    );
    if (!valid.length) throw pdfUnavailable();
    const [row] = await this.db.all<{ count: number }>(
      sql`select count(*) count from pdf_deliveries where state!='closed'`,
    );
    if (
      Number(row?.count ?? 0) >= 2 ||
      (
        await this.db.all(
          sql`select 1 from pdf_deliveries where request_id=${delivery.requestId} and state!='closed'`,
        )
      ).length
    )
      throw new BusinessRuleError(
        "PDF_DELIVERY_BUSY",
        "PDFの取得が進行中です。終了後にもう一度取得してください。",
      );
    await this.db.insert(pdfDeliveries).values(delivery);
  }
  async claim(
    id: string,
    accountId: string,
    token: string,
    runtimeId: string,
    now: Date,
  ) {
    const [row] = await this.db
      .update(pdfDeliveries)
      .set({
        state: "sending",
        claimToken: token,
        runtimeId,
        generation: sql`${pdfDeliveries.generation}+1`,
      })
      .where(
        and(
          eq(pdfDeliveries.id, id),
          eq(pdfDeliveries.accountId, accountId),
          eq(pdfDeliveries.state, "ready"),
          sql`${pdfDeliveries.expiresAt}>${now.getTime()}`,
          sql`exists(select 1 from pdf_requests join pdf_artifacts a on a.id=pdf_requests.artifact_id where pdf_requests.id=${pdfDeliveries.requestId} and pdf_requests.account_id=${accountId} and pdf_requests.state='succeeded' and a.id=${pdfDeliveries.artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and ${currentPdfDemand})`,
        ),
      )
      .returning();
    return row ? deliveryRow(row) : null;
  }
  async close(id: string, token: string | null) {
    return (
      (
        await this.db
          .update(pdfDeliveries)
          .set({ state: "closed", claimToken: null, runtimeId: null })
          .where(
            and(
              eq(pdfDeliveries.id, id),
              token === null
                ? eq(pdfDeliveries.state, "ready")
                : and(
                    eq(pdfDeliveries.claimToken, token),
                    sql`${pdfDeliveries.state} in('sending','closing')`,
                  ),
              sql`not exists(select 1 from object_writes w where w.kind='pdf-delivery' and w.owner_id=${pdfDeliveries.id} and w.active=1)`,
            ),
          )
          .returning({ id: pdfDeliveries.id })
      ).length === 1
    );
  }
  async expireReady(now: Date) {
    await this.db
      .update(pdfDeliveries)
      .set({ state: "closed" })
      .where(
        and(
          eq(pdfDeliveries.state, "ready"),
          sql`(${pdfDeliveries.expiresAt}<=${now.getTime()} or not exists(select 1 from pdf_requests join pdf_artifacts a on a.id=pdf_requests.artifact_id where pdf_requests.id=${pdfDeliveries.requestId} and pdf_requests.account_id=${pdfDeliveries.accountId} and pdf_requests.state='succeeded' and a.id=${pdfDeliveries.artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and ${currentPdfDemand}))`,
        ),
      );
  }
  async recover(now: Date) {
    await this.db
      .update(pdfDeliveries)
      .set({
        state: "closed",
        claimToken: null,
        runtimeId: null,
        nextCleanupAt: now,
      })
      .where(
        sql`not exists(select 1 from object_writes w where w.kind='pdf-delivery' and w.owner_id=${pdfDeliveries.id} and w.active=1)`,
      );
  }
}
