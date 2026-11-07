import { ApplicationError, type SerializedSystemError } from "../errors";

export type RetainedObjectOwner = Readonly<{
  kind: "zip-spool" | "zip-assembly" | "zip-delivery";
  id: string;
}>;

export class ObjectWriteCloseUnprovenError extends Error {
  constructor() {
    super("保存ファイルの実終了を確認できません。");
  }
}

export class ObjectOwnershipUnprovenError extends ApplicationError<"ZIP_OWNERSHIP_UNKNOWN"> {
  override readonly name = "ObjectOwnershipUnprovenError";
  readonly ownership = "retained";
  constructor(readonly owner: RetainedObjectOwner) {
    super(
      "ZIP_OWNERSHIP_UNKNOWN",
      "ZIPの終了を安全に確認できません。管理者の確認まで再試行できません。",
    );
  }
  override toSerialized(): SerializedSystemError {
    return {
      kind: "system",
      code: this.code,
      message: this.message,
      retryable: false,
    };
  }
}
