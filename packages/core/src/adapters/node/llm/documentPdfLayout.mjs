/** @typedef {{str:string,dir:string,transform:number[],width:number,height:number}} TextItem */
/** @typedef {'INVALID_METRICS'|'DIRECTION_OR_ROTATION'|'AMBIGUOUS_SPACING'|'OUTSIDE_PAGE'|'OVERLAPPING_RUNS'|'ROW_GAP'|'VERTICAL_ORDER'|'OVERLAPPING_LINES'|'MULTIPLE_ANCHORS'|'WHITESPACE_ONLY'} LayoutReason */
/** @typedef {{kind:'empty',items:0}|{kind:'single-column',policy:'left-column-v1',items:number,lines:number}|{kind:'indeterminate',reason:LayoutReason,items:number}} Layout */
/** The tolerances define a deliberately narrow geometry policy, not a PDF reading-order inference. */
const POLICY = Object.freeze({
  baselineEm: 0.05,
  overlapEm: 0.05,
  fragmentGapEm: 0.5,
  leftAnchorEm: 0.5,
  lineAdvanceEm: 1,
  spaceWidthEm: 1,
});
/** @param {readonly TextItem[]} items @param {readonly number[]} view @returns {Layout} */
function classifyLayout(items, view) {
  const reject = (reason) => ({
    kind: "indeterminate",
    reason,
    items: items.length,
  });
  if (
    view.length !== 4 ||
    !view.every(Number.isFinite) ||
    view[2] <= view[0] ||
    view[3] <= view[1]
  )
    return reject("INVALID_METRICS");
  if (items.length === 0) return { kind: "empty", items: 0 };
  let line = null;
  let anchor = null;
  let anchorEm = null;
  let lines = 0;
  let visible = 0;
  let previousSpace = false;
  for (const item of items) {
    if (
      typeof item.str !== "string" ||
      Array.from(item.str).some((c) => {
        const n = c.codePointAt(0);
        return n <= 8 || (n >= 11 && n <= 31) || n === 65533;
      })
    )
      return reject("INVALID_METRICS");
    const space = !item.str.trim();
    if (!space) visible++;
    const m = item.transform;
    if (
      !Array.isArray(m) ||
      m.length !== 6 ||
      !m.every(Number.isFinite) ||
      !Number.isFinite(item.width) ||
      !Number.isFinite(item.height) ||
      item.width <= 0 ||
      item.height < 0 ||
      (!space && item.height === 0)
    )
      return reject("INVALID_METRICS");
    if (
      item.dir !== "ltr" ||
      m[0] <= 0 ||
      m[3] <= 0 ||
      Math.abs(m[1]) > 0.001 ||
      Math.abs(m[2]) > 0.001
    )
      return reject("DIRECTION_OR_ROTATION");
    const em = Math.max(Math.abs(m[0]), Math.abs(m[3]), item.height);
    const x = m[4];
    const y = m[5];
    const right = x + item.width;
    if (
      space &&
      (previousSpace ||
        item.str !== " " ||
        item.width > em * POLICY.spaceWidthEm)
    )
      return reject("AMBIGUOUS_SPACING");
    if (
      /\s{2,}|\t|[\u2000-\u200a\u3000]/u.test(item.str) ||
      item.width > Array.from(item.str).length * em * 1.5
    )
      return reject("AMBIGUOUS_SPACING");
    if (
      x < view[0] - 0.05 ||
      right > view[2] + 0.05 ||
      y < view[1] - 0.05 ||
      y + item.height > view[3] + 0.05
    )
      return reject("OUTSIDE_PAGE");
    if (!line) {
      if (space) return reject("WHITESPACE_ONLY");
      anchor = x;
      anchorEm = em;
      line = { x, y, right, em };
      lines++;
      continue;
    }
    const scale = Math.min(line.em, em);
    const dy = line.y - y;
    if (Math.abs(dy) <= POLICY.baselineEm * scale) {
      const gap = x - line.right;
      if (gap < -POLICY.overlapEm * scale) return reject("OVERLAPPING_RUNS");
      if (
        gap >
        (space || previousSpace ? POLICY.overlapEm : POLICY.fragmentGapEm) *
          scale
      )
        return reject("ROW_GAP");
      line.right = Math.max(line.right, right);
      line.em = Math.max(line.em, em);
      previousSpace = space;
      continue;
    }
    if (dy < 0) return reject("VERTICAL_ORDER");
    if (space) return reject("AMBIGUOUS_SPACING");
    if (dy < POLICY.lineAdvanceEm * Math.max(line.em, em))
      return reject("OVERLAPPING_LINES");
    if (Math.abs(x - anchor) > POLICY.leftAnchorEm * Math.min(anchorEm, em))
      return reject("MULTIPLE_ANCHORS");
    line = { x, y, right, em };
    previousSpace = false;
    lines++;
  }
  return visible
    ? {
        kind: "single-column",
        policy: "left-column-v1",
        items: items.length,
        lines,
      }
    : reject("WHITESPACE_ONLY");
}

export { classifyLayout, POLICY };
