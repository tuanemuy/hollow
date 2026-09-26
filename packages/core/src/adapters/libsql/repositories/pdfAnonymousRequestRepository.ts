import type { PdfAnonymousRequestRepository } from "@repo/core/application/pdf/anonymousPorts";
import type { PdfAnonymousRequest } from "@repo/core/domain/pdf/anonymous";
import { and, eq, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfAnonymousRequests } from "../pdfAnonymousSchema";
import {
  anonymousRequestRow,
  anonymousRequestValues,
  currentPdfAnonymousAuthority,
} from "./pdfAnonymousHelpers";

export class LibsqlPdfAnonymousRequestRepository
  implements PdfAnonymousRequestRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(pdfAnonymousRequests)
      .where(eq(pdfAnonymousRequests.id, id));
    return row ? anonymousRequestRow(row) : null;
  }
  async findCommand(browserHash: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(pdfAnonymousRequests)
      .where(
        and(
          eq(pdfAnonymousRequests.browserHash, browserHash),
          eq(pdfAnonymousRequests.commandId, commandId),
        ),
      );
    return row ? anonymousRequestRow(row) : null;
  }
  async insert(request: PdfAnonymousRequest) {
    await this.db
      .insert(pdfAnonymousRequests)
      .values(anonymousRequestValues(request));
  }
  async consumeAuto(id: string, deliveryId: string, version: number) {
    return (
      (
        await this.db
          .update(pdfAnonymousRequests)
          .set({
            autoDeliveryId: deliveryId,
            version: sql`${pdfAnonymousRequests.version}+1`,
          })
          .where(
            and(
              eq(pdfAnonymousRequests.id, id),
              eq(pdfAnonymousRequests.version, version),
              eq(pdfAnonymousRequests.state, "succeeded"),
              sql`${pdfAnonymousRequests.autoDeliveryId} is null`,
            ),
          )
          .returning({ id: pdfAnonymousRequests.id })
      ).length === 1
    );
  }
  async invalidateNote(noteId: string, now: Date) {
    await this.db
      .update(pdfAnonymousRequests)
      .set({
        state: "invalidated",
        failure: null,
        updatedAt: now,
        version: sql`${pdfAnonymousRequests.version}+1`,
      })
      .where(
        and(
          eq(pdfAnonymousRequests.liveNoteId, noteId),
          sql`${pdfAnonymousRequests.state}!='invalidated'`,
        ),
      );
  }
  async sweep(now: Date) {
    await this.db.run(
      sql`update pdf_anonymous_requests set state='invalidated',failure=null,updated_at=${now.getTime()},version=version+1 where id in(select id from pdf_anonymous_requests where state!='invalidated' and not (${currentPdfAnonymousAuthority(now)}) order by ticket_expires_at,id limit 100)`,
    );
    await this.db.run(
      sql`update pdf_anonymous_requests set state='expired',failure=null,updated_at=${now.getTime()},version=version+1 where id in(select id from pdf_anonymous_requests where state not in('invalidated','expired') and ticket_expires_at<=${now.getTime()} order by ticket_expires_at,id limit 100)`,
    );
  }
  async prune(now: Date) {
    await this.db.run(
      sql`delete from pdf_anonymous_deliveries where id in(select id from pdf_anonymous_deliveries where state='closed' and expires_at<=${now.getTime()} order by expires_at,id limit 100)`,
    );
    await this.db.run(
      sql`delete from pdf_anonymous_requests where id in(select r.id from pdf_anonymous_requests r where r.ticket_expires_at<=${now.getTime()} and r.state in('failed','invalidated','expired') and not exists(select 1 from pdf_anonymous_deliveries d where d.request_id=r.id) and not exists(select 1 from pdf_computations c where c.id=r.compute_id and (c.state!='closed' or c.workspace_removed=0)) and not exists(select 1 from pdf_artifacts a where a.id=r.artifact_id and a.state!='removed') order by r.ticket_expires_at,r.id limit 100)`,
    );
  }
}
