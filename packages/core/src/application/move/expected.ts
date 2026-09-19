import type { BundleHolding, MoveExpected, MoveResources } from "./ports";

export const holdingActive = (h: BundleHolding) =>
  h.kind === "present" && h.noteHolds + h.admissionHolds + h.cleanupHolds > 0;

export function moveAmounts(
  resources: MoveResources,
  bundle: MoveExpected["bundle"],
) {
  const unique = Object.values(resources).reduce(
    (sum, value) => sum + value.bytes,
    0,
  );
  const releases =
    bundle?.source.kind === "present" &&
    bundle.source.noteHolds === 1 &&
    bundle.source.admissionHolds === 0 &&
    bundle.source.cleanupHolds === 0;
  return {
    sourceRelease: unique + (releases && bundle ? bundle.bytes : 0),
    destinationIncrease:
      unique +
      (bundle && !holdingActive(bundle.destination) ? bundle.bytes : 0),
  };
}
