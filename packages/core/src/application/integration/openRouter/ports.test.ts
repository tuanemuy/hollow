import { describe, expect, it } from "vitest";
import { isOpenRouterProviderError, OpenRouterProviderError } from "./ports";

const separateBrand = Symbol.for("hollow.openrouter-provider-error.v1");

describe("OpenRouter provider error across bundle boundaries", () => {
  it.each([
    "OPENROUTER_UNAVAILABLE",
    "OPENROUTER_CREDENTIAL_INVALID",
    "OPENROUTER_PROVIDER_REJECTED",
  ] as const)("accepts only the dedicated branded Error for %s", (code) => {
    class SeparateBundleError extends Error {
      readonly [separateBrand] = true;
      constructor(readonly code: string) {
        super("safe");
      }
    }
    expect(isOpenRouterProviderError(new OpenRouterProviderError(code))).toBe(
      true,
    );
    const separate = new SeparateBundleError(code);
    expect(separate instanceof OpenRouterProviderError).toBe(false);
    expect(isOpenRouterProviderError(separate)).toBe(true);
    expect(
      isOpenRouterProviderError(
        Object.assign(new Error("safe"), {
          name: "OpenRouterProviderError",
          code,
        }),
      ),
    ).toBe(false);
    expect(
      isOpenRouterProviderError({
        [Symbol.for("hollow.openrouter-provider-error.v1")]: true,
        code,
      }),
    ).toBe(false);
    expect(isOpenRouterProviderError(new SeparateBundleError("UNKNOWN"))).toBe(
      false,
    );
  });
});
