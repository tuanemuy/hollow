import { BusinessRuleError } from "@repo/core/domain/error";
import {
  normalizeSourcePath,
  type UploadFile,
  type UploadReservation,
  validateUploadBatch,
} from "@repo/core/domain/import/entity";
import {
  capacityLimit,
  selectedScope,
} from "@repo/core/domain/workspace/entity";
import { requireAccount } from "../account/session";
import type { HollowContainer } from "../di/hollowTypes";
import { requireScope } from "../workspace/access";
import { importContext } from "./context";

export async function beginUpload(
  container: HollowContainer,
  token: string | null,
  input: {
    files: readonly UploadFile[];
    useAi: boolean;
    importReferences?: boolean;
    workspaceId?: string;
  },
) {
  importContext(container);
  validateUploadBatch(input.files);
  return container.unitOfWorkProvider.run(async (context) => {
    const { accounts, imports, references } = context;
    const account = await requireAccount(container, accounts, token);
    const now = container.clock.now();
    const scope = await requireScope(
      context,
      selectedScope(account.id, input),
      account.id,
      "edit",
    );
    if (
      (await context.capacity.usedBytes(scope, now)) +
        input.files.reduce((n, f) => n + f.bytes, 0) >
      capacityLimit(scope)
    )
      throw new BusinessRuleError(
        "IMPORT_QUOTA",
        "このスペースの保存容量上限を超えます。不要なノートを完全削除してから取り込んでください。",
      );
    const batch = {
      workspaceId: input.workspaceId ?? null,
      id: container.idGenerator.next(),
      accountId: account.id,
      createdAt: now,
      useAi: input.useAi,
      cancelledAt: null,
    };
    await imports.insertBatch(batch);
    await references.insertBundle({
      workspaceId: input.workspaceId ?? null,
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
      usedBytes: await context.capacity.usedBytes(scope, now),
    };
  });
}
