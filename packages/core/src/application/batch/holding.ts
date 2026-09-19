import { BusinessRuleError } from "../../domain/error";
import { moveAmounts } from "../move/expected";
import type { BundleHolding, MoveExpected } from "../move/ports";
import { sameMoveScope } from "../move/usecases";
import type { BatchHeader, MoveReceipt } from "./ports";

export const batchChanged = () =>
  new BusinessRuleError(
    "BATCH_CHANGED",
    "対象や処理条件が変わりました。最新の影響を確認し直してください。",
  );
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function deriveHolding(
  expected: MoveExpected,
  parent: BatchHeader,
  base: number,
  receipts: readonly MoveReceipt[],
): MoveExpected {
  if (
    base < parent.prunedThrough ||
    base > parent.lastSequence ||
    receipts.length !== parent.lastSequence - base
  )
    throw batchChanged();
  let bundle = expected.bundle;
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    if (!r || r.parentId !== parent.id || r.sequence !== base + i + 1)
      throw batchChanged();
    if (!bundle || r.bundleId !== bundle.id) continue;
    if (
      !sameMoveScope(r.source, expected.source.owner) ||
      !sameMoveScope(r.destination, expected.destination.owner) ||
      !equal(bundle, r.before)
    )
      throw batchChanged();
    if (
      r.after.id !== bundle.id ||
      r.after.contentRevision !== bundle.contentRevision ||
      r.after.bytes !== bundle.bytes
    )
      throw batchChanged();
    bundle = r.after;
  }
  return { ...expected, bundle, ...moveAmounts(expected.resources, bundle) };
}
function virtualChange(h: BundleHolding, change: number): BundleHolding {
  if (h.kind === "absent") {
    if (change < 0) throw batchChanged();
    return {
      kind: "present",
      revision: 0,
      noteHolds: change,
      admissionHolds: 0,
      cleanupHolds: 0,
    };
  }
  if (h.noteHolds + change < 0) throw batchChanged();
  return { ...h, noteHolds: h.noteHolds + change };
}
export function aggregateMoveAmounts(expected: readonly MoveExpected[]) {
  const initial = new Map<string, NonNullable<MoveExpected["bundle"]>>();
  const current = new Map<string, NonNullable<MoveExpected["bundle"]>>();
  let sourceRelease = 0;
  let destinationIncrease = 0;
  for (const e of expected) {
    let bundle = e.bundle;
    if (bundle) {
      const prior = initial.get(bundle.id);
      if (prior && !equal(prior, bundle)) throw batchChanged();
      initial.set(bundle.id, bundle);
      bundle = current.get(bundle.id) ?? bundle;
    }
    const amount = moveAmounts(e.resources, bundle);
    sourceRelease += amount.sourceRelease;
    destinationIncrease += amount.destinationIncrease;
    if (
      !Number.isSafeInteger(sourceRelease) ||
      !Number.isSafeInteger(destinationIncrease)
    )
      throw batchChanged();
    if (bundle)
      current.set(bundle.id, {
        ...bundle,
        source: virtualChange(bundle.source, -1),
        destination: virtualChange(bundle.destination, 1),
      });
  }
  return { sourceRelease, destinationIncrease };
}
