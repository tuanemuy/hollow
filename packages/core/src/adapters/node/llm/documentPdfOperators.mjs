const near = (a, b) => Math.abs(a - b) <= 0.05;
function pageRectangle(data, view) {
  if (!Array.isArray(data) || data.length !== 1 || !ArrayBuffer.isView(data[0]))
    return false;
  const a = Array.from(data[0]);
  const points = [];
  let p = 0;
  while (p < a.length) {
    const op = a[p++];
    if (op === 4) {
      if (p !== a.length) return false;
      break;
    }
    if (
      (op !== 0 && op !== 1) ||
      !Number.isFinite(a[p]) ||
      !Number.isFinite(a[p + 1])
    )
      return false;
    if ((points.length === 0) !== (op === 0)) return false;
    points.push([a[p++], a[p++]]);
  }
  if (a[a.length - 1] !== 4) return false;
  if (
    points.length === 5 &&
    near(points[0][0], points[4][0]) &&
    near(points[0][1], points[4][1])
  )
    points.pop();
  if (points.length !== 4) return false;
  const corners = [
    [view[0], view[1]],
    [view[2], view[1]],
    [view[2], view[3]],
    [view[0], view[3]],
  ];
  const ids = points.map((q) =>
    corners.findIndex((c) => near(c[0], q[0]) && near(c[1], q[1])),
  );
  return (
    new Set(ids).size === 4 &&
    !ids.includes(-1) &&
    ids.every((n, i) => [1, 3].includes((ids[(i + 1) % 4] - n + 4) % 4))
  );
}
function classifyOperators(op, OPS, view, allow) {
  const names = new Map(Object.entries(OPS).map(([k, v]) => [v, k]));
  let white = false;
  let identity = true;
  let pendingClip = false;
  let textSeen = false;
  let backgrounds = 0;
  let clips = 0;
  const stack = [];
  let visual = false;
  let unknown = false;
  for (let i = 0; i < op.fnArray.length; i++) {
    const name = names.get(op.fnArray[i]) ?? "unknown";
    const args = op.argsArray[i] ?? [];
    if (name === "save") {
      stack.push({ white, identity });
      continue;
    }
    if (name === "restore") {
      const state = stack.pop();
      if (!state) {
        unknown = true;
        continue;
      }
      white = state.white;
      identity = state.identity;
      continue;
    }
    if (name === "transform") {
      if (args.length !== 6 || args.some((n, j) => n !== [1, 0, 0, 1, 0, 0][j]))
        identity = false;
      continue;
    }
    if (name === "setFillRGBColor") {
      white =
        (args.length === 1 && String(args[0]).toLowerCase() === "#ffffff") ||
        (args.length === 3 && args.every((n) => n === 255));
      continue;
    }
    if (name === "setFillGray") {
      white = args.length === 1 && args[0] === 1;
      continue;
    }
    if (["setFillColorSpace", "setFillColor"].includes(name)) {
      white = false;
      continue;
    }
    if (
      [
        "showText",
        "showSpacedText",
        "nextLineShowText",
        "nextLineSetSpacingShowText",
      ].includes(name)
    )
      textSeen = true;
    if (name === "clip" || name === "eoClip") {
      if (pendingClip) unknown = true;
      pendingClip = true;
      continue;
    }
    if (name === "constructPath") {
      const paint = names.get(args[0]);
      const rectangle = identity && pageRectangle(args[1], view);
      if (paint === "endPath" && pendingClip && rectangle) {
        clips++;
        pendingClip = false;
        continue;
      }
      if (
        (paint === "fill" || paint === "eoFill") &&
        !pendingClip &&
        rectangle &&
        white &&
        !textSeen
      ) {
        backgrounds++;
        continue;
      }
      visual = true;
      pendingClip = false;
      continue;
    }
    if (["beginMarkedContent", "beginMarkedContentProps"].includes(name)) {
      if (args[0] === "OC") unknown = true;
      continue;
    }
    if (["endMarkedContent", "setLineWidth"].includes(name)) continue;
    if (/image|paint|path|stroke|fill/i.test(name) && !allow.has(name))
      visual = true;
    else if (!allow.has(name)) unknown = true;
  }
  if (pendingClip || stack.length) unknown = true;
  return { visual, unknown, backgrounds, clips };
}

export { classifyOperators, pageRectangle };
