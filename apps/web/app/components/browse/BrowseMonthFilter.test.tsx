import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowseMonthFilter } from "./BrowseMonthFilter";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [
      hooks.values[index],
      (value: unknown) => {
        hooks.values[index] = value;
      },
    ];
  },
}));
type Props = {
  children?: ReactNode;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onSubmit?: (event: { preventDefault(): void }) => void;
};
function findNode(tree: ReactNode, type: string): Props | null {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findNode(child, type);
      if (found) return found;
    }
  } else if (isValidElement<Props>(tree)) {
    if (tree.type === type) return tree.props;
    return findNode(tree.props.children, type);
  }
  return null;
}
function node(tree: ReactNode, type: string): Props {
  const found = findNode(tree, type);
  if (found) return found;
  throw new Error(`Missing ${type}`);
}
describe("month input admission", () => {
  beforeEach(() => {
    hooks.values = [];
    hooks.cursor = 0;
  });
  const apply = vi.fn();
  function render(month: string | undefined = undefined, context = "personal") {
    hooks.cursor = 0;
    return BrowseMonthFilter({ month, context, apply });
  }
  it("keeps intermediate native year input local until complete month submission", () => {
    apply.mockClear();
    node(render(), "input").onChange?.({ target: { value: "0002-02" } });
    expect(apply).not.toHaveBeenCalled();
    node(render(), "input").onChange?.({ target: { value: "2026-10" } });
    expect(apply).not.toHaveBeenCalled();
    const preventDefault = vi.fn();
    node(render(), "form").onSubmit?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledExactlyOnceWith("2026-10");
  });
  it("replaces an unsent draft when the URL month changes or clears", () => {
    node(render("2026-10"), "input").onChange?.({
      target: { value: "2027-01" },
    });
    render("2026-09");
    expect(node(render("2026-09"), "input").value).toBe("2026-09");
    render();
    expect(node(render(), "input").value).toBe("");
  });
  it("does not carry an unsent month into another scope", () => {
    node(render(undefined, "personal"), "input").onChange?.({
      target: { value: "2026-10" },
    });
    render(undefined, "workspace");
    expect(node(render(undefined, "workspace"), "input").value).toBe("");
  });
});
