import type { EditorMode } from "./editorMode";

export type EditorModeRequest = Readonly<{
  target: EditorMode;
  signal: AbortSignal;
}>;

export function createEditorModeRequests() {
  let current: EditorModeRequest | undefined;
  let controller: AbortController | undefined;
  const cancel = () => {
    current = undefined;
    controller?.abort();
    controller = undefined;
  };
  return {
    cancel,
    begin(target: EditorMode): EditorModeRequest {
      cancel();
      controller = new AbortController();
      current = { target, signal: controller.signal };
      return current;
    },
    owns(request: EditorModeRequest): boolean {
      return current === request && !request.signal.aborted;
    },
  };
}
