export interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
}
export type Layout =
  | { kind: "empty"; items: 0 }
  | {
      kind: "single-column";
      policy: "left-column-v1";
      items: number;
      lines: number;
    }
  | {
      kind: "indeterminate";
      reason:
        | "INVALID_METRICS"
        | "DIRECTION_OR_ROTATION"
        | "AMBIGUOUS_SPACING"
        | "OUTSIDE_PAGE"
        | "OVERLAPPING_RUNS"
        | "ROW_GAP"
        | "VERTICAL_ORDER"
        | "OVERLAPPING_LINES"
        | "MULTIPLE_ANCHORS"
        | "WHITESPACE_ONLY";
      items: number;
    };
export const POLICY: Readonly<{
  baselineEm: 0.05;
  overlapEm: 0.05;
  fragmentGapEm: 0.5;
  leftAnchorEm: 0.5;
  lineAdvanceEm: 1;
  spaceWidthEm: 1;
}>;
export function classifyLayout(
  items: readonly TextItem[],
  view: readonly number[],
): Layout;
