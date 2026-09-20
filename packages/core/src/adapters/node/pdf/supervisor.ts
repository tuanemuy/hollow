import { spawn } from "node:child_process";
import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import type {
  PdfCapacity,
  PdfRenderInput,
  PdfSupervisor,
} from "@repo/core/application/pdf/ports";
import { BusinessRuleError } from "@repo/core/domain/error";
import { z } from "zod";

const count = z.number().int().safe().nonnegative();
const positive = count.positive();
const reason = z.enum([
  "completed",
  "cancelled",
  "parent-eof",
  "deadline",
  "invalid-parent",
  "invalid-protocol",
  "render-failed",
  "close-unproven",
  "ownership-unproven",
  "supervisor-failed",
  "invalid-arguments",
  "invalid-root",
  "ownership-api-unavailable",
  "invalid-ownership",
  "invalid-file-size",
  "changed-input",
  "invalid-config",
  "invalid-workspace",
  "invalid-ledger",
  "active-lock",
  "old-group-alive",
  "generation-exhausted",
]);
const rendered = z.strictObject({
  event: z.literal("render-closed"),
  ok: z.boolean(),
  code: z.enum([
    "ok",
    "cancelled",
    "deadline",
    "resource-limit",
    "invalid-input",
    "render-failed",
    "close-unproven",
    "identifier",
  ]),
  bytes: count,
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  chromeClosed: z.boolean(),
  channelClosed: z.boolean(),
  sinkClosed: z.boolean(),
  protocolClosed: z.boolean(),
});
const closed = z.strictObject({
  event: z.literal("supervisor-closed"),
  closed: z.boolean(),
  reason,
  exit: z.number().int().nullable(),
  group: positive.nullable(),
  generation: positive.nullable(),
  elapsedMs: count,
  stderrBytes: count,
});
const event = z.discriminatedUnion("event", [
  z.strictObject({ event: z.literal("checked"), closed: z.literal(true) }),
  z.strictObject({
    event: z.literal("spawn"),
    group: positive,
    generation: positive,
  }),
  z.strictObject({
    event: z.literal("stage"),
    name: z.enum([
      "browser-ready",
      "document-ready",
      "rendered",
      "channel-closing",
    ]),
  }),
  rendered,
  closed,
]);
const unknown = () =>
  new SystemError(
    SystemErrorCode.PdfOwnershipUnknown,
    "PDF処理の終了を確認できません。安全確認が必要です。",
  );
type Result = {
  rendered: z.infer<typeof rendered> | null;
  closed: z.infer<typeof closed> | null;
  checked: boolean;
  exit: number | null;
  invalid: boolean;
};

export class NodePdfSupervisor implements PdfSupervisor {
  private pending: Promise<unknown> | null = null;
  private cancel: (() => void) | null = null;
  private stopped = false;
  constructor(
    private readonly python: string,
    private readonly script: string,
    private readonly root: string,
    readonly profile: string,
    private readonly capacity: PdfCapacity,
    private readonly observe?: (value: z.infer<typeof event>) => void,
  ) {}

