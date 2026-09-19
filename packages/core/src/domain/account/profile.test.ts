import { describe, expect, it } from "vitest";
import { profileBio, publicHandle } from "./profile";

describe("public profile fields", () => {
  it("normalizes only ASCII case and permits specified handle shapes", () => {
    expect(publicHandle(" Ichiro-Y ")).toBe("ichiro-y");
    expect(publicHandle("ichiro26")).toBe("ichiro26");
    expect(publicHandle("yamada-ichiro")).toBe("yamada-ichiro");
    expect(publicHandle(" ")).toBeNull();
    expect(publicHandle("a".repeat(63))).toHaveLength(63);
  });
  it.each([
    "ab",
    "a".repeat(64),
    "-abc",
    "abc-",
    "あいう",
    "ＡＢＣ",
    "a_b",
    "api",
    "settings",
    "LOGIN",
  ])("rejects invalid/reserved handle %s", (value) =>
    expect(() => publicHandle(value)).toThrow());
  it("counts bio code points, permits newline and rejects interior controls", () => {
    expect(profileBio(" 🐈\n自己紹介 ")).toBe("🐈\n自己紹介");
    expect(Array.from(profileBio("🐈".repeat(300)))).toHaveLength(300);
    expect(() => profileBio("🐈".repeat(301))).toThrow();
    expect(() => profileBio("a\0b")).toThrow();
  });
});
