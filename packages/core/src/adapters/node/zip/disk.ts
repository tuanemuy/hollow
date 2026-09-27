import { statfs } from "node:fs/promises";
import type { ZipDiskAdmission } from "@repo/core/application/zip/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

export class NodeZipDiskAdmission implements ZipDiskAdmission {
  private tail: Promise<void> = Promise.resolve();
  constructor(
    private readonly directory: string,
    private readonly protectedBytes: number,
  ) {}
  async reserve<T>(
    input: Parameters<ZipDiskAdmission["reserve"]>[0],
    commit: () => Promise<T>,
  ): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const outstanding = await input.unmaterializedBytes();
      if (
        ![input.newBytes, outstanding, this.protectedBytes].every(
          (value) => Number.isSafeInteger(value) && value >= 0,
        )
      )
        throw new BusinessRuleError(
          "ZIP_CAPACITY",
          "ZIPの領域設定を確認してください。",
        );
      const disk = await statfs(this.directory, { bigint: true });
      const available = disk.bavail * disk.bsize;
      if (
        available <
        BigInt(this.protectedBytes) +
          BigInt(outstanding) +
          BigInt(input.newBytes)
      )
        throw new BusinessRuleError(
          "ZIP_DISK_BUSY",
          "既存書き出し用の空き領域を保護するため、ZIPを開始できません。",
        );
      return await commit();
    } finally {
      release();
    }
  }
}
