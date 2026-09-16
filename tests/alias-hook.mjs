import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

/**
 * Resolves the "@/..." path alias from tsconfig when running tests under plain
 * node. Next's bundler understands the alias; node does not.
 */
const SRC = pathToFileURL(path.join(process.cwd(), "src") + path.sep).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(SRC + specifier.slice(2), context);
    }
    return nextResolve(specifier, context);
  },
});
