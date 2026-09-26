import type {
  PdfDemand,
  PdfDemandRepository,
} from "@repo/core/application/pdf/anonymousPorts";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { pdfAnonymousRequests } from "../pdfAnonymousSchema";
import { pdfRequests } from "../pdfSchema";
import {
  anonymousRequestRow,
  currentPdfAnonymousAuthority,
  currentPdfAnonymousDemand,
} from "./pdfAnonymousHelpers";
import { currentPdfDemand, requestRow } from "./pdfHelpers";
import { LibsqlPdfRequestRepository } from "./pdfRequestRepository";

export function currentAnyPdfDemand(
  computeId: ReturnType<typeof sql> | string,
  now: Date,
) {
  return sql`(exists(select 1 from pdf_requests where compute_id=${computeId} and state in('queued','running') and history_expires_at>${now.getTime()} and ${currentPdfDemand}) or exists(select 1 from pdf_anonymous_requests where compute_id=${computeId} and state in('queued','running') and ${currentPdfAnonymousDemand(now)}))`;
}

export class LibsqlPdfDemandRepository implements PdfDemandRepository {
  constructor(private readonly db: HollowTransaction) {}
  async find(computeId: string, now: Date): Promise<PdfDemand | null> {
    const [account] = await this.db
      .select()
      .from(pdfRequests)
      .where(
        and(
          eq(pdfRequests.computeId, computeId),
          sql`${pdfRequests.state} in('queued','running')`,
          gt(pdfRequests.historyExpiresAt, now),
          currentPdfDemand,
        ),
      )
      .orderBy(asc(pdfRequests.id))
      .limit(1);
    if (account) return { kind: "account", request: requestRow(account) };
    const [anonymous] = await this.db
      .select()
      .from(pdfAnonymousRequests)
      .where(
        and(
          eq(pdfAnonymousRequests.computeId, computeId),
          sql`${pdfAnonymousRequests.state} in('queued','running')`,
          currentPdfAnonymousDemand(now),
        ),
      )
      .orderBy(asc(pdfAnonymousRequests.id))
      .limit(1);
    return anonymous
      ? { kind: "anonymous", request: anonymousRequestRow(anonymous) }
      : null;
  }
  async running(computeId: string, now: Date) {
    await new LibsqlPdfRequestRepository(this.db).running(computeId, now);
    await this.db
      .update(pdfAnonymousRequests)
      .set({
        state: "running",
        updatedAt: now,
        version: sql`${pdfAnonymousRequests.version}+1`,
      })
      .where(
        and(
          eq(pdfAnonymousRequests.computeId, computeId),
          eq(pdfAnonymousRequests.state, "queued"),
          currentPdfAnonymousDemand(now),
        ),
      );
  }
  async succeed(computeId: string, artifactId: string, now: Date) {
    const count = await new LibsqlPdfRequestRepository(this.db).succeed(
      computeId,
      artifactId,
      now,
    );
    const result = await this.db.run(
      sql`update pdf_anonymous_requests set state='succeeded',artifact_id=${artifactId},updated_at=${now.getTime()},version=version+1 where compute_id=${computeId} and state in('queued','running') and ${currentPdfAnonymousDemand(now)} and exists(select 1 from pdf_artifacts a where a.id=${artifactId} and a.state='ready' and a.compute_id=${computeId} and a.source_identity=pdf_anonymous_requests.source_identity and a.profile=pdf_anonymous_requests.profile and a.expires_at>${now.getTime()})`,
    );
    const total = count + Number(result.rowsAffected);
    if (total > 0) {
      await this.db.run(
        sql`update pdf_requests set state='cancelled',updated_at=${now.getTime()},version=version+1 where compute_id=${computeId} and state in('queued','running')`,
      );
      await this.db.run(
        sql`update pdf_anonymous_requests set state=case when ${currentPdfAnonymousAuthority(now)} then 'expired' else 'invalidated' end,failure=null,updated_at=${now.getTime()},version=version+1 where compute_id=${computeId} and state in('queued','running')`,
      );
    }
    return total;
  }
  async fail(computeId: string, failure: string, now: Date) {
    await new LibsqlPdfRequestRepository(this.db).fail(computeId, failure, now);
    await this.db.run(
      sql`update pdf_anonymous_requests set state=case when not (${currentPdfAnonymousAuthority(now)}) then 'invalidated' when ticket_expires_at<=${now.getTime()} then 'expired' else 'failed' end,failure=case when ${currentPdfAnonymousDemand(now)} then ${failure} else null end,updated_at=${now.getTime()},version=version+1 where compute_id=${computeId} and state in('queued','running')`,
    );
  }
}
