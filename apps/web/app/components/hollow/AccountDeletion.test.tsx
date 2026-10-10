import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDeletion } from "./AccountDeletion";

type State = {
  status: "ready" | "error" | "unknown" | "accepted";
  message: string;
};
const fake = vi.hoisted(() => ({
  state: { status: "ready", message: "" } as State,
  confirmation: "",
  pending: false,
  actor: { id: "synthetic-account", epoch: 1 } as {
    id: string;
    epoch: number;
  } | null,
  action: null as ((previous: State, data: FormData) => Promise<State>) | null,
  deleteAccount: vi.fn(),
  onDeleted: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useId: () => "deletion",
  useState: () => [fake.confirmation, vi.fn()],
  useActionState: (action: typeof fake.action) => {
    fake.action = action;
    return [fake.state, action, fake.pending];
  },
}));
vi.mock("@tanstack/react-router", () => ({ Link: "a" }));
vi.mock("@/presentation/accountDeletionServerFn", () => ({
  deleteAccountFn: fake.deleteAccount,
}));
vi.mock("./useAuthenticationOperation", () => ({
  useAuthenticationOperation: () => () => {
    const expected = fake.actor;
    return () => fake.actor === expected;
  },
}));
type Props = {
  children?: ReactNode;
  disabled?: boolean;
  type?: string;
  role?: string;
  htmlFor?: string;
  id?: string;
  style?: Record<string, unknown>;
};
function nodes(node: ReactNode, type: string): Props[] {
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
  if (!isValidElement<Props>(node)) return [];
  return [
    ...(node.type === type ? [node.props] : []),
    ...nodes(node.props.children, type),
  ];
}
function words(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(words).join("");
  if (isValidElement<Props>(node)) return words(node.props.children);
  return typeof node === "string" ? node : "";
}
function render() {
  return AccountDeletion({
    email: "synthetic@example.invalid",
    actor: { id: "synthetic-account", epoch: 1 },
    currentActor: () => fake.actor,
    onDeleted: fake.onDeleted,
  });
}
function submit(email = "synthetic@example.invalid", previous = fake.state) {
  const data = new FormData();
  data.set("email", email);
  if (!fake.action) throw new Error("SYNTHETIC_MISSING_ACTION");
  return fake.action(previous, data);
}
beforeEach(() => {
  vi.clearAllMocks();
  fake.state = { status: "ready", message: "" };
  fake.confirmation = "";
  fake.pending = false;
  fake.actor = { id: "synthetic-account", epoch: 1 };
  fake.deleteAccount.mockResolvedValue({ status: "accepted" });
  fake.onDeleted.mockResolvedValue(undefined);
});
describe("account deletion explicit irreversible confirmation", () => {
  it("initially disables submission and explains recovery, retained workspace data and last owner", () => {
    const tree = render();
    expect(nodes(tree, "button")[0]?.disabled).toBe(true);
    expect(nodes(tree, "label")[0]?.htmlFor).toBe(nodes(tree, "input")[0]?.id);
    expect(words(tree)).toContain("取り消し・復元はできません");
    expect(words(tree)).toContain("ワークスペースへ移動したノートは残ります");
    expect(words(tree)).toContain("最後のオーナーは退会できません");
    expect(nodes(tree, "section")[0]?.style).toMatchObject({
      minWidth: 0,
      overflowWrap: "anywhere",
    });
  });
  it("matches canonical email locally and rejects mismatched and previous-actor actions", async () => {
    fake.confirmation = "SYNTHETIC@EXAMPLE.INVALID";
    expect(nodes(render(), "button")[0]?.disabled).toBe(false);
    expect((await submit("other@example.invalid")).status).toBe("error");
    fake.actor = { id: "other", epoch: 2 };
    expect((await submit()).status).toBe("error");
    expect(fake.deleteAccount).not.toHaveBeenCalled();
  });
  it("provides immediate pending feedback and a native disabled keyboard submission", () => {
    fake.pending = true;
    fake.confirmation = "synthetic@example.invalid";
    const tree = render();
    expect(nodes(tree, "input")[0]?.disabled).toBe(true);
    expect(nodes(tree, "button")[0]).toMatchObject({
      type: "submit",
      disabled: true,
    });
    expect(nodes(tree, "p").some((node) => node.role === "status")).toBe(true);
    expect(words(tree)).toContain("退会を受け付けています");
  });
  it("retains accepted state if sign-in navigation fails and prevents another request", async () => {
    render();
    fake.onDeleted.mockRejectedValueOnce(new Error("SYNTHETIC_NAVIGATION"));
    const state = await submit(" SYNTHETIC@EXAMPLE.INVALID ");
    expect(state.status).toBe("accepted");
    expect(fake.deleteAccount).toHaveBeenCalledWith({
      data: { email: "synthetic@example.invalid" },
    });
    await submit("synthetic@example.invalid", state);
    expect(fake.deleteAccount).toHaveBeenCalledOnce();
    expect(fake.onDeleted).toHaveBeenCalledOnce();
  });
  it("does not acknowledge or resend an ambiguous response", async () => {
    render();
    fake.deleteAccount.mockRejectedValueOnce(
      new Error("SYNTHETIC_RESPONSE_LOST"),
    );
    const state = await submit();
    expect(state.status).toBe("unknown");
    expect(state.message).toContain("ページを再読み込み");
    await submit("synthetic@example.invalid", state);
    expect(fake.deleteAccount).toHaveBeenCalledOnce();
    expect(fake.onDeleted).not.toHaveBeenCalled();
  });
  it("shows last-owner recovery without accepting deletion", async () => {
    render();
    fake.deleteAccount.mockRejectedValueOnce({
      serialized: {
        kind: "conflict",
        code: "WORKSPACE_LAST_OWNER",
        message: "synthetic",
      },
    });
    const state = await submit();
    expect(state.status).toBe("error");
    expect(state.message).toContain("別のメンバーをオーナーにする");
    expect(fake.onDeleted).not.toHaveBeenCalled();
  });
  it("discards late receipts after the actor changes", async () => {
    render();
    fake.deleteAccount.mockImplementationOnce(async () => {
      fake.actor = { id: "other", epoch: 2 };
      return { status: "accepted" };
    });
    await submit();
    expect(fake.onDeleted).not.toHaveBeenCalled();
  });
});
