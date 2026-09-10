export type DisplayStyle = "default" | "original";
export type DisplayReason =
  | "blank"
  | "import"
  | "interrupted"
  | "user"
  | "legacy";
export type NoteDisplay =
  | Readonly<{
      style: DisplayStyle;
      source: "automatic" | "user" | "legacy";
      initialization: Readonly<{ kind: "complete"; reason: DisplayReason }>;
    }>
  | Readonly<{
      style: "default";
      source: "automatic";
      initialization:
        | Readonly<{ kind: "conversion"; jobId: string }>
        | Readonly<{ kind: "reference"; jobId: string; decorated: boolean }>;
    }>;

export function automaticDisplay(
  decorated: boolean,
  reason: "blank" | "import" | "interrupted" = "import",
): NoteDisplay {
  return {
    style: decorated ? "original" : "default",
    source: "automatic",
    initialization: { kind: "complete", reason },
  };
}

export function interruptDisplay(display: NoteDisplay): NoteDisplay {
  return display.initialization.kind === "complete"
    ? display
    : automaticDisplay(
        display.initialization.kind === "reference" &&
          display.initialization.decorated,
        "interrupted",
      );
}

export function completeDisplay(
  display: NoteDisplay,
  kind: "conversion" | "reference",
  jobId: string,
  decorated: boolean,
): NoteDisplay {
  return display.initialization.kind === kind &&
    display.initialization.jobId === jobId
    ? automaticDisplay(decorated)
    : display;
}
