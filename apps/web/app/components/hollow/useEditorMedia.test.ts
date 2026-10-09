import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorMedia } from "./useEditorMedia";

const fixture = vi.hoisted(() => ({
  create: vi.fn(),
  begin: vi.fn(),
  tasks: [] as Promise<unknown>[],
}));
vi.mock("react", () => ({
  useState: () => [[], vi.fn()],
  useRef: (current: unknown) => ({ current }),
  useEffect: vi.fn(),
  useTransition: () => [
    false,
    (run: () => Promise<unknown>) => {
      fixture.tasks.push(run());
    },
  ],
}));
vi.mock("@/presentation/hollowMedia", () => ({
  createMediaDraftFn: fixture.create,
  beginMediaUploadFn: fixture.begin,
}));
vi.mock("@/presentation/errorDisplay", () => ({ displayError: () => "error" }));
beforeEach(() => {
  fixture.create.mockReset();
  fixture.begin.mockReset();
  fixture.tasks = [];
});

describe("media scope handoff", () => {
  it("does not attach a late old-scope draft or start its upload after reset", async () => {
    let resolve: ((value: { id: string }) => void) | undefined;
    fixture.create.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const onDraft = vi.fn();
    const onInsert = vi.fn();
    const media = useEditorMedia({
      workspaceId: "old-scope",
      onDraft,
      onInsert,
    });
    media.add([new File(["png"], "image.png")], "説明");
    expect(media.hasUnresolved()).toBe(true);
    media.resetDraft();
    resolve?.({ id: "old-draft" });
    await Promise.all(fixture.tasks);
    expect(media.hasUnresolved()).toBe(false);
    expect(onDraft).not.toHaveBeenCalled();
    expect(fixture.begin).not.toHaveBeenCalled();
    expect(onInsert).not.toHaveBeenCalled();
  });
});
