import { BusinessRuleError } from "@repo/core/domain/error";
import {
  IMPORT_LIMITS,
  normalizeSourcePath,
  type UploadFile,
  type UploadReservation,
  validateUploadBatch,
} from "@repo/core/domain/import/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { importContext } from "./context";

export async function beginUpload(
  container: HollowContainer,
  token: string | null,
  input: {
    files: readonly UploadFile[];
    useAi: boolean;
    importReferences?: boolean;
  },
) {
  importContext(container);
  validateUploadBatch(input.files);
  return container.unitOfWorkProvider.run(
    async ({ accounts, imports, assets, references }) => {
      const account = await requireAccount(container, accounts, token);
      const now = container.clock.now();
      if (
        (await imports.reservedAndUsedBytes(account.id, now)) +
          (await assets.reservedAndUsedBytes(account.id, now)) +
          (await references.usedBytes(account.id)) +
          input.files.reduce((n, f) => n + f.bytes, 0) >
        IMPORT_LIMITS.quotaBytes
      )
        throw new BusinessRuleError(
          "IMPORT_QUOTA",
          "保存容量の上限（5 GB）を超えます。不要なノートを削除してから取り込んでください。",
        );
      const batch = {
        id: container.idGenerator.next(),
        accountId: account.id,
        createdAt: now,
        useAi: input.useAi,
        cancelledAt: null,
      };
      await imports.insertBatch(batch);
      await references.insertBundle({
        id: batch.id,
        accountId: account.id,
        enabled: input.importReferences ?? true,
        sealed: false,
        createdAt: now,
      });
      const reservations: UploadReservation[] = [];
      for (const file of input.files) {
        const id = container.idGenerator.next();
        const row: UploadReservation = {
          id,
          batchId: batch.id,
          accountId: account.id,
          name: file.name,
          role: file.role ?? "note",
          sourcePath: normalizeSourcePath(file.path ?? file.name),
          bytes: file.bytes,
          storageKey: id,
          state: "awaiting",
          failure: null,
          expiresAt: new Date(now.getTime() + 60 * 60_000),
        };
        await imports.insertReservation(row);
        reservations.push(row);
      }
      return {
        batchId: batch.id,
        files: reservations.map((r) => ({
          id: r.id,
          name: r.name,
          bytes: r.bytes,
        })),
        usedBytes:
          (await imports.reservedAndUsedBytes(account.id, now)) +
          (await assets.reservedAndUsedBytes(account.id, now)) +
          (await references.usedBytes(account.id)),
      };
    },
  );
}
