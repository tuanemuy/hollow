import { BusinessRuleError } from "@repo/core/domain/error";
import type { HollowContainer } from "../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../execution/hollowUnitOfWork";
import type { ZipPdfDemand } from "../pdf/demandPorts";
import { buildPdfSnapshot } from "../pdf/snapshot";
import { readZipSnapshot } from "./snapshot";

export async function readZipPdfSnapshot(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  demand: ZipPdfDemand,
) {
  const source = await readZipSnapshot(c, u, demand.accountId, demand.noteId);
  if (source.identity !== demand.zipIdentity.value)
    throw new BusinessRuleError(
      "ZIP_CONTENT_CHANGED",
      "保存済みの内容が変わりました。",
    );
  const snapshot = await buildPdfSnapshot(c, u, source.note);
  if (snapshot.identity !== demand.binding.identity.value)
    throw new BusinessRuleError(
      "PDF_CONTENT_CHANGED",
      "保存済みのPDF内容が変わりました。",
    );
  return snapshot;
}
