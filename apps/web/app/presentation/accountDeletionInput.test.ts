import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountDeletionSchema } from "./accountDeletionInput";

const fake = vi.hoisted(() => ({
  methods: [] as string[],
  context: vi.fn(),
  removeSession: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: ({ method }: { method: string }) => {
    fake.methods.push(method);
    let validate = (value: unknown) => value;
    const chain = {
      middleware: () => chain,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return chain;
      },
      handler:
        (fn: (input: { data: unknown }) => unknown) =>
        async (input: { data: unknown }) =>
          fn({ data: validate(input.data) }),
    };
    return chain;
  },
}));
vi.mock("./errorResponseMiddleware", () => ({ errorResponseMiddleware: {} }));
vi.mock("./hollowServer", () => ({
  hollowContext: fake.context,
  removeSession: fake.removeSession,
}));
vi.mock("@repo/core/application/account/deletion", () => ({
  deleteAccount: fake.deleteAccount,
}));

import { deleteAccountFn } from "./accountDeletionServerFn";

beforeEach(() => {
  vi.clearAllMocks();
  fake.context.mockResolvedValue({ container: {}, token: "synthetic-session" });
  fake.deleteAccount.mockResolvedValue({ status: "accepted" });
});
describe("account deletion transport", () => {
  it("uses the domain canonical email and accepts no caller identity or credentials", () => {
    expect(
      accountDeletionSchema.parse({ email: " SYNTHETIC@EXAMPLE.INVALID " }),
    ).toEqual({ email: "synthetic@example.invalid" });
    for (const input of [
      { email: "invalid" },
      { email: "a".repeat(255) },
      { email: null },
      { email: "synthetic@example.invalid", accountId: "other" },
      { email: "synthetic@example.invalid", sessionToken: "other" },
      { email: "synthetic@example.invalid", password: "secret" },
    ])
      expect(accountDeletionSchema.safeParse(input).success).toBe(false);
  });
  it("clears the session cookie only after an authenticated explicit POST is accepted", async () => {
    expect(fake.methods).toEqual(["POST"]);
    await expect(
      deleteAccountFn({ data: { email: "SYNTHETIC@EXAMPLE.INVALID" } }),
    ).resolves.toEqual({ status: "accepted" });
    expect(fake.context).toHaveBeenCalledWith(true);
    expect(fake.deleteAccount).toHaveBeenCalledWith({}, "synthetic-session", {
      email: "synthetic@example.invalid",
    });
    expect(fake.removeSession).toHaveBeenCalledOnce();
    expect(fake.deleteAccount.mock.invocationCallOrder[0]).toBeLessThan(
      fake.removeSession.mock.invocationCallOrder[0] ?? 0,
    );
  });
  it("preserves the cookie on rejected or ambiguous deletion responses", async () => {
    fake.deleteAccount.mockRejectedValueOnce(
      new Error("SYNTHETIC_RESPONSE_LOST"),
    );
    await expect(
      deleteAccountFn({ data: { email: "synthetic@example.invalid" } }),
    ).rejects.toThrow("SYNTHETIC_RESPONSE_LOST");
    expect(fake.removeSession).not.toHaveBeenCalled();
  });
});
