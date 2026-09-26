import { randomUUID } from "node:crypto";
import type {
  PdfTransferRef,
  PdfTransfers,
} from "@repo/core/application/pdf/ports";
import { BusinessRuleError } from "@repo/core/domain/error";

export class NodePdfTransfers implements PdfTransfers {
  readonly runtimeId = randomUUID();
  private readonly operations = new Map<
    string,
    {
      ref: PdfTransferRef;
      controller: AbortController;
      timer: ReturnType<typeof setTimeout>;
      closed: Promise<void>;
      resolve: () => void;
    }
  >();
  private stopped = false;
  hold(ref: PdfTransferRef, expiresAt: Date) {
    const id = `${ref.kind}:${ref.id}`;
    if (this.stopped || this.operations.size >= 2 || this.operations.has(id))
      throw new BusinessRuleError(
        "PDF_DELIVERY_BUSY",
        "PDF取得処理の終了を待っています。",
      );
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining <= 0)
      throw new BusinessRuleError("PDF_EXPIRED", "PDF取得の期限が切れました。");
    const controller = new AbortController();
    let resolve = () => {};
    const closed = new Promise<void>((done) => {
      resolve = done;
    });
    const timer = setTimeout(() => controller.abort(), remaining);
    timer.unref();
    this.operations.set(id, {
      ref: { ...ref },
      controller,
      timer,
      closed,
      resolve,
    });
    return controller.signal;
  }
  ids() {
    return [...this.operations.values()].map(({ ref }) => ({ ...ref }));
  }
  cancel(ref: PdfTransferRef) {
    const id = `${ref.kind}:${ref.id}`;
    this.operations.get(id)?.controller.abort();
  }
  release(ref: PdfTransferRef) {
    const id = `${ref.kind}:${ref.id}`;
    const operation = this.operations.get(id);
    if (!operation) return;
    clearTimeout(operation.timer);
    this.operations.delete(id);
    operation.resolve();
  }
  async stop() {
    this.stopped = true;
    for (const operation of this.operations.values())
      operation.controller.abort();
    await Promise.all(
      [...this.operations.values()].map((operation) => operation.closed),
    );
  }
}
