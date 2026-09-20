import type { PdfJobView } from "@repo/core/application/pdf/usecases";

export type PdfIdentity = Readonly<{
  actorId: string;
  actorEpoch: number;
  noteId: string;
}>;
export type PdfActor = Readonly<{ id: string; epoch: number }> | null;
export function pdfFailureMessage(code: string | null): string {
  if (code === "PDF_OWNERSHIP_UNKNOWN")
    return "PDF生成は失敗しました。実行環境の安全確認が必要なため、現在は再試行できません。生成資源の回収完了は確認されていません。";
  if (
    code === "PDF_RESOURCE_CAPACITY" ||
    code === "PDF_CAPACITY_CONFIGURATION" ||
    code === "PDF_DISK_CONFIGURATION"
  )
    return "PDF生成の技術的な容量設定に収まりませんでした。設定の調整が必要です。本文の閲覧権限がないという意味ではありません。";
  if (code === "PDF_DEADLINE") return "PDF生成の制限時間を超えました。";
  if (code === "PDF_INTERRUPTED") return "再起動でPDF生成が中断しました。";
  if (code === "PDF_CONTENT_CHANGED")
    return "生成中にノートの内容が変わりました。";
  return "PDFを生成できませんでした。現在のノートを確認して、必要なら再試行してください。";
}
export type PdfOperation = PdfIdentity &
  Readonly<{ mount: object; token: object }>;
export type PdfModel =
  | Readonly<{ kind: "idle"; message: string | null }>
  | Readonly<{
      kind: "unconfirmed";
      commandId: string;
      message: string | null;
    }>
  | Readonly<{
      kind: "tracked";
      commandId: string;
      job: PdfJobView;
      polling: boolean;
      message: string | null;
    }>;

export function samePdfActor(actor: PdfActor, identity: PdfIdentity): boolean {
  return actor?.id === identity.actorId && actor.epoch === identity.actorEpoch;
}

export function ownsPdfOperation(
  mounted: boolean,
  captured: PdfOperation,
  current: PdfOperation | null,
  actor: PdfActor,
): boolean {
  return (
    mounted &&
    current !== null &&
    captured.mount === current.mount &&
    captured.token === current.token &&
    captured.actorId === current.actorId &&
    captured.actorEpoch === current.actorEpoch &&
    captured.noteId === current.noteId &&
    samePdfActor(actor, captured)
  );
}

export function initialPdfModel(commandId: string | null): PdfModel {
  return commandId
    ? { kind: "unconfirmed", commandId, message: null }
    : { kind: "idle", message: null };
}

export function pdfIsActive(job: PdfJobView): boolean {
  return job.state === "queued" || job.state === "running";
}

export function canPreparePdf(job: PdfJobView): boolean {
  return job.state === "succeeded" && job.available;
}

export function acceptsPdfJob(
  model: PdfModel,
  job: PdfJobView,
  identity: PdfIdentity,
): boolean {
  return (
    model.kind !== "idle" &&
    job.commandId === model.commandId &&
    job.actorId === identity.actorId &&
    job.noteId === identity.noteId &&
    (model.kind !== "tracked" ||
      (job.id === model.job.id &&
        job.version >= model.job.version &&
        (pdfIsActive(model.job) || job.state === model.job.state)))
  );
}

export function adoptPdfJob(
  model: PdfModel,
  job: PdfJobView,
  identity: PdfIdentity,
): PdfModel {
  if (!acceptsPdfJob(model, job, identity)) return model;
  return {
    kind: "tracked",
    commandId: job.commandId,
    job,
    polling: pdfIsActive(job),
    message: null,
  };
}

export function pdfLookupUnavailable(model: PdfModel): PdfModel {
  if (model.kind === "idle") return model;
  const message =
    "現在の処理を確認できません。未受理とは限らないため、新しい要求は送信しません。もう一度状況を確認してください。";
  return model.kind === "tracked"
    ? { ...model, polling: false, message }
    : { ...model, message };
}

export function clearPdfPending(
  pendingCommandId: string | null,
  job: PdfJobView,
  identity: PdfIdentity,
): boolean {
  return (
    pendingCommandId === job.commandId &&
    job.actorId === identity.actorId &&
    job.noteId === identity.noteId &&
    !pdfIsActive(job)
  );
}

export function mayAutoDownloadPdf(
  automaticCommandId: string | null,
  job: PdfJobView,
): boolean {
  return automaticCommandId === job.commandId && canPreparePdf(job);
}

export function pdfDeliveryUrl(delivery: {
  id: string;
  url: string;
}): string | null {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      delivery.id,
    )
  )
    return null;
  const expected = `/api/pdf-deliveries/${delivery.id}`;
  return delivery.url === expected ? expected : null;
}

export function pdfStateLabel(job: PdfJobView): string {
  switch (job.state) {
    case "queued":
      return "PDFの作成を受け付けました。";
    case "running":
      return "PDFを作成しています。";
    case "succeeded":
      return job.available
        ? "PDFを取得できます。"
        : "このPDFは取得できません。現在の内容から新しく作成してください。";
    case "failed":
      return "PDFの作成に失敗しました。";
    case "cancelled":
      return "PDFの作成要求を取り消しました。";
  }
}
