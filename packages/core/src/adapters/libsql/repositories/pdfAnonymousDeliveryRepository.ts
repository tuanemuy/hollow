import type { PdfAnonymousDeliveryRepository } from "@repo/core/application/pdf/anonymousPorts";
import { BusinessRuleError } from "@repo/core/domain/error";
import type { PdfAnonymousDelivery } from "@repo/core/domain/pdf/anonymous";
import { and, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfAnonymousDeliveries as deliveries } from "../pdfAnonymousSchema";
import {
  anonymousDeliveryRow,
  currentPdfAnonymousDemand,
} from "./pdfAnonymousHelpers";
import { pdfUnavailable } from "./pdfHelpers";

export class LibsqlPdfAnonymousDeliveryRepository
  implements PdfAnonymousDeliveryRepository
{
  constructor(private readonly db: HollowTransaction) {}

  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, id));
    return row ? anonymousDeliveryRow(row) : null;
  }

  async begin(delivery: PdfAnonymousDelivery, now: Date) {
    if (delivery.state !== "ready" || delivery.expiresAt <= now)
      throw pdfUnavailable();
    await this.expireReady(now);
    await this.db.run(
      sql`update pdf_deliveries set state='closed' where state='ready' and expires_at<=${now.getTime()}`,
    );
    const valid = await this.db.all(
      sql`select 1 from pdf_anonymous_requests join pdf_artifacts a on a.id=pdf_anonymous_requests.artifact_id where pdf_anonymous_requests.id=${delivery.requestId} and pdf_anonymous_requests.state='succeeded' and a.id=${delivery.artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and ${currentPdfAnonymousDemand(now)}`,
    );
    if (!valid.length) throw pdfUnavailable();
    const [row] = await this.db.all<{ count: number }>(
      sql`select (select count(*) from pdf_deliveries where state!='closed')+(select count(*) from pdf_anonymous_deliveries where state!='closed') count`,
    );
    if (
      Number(row?.count ?? 0) >= 2 ||
      (
        await this.db.all(
          sql`select 1 from pdf_anonymous_deliveries where request_id=${delivery.requestId} and state!='closed'`,
        )
      ).length
    )
      throw new BusinessRuleError(
        "PDF_DELIVERY_BUSY",
        "PDFの取得が進行中です。終了後にもう一度取得してください。",
      );
    await this.db.insert(deliveries).values(delivery);
  }

  async claim(
    id: string,
    browserHash: string,
    token: string,
    runtimeId: string,
    now: Date,
  ) {
    const [row] = await this.db
      .update(deliveries)
      .set({
        state: "sending",
        claimToken: token,
        runtimeId,
        generation: sql`${deliveries.generation}+1`,
      })
      .where(
        and(
          eq(deliveries.id, id),
          eq(deliveries.state, "ready"),
          sql`${deliveries.expiresAt}>${now.getTime()}`,
          sql`exists(select 1 from pdf_anonymous_requests join pdf_artifacts a on a.id=pdf_anonymous_requests.artifact_id where pdf_anonymous_requests.id=${deliveries.requestId} and pdf_anonymous_requests.browser_hash=${browserHash} and pdf_anonymous_requests.state='succeeded' and a.id=${deliveries.artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and ${currentPdfAnonymousDemand(now)})`,
        ),
      )
      .returning();
    return row ? anonymousDeliveryRow(row) : null;
  }

  async close(id: string, token: string | null) {
    return (
      (
        await this.db
          .update(deliveries)
          .set({ state: "closed", claimToken: null, runtimeId: null })
          .where(
            and(
              eq(deliveries.id, id),
              token === null
                ? eq(deliveries.state, "ready")
                : and(
                    eq(deliveries.claimToken, token),
                    sql`${deliveries.state} in('sending','closing')`,
                  ),
              sql`not exists(select 1 from object_writes w where w.kind='pdf-anonymous-delivery' and w.owner_id=${deliveries.id} and w.active=1)`,
            ),
          )
          .returning({ id: deliveries.id })
      ).length === 1
    );
  }

  async expireReady(now: Date) {
    await this.db
      .update(deliveries)
      .set({ state: "closed" })
      .where(
        and(
          eq(deliveries.state, "ready"),
          sql`(${deliveries.expiresAt}<=${now.getTime()} or not exists(select 1 from pdf_anonymous_requests join pdf_artifacts a on a.id=pdf_anonymous_requests.artifact_id where pdf_anonymous_requests.id=${deliveries.requestId} and pdf_anonymous_requests.state='succeeded' and a.id=${deliveries.artifactId} and a.state='ready' and a.expires_at>${now.getTime()} and ${currentPdfAnonymousDemand(now)}))`,
        ),
      );
  }

  async recover(now: Date) {
    await this.db
      .update(deliveries)
      .set({
        state: "closed",
        claimToken: null,
        runtimeId: null,
        nextCleanupAt: now,
      })
      .where(
        sql`not exists(select 1 from object_writes w where w.kind='pdf-anonymous-delivery' and w.owner_id=${deliveries.id} and w.active=1)`,
      );
  }
}
