export const SEARCH_BUDGET_MS = 3000;
export const SEARCH_CLOSE_MARGIN_MS = 100;
const NS_PER_MS = 1_000_000n;
const BUDGET_NS = BigInt(SEARCH_BUDGET_MS) * NS_PER_MS;

// The directly owned Node child shares this host/boot/clock namespace.
export const searchNow = (): bigint => process.hrtime.bigint();
export const searchDeadline = (): bigint => searchNow() + BUDGET_NS;
export const searchCanStart = (deadline: bigint): boolean =>
  searchNow() + BigInt(SEARCH_CLOSE_MARGIN_MS) * NS_PER_MS < deadline;
export const remainingSearchMs = (deadline: bigint): number =>
  Number(deadline - searchNow()) / Number(NS_PER_MS);

export function parseSearchDeadline(value: string | undefined): bigint | null {
  if (!value || !/^[0-9]{1,20}$/.test(value)) return null;
  const deadline = BigInt(value);
  const remaining = deadline - searchNow();
  return remaining > 0n && remaining <= BUDGET_NS ? deadline : null;
}
