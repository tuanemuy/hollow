import { BusinessRuleError } from "../../domain/error";
import type { HollowContainer } from "../di/hollowTypes";
import type { ExportDocumentWriter } from "../export/document";
import type { ExportSource, ExportSourceReader } from "../export/source";
import type { OwnedObjectRead } from "../ports/objectStorage";
import type { ZipNames } from "./names";
import type {
  ZipCapacity,
  ZipDiskAdmission,
  ZipExecution,
  ZipTransfers,
} from "./ports";
import type { ZipWriter } from "./writer";

export interface ZipSourceReader extends ExportSourceReader {
  openOwned(
    source: ExportSource,
    signal: AbortSignal,
  ): Promise<OwnedObjectRead>;
}
export type ZipServices = Readonly<{
  writer: ZipWriter;
  names: ZipNames;
  documentWriter: ExportDocumentWriter;
  sources: ZipSourceReader;
  execution: ZipExecution;
  transfers: ZipTransfers;
  disk: ZipDiskAdmission;
  capacity: ZipCapacity;
  defaultCss: string;
  wake(): void;
}>;
export function zipServices(c: HollowContainer) {
  const storage = c.importing?.storage;
  if (
    !c.zip ||
    !storage?.withOwner ||
    !storage.removeClaimed ||
    !storage.openOwnedRead ||
    !storage.putOwnedBounded
  )
    throw new BusinessRuleError(
      "ZIP_NOT_CONFIGURED",
      "この配備ではZIP書き出しを利用できません。",
    );
  return {
    ...c.zip,
    storage,
    withOwner: storage.withOwner.bind(storage),
    removeClaimed: storage.removeClaimed.bind(storage),
    openOwnedRead: storage.openOwnedRead.bind(storage),
    putOwnedBounded: storage.putOwnedBounded.bind(storage),
  };
}
