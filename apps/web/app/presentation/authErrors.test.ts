import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { appServerErrorAdapter } from "./appServerErrorAdapter";
import { displayError } from "./errorDisplay";
import {
  AppServerError,
  extractSerializedError,
  isAppServerError,
} from "./errorResponse";

describe("auth error transport across module graphs", () => {
  it("recognizes and roundtrips a foreign AppServerError without constructor identity", () => {
    const foreign: unknown =
      runInNewContext(`new (class AppServerError extends Error {
      name = 'AppServerError';
      serialized = {kind:'unauthorized', code:'EMAIL_UNVERIFIED', message:'private implementation message'};
    })()`);
    expect(foreign).not.toBeInstanceOf(AppServerError);
    expect(appServerErrorAdapter.test(foreign)).toBe(true);
    if (!isAppServerError(foreign))
      throw new Error("Missing structural identity");
    const restored = appServerErrorAdapter.fromSerializable(
      appServerErrorAdapter.toSerializable(foreign),
    );
    expect(extractSerializedError(restored).code).toBe("EMAIL_UNVERIFIED");
    expect(displayError(restored)).toContain("確認メールを再送");
    expect(displayError(restored)).not.toContain("private");
  });

  it.each([
    null,
    {},
    new Error("secret"),
    {
      name: "AppServerError",
      serialized: { kind: "unauthorized", message: "secret" },
    },
  ])("rejects malformed error wrappers", (value) => {
    expect(isAppServerError(value)).toBe(false);
  });

  it.each([
    "system",
    "unknown",
  ] as const)("redacts %s even when adapter receives unredacted input", (kind) => {
    const wire = appServerErrorAdapter.toSerializable(
      new AppServerError({
        kind,
        code: "DB_SECRET",
        message: "private database path",
      }),
    );
    expect(wire).toEqual({ kind, code: null, message: "System error" });
    expect(
      displayError(appServerErrorAdapter.fromSerializable(wire)),
    ).not.toContain("private");
  });

  it.each([
    ["unauthorized", "EMAIL_UNVERIFIED", "確認メールを再送"],
    ["unauthorized", "INVALID_CREDENTIALS", "メールアドレスまたはパスワード"],
    ["unauthorized", "SIGNIN_WAIT", "少し待って"],
    ["unauthorized", "SIGNIN_LOCKED", "15 分後"],
    ["forbidden", "VERIFICATION_USED", "確認が完了"],
    ["forbidden", "VERIFICATION_EXPIRED", "有効期限"],
    ["forbidden", "VERIFICATION_INVALID", "無効"],
    ["forbidden", "MAIL_RATE_LIMITED", "1 分以上"],
  ] as const)("maps %s/%s using public copy", (kind, code, expected) => {
    expect(
      displayError(new AppServerError({ kind, code, message: "private" })),
    ).toContain(expected);
    expect(
      displayError(new AppServerError({ kind, code, message: "private" })),
    ).not.toContain("private");
  });

  it("does not expose unknown authentication messages", () => {
    expect(
      displayError(
        new AppServerError({
          kind: "unauthorized",
          code: "INTERNAL_AUTH_FAILURE",
          message: "private",
        }),
      ),
    ).toBe("認証が必要です");
  });
});
