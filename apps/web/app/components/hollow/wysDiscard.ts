import type { Plan } from "@/adapters/wys/model";
import type { WysRecovery } from "./wysRecovery";

export type WysDiscardBaseline = Readonly<{
  noteId: string | undefined;
  source: string;
  recovery: WysRecovery;
}>;

export function discardedWysRecovery(
  saved: { html: string; wys?: WysRecovery | undefined },
  noteId: string | undefined,
  baseline: WysDiscardBaseline | undefined,
): WysRecovery | undefined {
  if (saved.wys) return saved.wys;
  if (
    !baseline ||
    baseline.noteId !== noteId ||
    baseline.source !== saved.html ||
    baseline.recovery.converted
  )
    return undefined;
  return baseline.recovery;
}

export type WysDiscardPreparation =
  | { kind: "ready"; plan: Plan }
  | { kind: "failed"; reason: string }
  | { kind: "superseded" };

export async function prepareDiscardedWys(
  html: string,
  signal: AbortSignal,
  analyzer: {
    prepare(html: string, signal: AbortSignal): Promise<Plan>;
    dispose(): void;
  },
  owns: () => boolean,
): Promise<WysDiscardPreparation> {
  try {
    const plan = await analyzer.prepare(html, signal);
    if (signal.aborted || !owns()) return { kind: "superseded" };
    if (plan.source !== html)
      throw new Error("保存済み本文と編集モデルが一致しません。");
    return { kind: "ready", plan };
  } catch (cause) {
    if (signal.aborted || !owns()) return { kind: "superseded" };
    return {
      kind: "failed",
      reason:
        cause instanceof Error
          ? cause.message
          : "保存済み本文の編集モデルを準備できません。",
    };
  } finally {
    analyzer.dispose();
  }
}
