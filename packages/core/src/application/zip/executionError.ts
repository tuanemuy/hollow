export class ZipExecutionUnprovenError extends Error {
  readonly code = "ZIP_EXECUTION_UNPROVEN";
  constructor() {
    super(
      "ZIP文書処理の終了を確認できません。安全確認後に再起動してください。",
    );
  }
}
