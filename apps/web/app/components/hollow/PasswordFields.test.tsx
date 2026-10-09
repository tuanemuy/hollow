import { assertPassword } from "@repo/core/domain/account/entity";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasswordFields, passwordFieldErrors } from "./PasswordFields";

describe("password input and domain agreement", () => {
  it.each([
    "signup",
    "add",
    "change",
    "reset",
  ])("%s accepts UTF-16 boundary passwords without a Unicode pattern conflict", (prefix) => {
    const html = renderToStaticMarkup(
      <PasswordFields prefix={prefix} disabled={false} />,
    );
    const pattern = /pattern="([^"]+)"/.exec(html)?.[1];
    expect(pattern).toBeDefined();
    expect(html).toContain('minLength="12"');
    expect(html).toContain('maxLength="128"');
    for (const password of ["abcdef😀😀😀", `a${"😀".repeat(63)}1`]) {
      expect(() => assertPassword(password)).not.toThrow();
      expect(passwordFieldErrors(password, password)).toEqual({
        password: "",
        confirmation: "",
      });
      expect(new RegExp(`^(?:${pattern})$`, "v").test(password)).toBe(true);
    }
  });

  it.each([
    "abcde😀😀😀",
    `a${"😀".repeat(64)}`,
    "abcdefghijkl",
  ])("keeps the domain strength rejection for %s", (password) => {
    expect(() => assertPassword(password)).toThrow();
    expect(passwordFieldErrors(password, password).password).not.toBe("");
  });

  it("keeps confirmation errors local for valid Unicode passwords", () => {
    expect(passwordFieldErrors("abcdef😀😀😀", "abcdef😀😀😁")).toEqual({
      password: "",
      confirmation: "パスワードが一致しません。",
    });
  });
});
