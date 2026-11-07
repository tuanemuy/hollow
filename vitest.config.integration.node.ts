import { defineConfig } from "vitest/config";

const formats =
  "packages/core/src/adapters/libsql/__tests__/llmLocalFormats.integration.test.ts";
const nativeFormats =
  "packages/core/src/adapters/libsql/__tests__/llmLocalFormatsNative.integration.test.ts";
const base = {
  globals: true,
  environment: "node" as const,
  setupFiles: ["./tests/setup.ts"],
  // Server pages inline layout.css through `?raw`; keep its real text.
  css: { include: [/styles\/layout\.css/] },
};
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Native searches keep their production deadline while other files seed SQLite.
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: {
          ...base,
          name: "node",
          include: [
            "packages/core/src/adapters/libsql/__tests__/**/*.integration.test.ts",
            "packages/core/src/adapters/node/__tests__/**/*.integration.test.ts",
            "packages/core/src/adapters/node/regeneration/__tests__/**/*.integration.test.ts",
            "apps/web/app/worker/node/__tests__/**/*.integration.test.ts",
          ],
          exclude: [formats, nativeFormats],
        },
      },
      ...["app", "app-c", "native", "native-d", "native-e"].map((group) => ({
        extends: true as const,
        test: {
          ...base,
          name: `formats-${group}`,
          include: [group.startsWith("app") ? formats : nativeFormats],
          env: { HOLLOW_S4_GROUP: group },
        },
      })),
    ],
  },
});
