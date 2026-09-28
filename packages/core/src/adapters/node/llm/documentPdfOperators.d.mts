export function classifyOperators(
  operators: {
    fnArray: readonly number[];
    argsArray: readonly (readonly unknown[])[];
  },
  ops: Readonly<Record<string, number>>,
  view: readonly number[],
  allow: ReadonlySet<string>,
): { visual: boolean; unknown: boolean; backgrounds: number; clips: number };
export function pageRectangle(args: unknown, view: readonly number[]): boolean;
