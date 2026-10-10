import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  ExportFile,
  ExportOperation,
  ExportOperationRepository,
} from "@repo/core/application/export/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { exportDownloadRates, exportOperations } from "../exportSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

const unavailable = () =>
  new BusinessRuleError(
    "EXPORT_UNAVAILABLE",
    "書き出しを続けられません。最新の内容からやり直してください。",
  );
function hydrate(row: typeof exportOperations.$inferSelect): ExportOperation {
  if (row.state === "preparing" && row.file === null)
    return { ...row, state: "preparing", file: null };
  if (row.state === "cleanup") return { ...row, state: "cleanup" };
  if ((row.state === "ready" || row.state === "sending") && row.file)
    return { ...row, state: row.state, file: row.file };
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "書き出し所有記録が一致しません。",
  );
}

export class LibsqlExportOperationRepository
  implements ExportOperationRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(exportOperations)
      .where(eq(exportOperations.id, id));
    return row ? hydrate(row) : null;
  }
  private async activeNote(noteId: string) {
    return (
      (
        await this.db.all(
          sql`select 1 from notes n where n.id=${noteId} and n.lifecycle='active' and ((n.owner_workspace_id is null and exists(select 1 from accounts owner where owner.id=n.owner_account_id and owner.state='active')) or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active'))`,
        )
      ).length > 0
    );
  }
  private async available(bytes: number, diskLimit: number) {
    if (
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      !Number.isSafeInteger(diskLimit) ||
      diskLimit < 1
    )
      throw unavailable();
    if (bytes > diskLimit)
      throw new BusinessRuleError(
        "EXPORT_DISK_CONFIGURATION",
        "このノートの出力に必要な一時領域がサービスの設定値を超えます。管理者による書き出し領域の調整が必要です。",
      );
    const [row] = await this.db.all<{ bytes: number }>(
      sql`select coalesce(sum(reserved_bytes),0) bytes from export_operations`,
    );
    if (Number(row?.bytes ?? 0) + bytes > diskLimit)
      throw new BusinessRuleError(
        "EXPORT_DISK_BUSY",
        "書き出し用の一時領域を使用中です。回収後にやり直してください。",
      );
  }
  async begin(operation: ExportOperation, diskLimit: number) {
    if (
      operation.state !== "preparing" ||
      !(await this.activeNote(operation.noteId))
    )
      throw unavailable();
    const [row] = await this.db.all<{ count: number }>(
      sql`select count(*) count from export_operations e where e.state!='cleanup' or exists(select 1 from object_writes w where w.kind='export-operation' and w.owner_id=e.id and w.active=1)`,
    );
    if (Number(row?.count ?? 0) >= 2)
      throw new BusinessRuleError(
        "EXPORT_BUSY",
        "ほかの書き出しが進行中です。完了後にやり直してください。",
      );
    await this.available(operation.reservedBytes, diskLimit);
    await this.db.insert(exportOperations).values(operation);
  }
  async reserve(id: string, bytes: number, diskLimit: number) {
    const op = await this.find(id);
    if (
      !op ||
      op.state !== "preparing" ||
      op.reservedBytes !== 0 ||
      !(await this.activeNote(op.noteId))
    )
      throw unavailable();
    await this.available(bytes, diskLimit);
    await this.db
      .update(exportOperations)
      .set({ reservedBytes: bytes })
      .where(eq(exportOperations.id, id));
  }
  async ready(id: string, file: ExportFile, now: Date) {
    const op = await this.find(id);
    if (
      !op ||
      op.state !== "preparing" ||
      op.expiresAt <= now ||
      file.bytes > op.reservedBytes ||
      !(await this.activeNote(op.noteId))
    )
      return false;
    return (
      (
        await this.db
          .update(exportOperations)
          .set({ state: "ready", file })
          .where(
            and(
              eq(exportOperations.id, id),
              eq(exportOperations.state, "preparing"),
            ),
          )
          .returning()
      ).length === 1
    );
  }
  async claimSend(id: string, now: Date) {
    const op = await this.find(id);
    if (
      !op ||
      op.state !== "ready" ||
      op.expiresAt <= now ||
      !(await this.activeNote(op.noteId))
    )
      return false;
    return (
      (
        await this.db
          .update(exportOperations)
          .set({ state: "sending" })
          .where(
            and(
              eq(exportOperations.id, id),
              eq(exportOperations.state, "ready"),
            ),
          )
          .returning()
      ).length === 1
    );
  }
  async retire(id: string, now: Date) {
    await this.db
      .update(exportOperations)
      .set({ state: "cleanup", nextCleanupAt: now })
      .where(
        and(
          eq(exportOperations.id, id),
          sql`${exportOperations.state}!='cleanup'`,
        ),
      );
  }
  async recover(now: Date) {
    await this.db
      .update(exportOperations)
      .set({
        state: "cleanup",
        nextCleanupAt: now,
        cleanupToken: null,
        cleanupUntil: null,
      })
      .where(
        sql`not exists(select 1 from object_writes w where w.kind='export-operation' and w.owner_id=${exportOperations.id} and w.active=1)`,
      );
  }
  async claimCleanup(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(exportOperations)
      .where(
        and(
          sql`(${exportOperations.state}='cleanup' or ${exportOperations.expiresAt}<=${now.getTime()} or not exists(select 1 from notes n where n.id=${exportOperations.noteId} and n.lifecycle='active' and ((n.owner_workspace_id is null and exists(select 1 from accounts owner where owner.id=n.owner_account_id and owner.state='active')) or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active'))))`,
          lte(exportOperations.nextCleanupAt, now),
          sql`(${exportOperations.cleanupUntil} is null or ${exportOperations.cleanupUntil}<=${now.getTime()})`,
          sql`not exists(select 1 from object_writes w where w.kind='export-operation' and w.owner_id=${exportOperations.id} and w.active=1)`,
        ),
      )
      .orderBy(asc(exportOperations.nextCleanupAt), asc(exportOperations.id))
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(exportOperations)
      .set({
        state: "cleanup",
        cleanupToken: token,
        cleanupUntil: until,
        generation: sql`${exportOperations.generation}+1`,
      })
      .where(eq(exportOperations.id, row.id))
      .returning();
    return claimed ? hydrate(claimed) : null;
  }
  async finishCleanup(id: string, token: string, deleteToken: string) {
    return (
      (
        await this.db
          .delete(exportOperations)
          .where(
            and(
              eq(exportOperations.id, id),
              eq(exportOperations.state, "cleanup"),
              eq(exportOperations.cleanupToken, token),
              sql`exists(select 1 from object_deletes d where d.storage_key=${exportOperations.key} and d.token=${deleteToken} and d.done=1)`,
              sql`not exists(select 1 from object_writes w where w.kind='export-operation' and w.owner_id=${exportOperations.id} and w.active=1)`,
            ),
          )
          .returning()
      ).length === 1
    );
  }
  async deferCleanup(id: string, token: string, now: Date) {
    await this.db
      .update(exportOperations)
      .set({
        nextCleanupAt: new Date(now.getTime() + 5000),
        cleanupToken: null,
        cleanupUntil: null,
      })
      .where(
        and(
          eq(exportOperations.id, id),
          eq(exportOperations.cleanupToken, token),
        ),
      );
  }
  async reserveDownload(noteId: string, browserHash: string, now: Date) {
    const keys = [
      { kind: "browser" as const, subject: browserHash, limit: 6 },
      { kind: "note" as const, subject: "", limit: 30 },
    ];
    const fresh = [];
    for (const key of keys) {
      const [row] = await this.db
        .select()
        .from(exportDownloadRates)
        .where(
          and(
            eq(exportDownloadRates.noteId, noteId),
            eq(exportDownloadRates.kind, key.kind),
            eq(exportDownloadRates.subjectHash, key.subject),
          ),
        );
      const active = row && row.windowStart.getTime() + 60000 > now.getTime();
      if (active && row.attempts >= key.limit)
        return new Date(row.windowStart.getTime() + 60000);
      fresh.push({
        noteId,
        kind: key.kind,
        subjectHash: key.subject,
        windowStart: active ? row.windowStart : now,
        attempts: active ? row.attempts + 1 : 1,
      });
    }
    for (const row of fresh)
      await this.db
        .insert(exportDownloadRates)
        .values(row)
        .onConflictDoUpdate({
          target: [
            exportDownloadRates.noteId,
            exportDownloadRates.kind,
            exportDownloadRates.subjectHash,
          ],
          set: { windowStart: row.windowStart, attempts: row.attempts },
        });
    return null;
  }
  async pruneRates(now: Date) {
    await this.db.run(
      sql`delete from export_download_rates where (note_id,kind,subject_hash) in(select note_id,kind,subject_hash from export_download_rates where window_start<=${now.getTime() - 60000} order by window_start limit 100)`,
    );
  }
}
