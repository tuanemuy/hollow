import { history, redo, undo } from "prosemirror-history";
import {
  type Command,
  EditorState,
  type Plugin,
  type Transaction,
} from "prosemirror-state";
import {
  acknowledgedMediaAliases,
  mediaSources,
  rewriteAcknowledgedMedia,
  type WysCanonicalAcknowledgement,
} from "./canonicalMedia";
import { type Plan, serialize } from "./model";

export const WYS_EPOCH_STEPS = 10000;
export const WYS_EPOCH_BYTES = 16 * 1024 * 1024;
export type WysAdmission =
  | { kind: "accepted"; state: EditorState; html: string; bodyChanged: boolean }
  | { kind: "rejected"; reason: string; epoch: boolean };

export class WysSession {
  private current: EditorState;
  private completeHtml: string;
  private steps = 0;
  private estimatedBytes = 0;
  private aliases = new Map<string, string>();
  private acknowledgementError = "";
  private readonly historyPlugin = history({ depth: 100 });
  constructor(
    readonly plan: Plan,
    private readonly plugins: readonly Plugin[] = [],
  ) {
    this.current = EditorState.create({
      doc: plan.doc,
      plugins: [this.historyPlugin, ...plugins],
    });
    this.completeHtml = plan.source;
  }
  get state() {
    return this.current;
  }
  get html() {
    return this.completeHtml;
  }
  get epoch() {
    return { steps: this.steps, estimatedBytes: this.estimatedBytes };
  }
  get acknowledgementNotice() {
    return this.acknowledgementError;
  }
  get acknowledgedMediaCount() {
    return this.aliases.size;
  }
  admit(transaction: Transaction, historyAction = false): WysAdmission {
    try {
      const candidate = this.current.applyTransaction(transaction);
      const changed = candidate.transactions.some((item) => item.docChanged);
      const html = changed
        ? rewriteAcknowledgedMedia(
            serialize(this.plan, candidate.state.doc),
            this.aliases,
          )
        : this.completeHtml;
      let steps = 0;
      let estimatedBytes = 0;
      if (changed && !historyAction) {
        for (const tr of candidate.transactions)
          for (let i = 0; i < tr.steps.length; i++) {
            const step = tr.steps[i];
            estimatedBytes += new TextEncoder().encode(
              JSON.stringify([step.toJSON(), step.invert(tr.docs[i]).toJSON()]),
            ).byteLength;
            steps++;
          }
        if (
          this.steps + steps > WYS_EPOCH_STEPS ||
          this.estimatedBytes + estimatedBytes > WYS_EPOCH_BYTES
        )
          return {
            kind: "rejected",
            epoch: true,
            reason:
              "この入力はまだ反映していません。取り消し履歴の作業上限です。最新本文を退避して履歴を整理するか、HTMLで続けてください。",
          };
      }
      const bodyChanged = html !== this.completeHtml;
      this.current = candidate.state;
      this.completeHtml = html;
      this.steps += steps;
      this.estimatedBytes += estimatedBytes;
      return { kind: "accepted", state: this.current, html, bodyChanged };
    } catch (error) {
      return {
        kind: "rejected",
        epoch: false,
        reason:
          error instanceof Error
            ? error.message
            : "入力を安全に反映できません。直前の本文を保持しました。",
      };
    }
  }
  acknowledge(acknowledgement: WysCanonicalAcknowledgement): boolean {
    this.acknowledgementError = "";
    if (this.completeHtml !== acknowledgement.submitted) return false;
    try {
      const aliases = new Map([
        ...this.aliases,
        ...acknowledgedMediaAliases(acknowledgement),
      ]);
      if (aliases.size > 10000)
        throw new Error(
          "この編集履歴のメディア置換上限です。最新本文を保持して再準備してください。",
        );
      if (
        rewriteAcknowledgedMedia(this.completeHtml, aliases) !==
        acknowledgement.canonical
      )
        return false;
      this.aliases = aliases;
      this.completeHtml = acknowledgement.canonical;
      return true;
    } catch (error) {
      this.acknowledgementError =
        error instanceof Error
          ? error.message
          : "保存応答のメディア置換を確認できません。本文は保持しています。";
      return false;
    }
  }
  history(
    direction: "undo" | "redo",
    accept: (result: WysAdmission) => void,
  ): boolean {
    const command: Command = direction === "undo" ? undo : redo;
    return command(this.current, (transaction) =>
      accept(this.admit(transaction, true)),
    );
  }
  resetHistory(recover: (html: string) => boolean): boolean {
    let aliases: Map<string, string>;
    try {
      const used = this.aliases.size
        ? mediaSources(serialize(this.plan, this.current.doc))
        : new Set<string>();
      aliases = new Map(
        [...this.aliases].filter(([source]) => used.has(source)),
      );
      if (!recover(this.completeHtml)) return false;
    } catch {
      return false;
    }
    const without = this.current.reconfigure({ plugins: [...this.plugins] });
    this.current = without.reconfigure({
      plugins: [this.historyPlugin, ...this.plugins],
    });
    this.steps = 0;
    this.estimatedBytes = 0;
    this.aliases = aliases;
    return true;
  }
}