  private execute(
    args: readonly string[],
    signal?: AbortSignal,
  ): Promise<Result> {
    return new Promise((resolve, reject) => {
      // Web ambient environment bindings do not apply to this isolated child.
      const child = spawn(this.python, [this.script, ...args], {
        env: {
          PATH: "/usr/bin:/bin",
          LANG: "ja_JP.UTF-8",
        } as unknown as NodeJS.ProcessEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const result: Result = {
        rendered: null,
        closed: null,
        checked: false,
        exit: null,
        invalid: false,
      };
      let buffer = "";
      let bytes = 0;
      let spawned = false;
      let ended = false;
      const cancel = () => {
        if (!child.stdin.destroyed) child.stdin.end("cancel\n");
      };
      this.cancel = cancel;
      child.stdin.on("error", () => {});
      child.stderr.on("data", () => {});
      child.stdout.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 256 * 1024) {
          result.invalid = true;
          cancel();
          return;
        }
        buffer += chunk.toString("utf8");
        if (buffer.length > 65536 && !buffer.includes("\n")) {
          result.invalid = true;
          cancel();
          return;
        }
        while (true) {
          const at = buffer.indexOf("\n");
          if (at === -1) break;
          const line = buffer.slice(0, at);
          buffer = buffer.slice(at + 1);
          try {
            if (line.length > 65536 || ended) throw Error("protocol");
            const message = event.parse(JSON.parse(line));
            this.observe?.(message);
            if (message.event === "checked") {
              if (result.checked || spawned) throw Error("protocol");
              result.checked = true;
              ended = true;
            } else if (message.event === "spawn") {
              if (spawned || result.checked) throw Error("protocol");
              spawned = true;
            } else if (message.event === "render-closed") {
              if (!spawned || result.rendered) throw Error("protocol");
              result.rendered = message;
            } else if (message.event === "supervisor-closed") {
              if (result.closed) throw Error("protocol");
              result.closed = message;
              ended = true;
            } else if (!spawned || result.rendered) throw Error("protocol");
          } catch {
            result.invalid = true;
            cancel();
          }
        }
      });
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel();
      child.once("error", () => {
        result.invalid = true;
      });
      child.once("close", (code) => {
        signal?.removeEventListener("abort", cancel);
        this.cancel = null;
        result.exit = code;
        if (buffer.length) result.invalid = true;
        if (code === null || result.invalid) reject(unknown());
        else resolve(result);
      });
    });
  }

  async recover() {
    if (this.pending) throw unknown();
    const task = this.execute(["check", this.root]);
    this.pending = task;
    try {
      const result = await task;
      if (
        result.exit !== 0 ||
        !result.checked ||
        result.closed ||
        result.rendered
      )
        throw unknown();
    } finally {
      this.pending = null;
    }
  }
  async render(input: PdfRenderInput, signal: AbortSignal) {
    if (this.stopped || this.pending)
      throw new BusinessRuleError("PDF_BUSY", "PDF処理は使用中です。");
    signal.throwIfAborted();
    const remaining = input.deadlineAt.getTime() - Date.now();
    if (remaining <= 0)
      throw new BusinessRuleError(
        "PDF_DEADLINE",
        "PDF生成の待機時間を超えました。",
      );
    const task = this.execute(
      [
        "run",
        this.root,
        input.workspaceId,
        String(Math.min(remaining, this.capacity.totalMs)),
        String(this.capacity.termGraceMs),
      ],
      signal,
    );
    this.pending = task;
    try {
      const result = await task;
      const output = result.rendered;
      if (!result.closed?.closed || result.exit === 76 || result.exit === 77)
        throw unknown();
      signal.throwIfAborted();
      if (
        result.exit !== 0 ||
        result.closed.exit !== 0 ||
        !output?.ok ||
        output.code !== "ok" ||
        !output.sha256 ||
        !output.bytes ||
        !output.chromeClosed ||
        !output.channelClosed ||
        !output.sinkClosed ||
        !output.protocolClosed
      ) {
        const code =
          output?.code === "resource-limit"
            ? "PDF_RESOURCE_CAPACITY"
            : output?.code === "deadline" || result.closed.reason === "deadline"
              ? "PDF_DEADLINE"
              : "PDF_GENERATION_FAILED";
        throw new BusinessRuleError(
          code,
          "PDFを生成できませんでした。HTML・Markdownの書き出しは引き続き利用できます。",
        );
      }
      return {
        workspaceId: input.workspaceId,
        filename: input.plan.filename,
        bytes: output.bytes,
        sha256: output.sha256,
      };
    } finally {
      this.pending = null;
    }
  }
  async stop() {
    this.stopped = true;
    this.cancel?.();
    await this.pending?.catch(() => {});
  }
}
