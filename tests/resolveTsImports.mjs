import { registerHooks } from "node:module";
import path from "node:path";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error?.code !== "ERR_MODULE_NOT_FOUND" ||
        !specifier.startsWith(".") ||
        path.extname(specifier) ||
        !context.parentURL?.startsWith("file:")
      )
        throw error;
      return nextResolve(
        new URL(`${specifier}.ts`, context.parentURL).href,
        context,
      );
    }
  },
});
