export type HtmlDiagnostic = Readonly<{
  code: string;
  line: number;
  column: number;
  offset: number;
}>;
export type ProjectedNode =
  | Readonly<{ type: 3; value: string; ids: readonly string[] }>
  | Readonly<{ type: 8; value: string }>
  | Readonly<{
      type: 1 | 9;
      name: string | null;
      namespace: string | null;
      attrs: readonly (readonly [string, string, string])[];
      children: readonly ProjectedNode[];
    }>;
export type EditableText = Readonly<{
  id: string;
  value: string;
  prefix: string;
  start: number;
  end: number;
}>;
export type VisualProjection = Readonly<{
  generation: string;
  expected: ProjectedNode;
  texts: readonly EditableText[];
  issues: readonly string[];
}>;
export type VisualSource = Readonly<{
  generation: string;
  canonical: string;
  rendered: string;
  document: string;
}>;
export type TextPatch = Readonly<{ id: string; before: string; after: string }>;
export interface HtmlEditorAnalyzer {
  diagnose(
    source: string,
    signal?: AbortSignal,
  ): Promise<readonly HtmlDiagnostic[]>;
  project(
    source: VisualSource,
    signal?: AbortSignal,
  ): Promise<VisualProjection>;
  patch(
    generation: string,
    patches: readonly TextPatch[],
    signal?: AbortSignal,
  ): Promise<string>;
  dispose(): void;
}
