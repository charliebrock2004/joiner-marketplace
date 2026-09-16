import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Makes the app's module specifiers resolvable under plain node, so tests can
 * import the real source. Next's bundler handles both of these; node does not.
 *
 *  - the "@/..." path alias from tsconfig
 *  - extensionless relative imports ("./foo" -> "./foo.ts")
 */
const SRC = pathToFileURL(path.join(process.cwd(), "src") + path.sep).href;

function withExtension(url) {
  if (!url.startsWith("file://")) return url;
  // Ignore any ?query used to force a fresh module instance in tests.
  const [base, query] = url.split("?");
  if (/\.(ts|tsx|js|mjs|cjs|json|node)$/.test(base)) return url;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(new URL(candidate))) return query ? `${candidate}?${query}` : candidate;
  }
  return url;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(withExtension(SRC + specifier.slice(2)), context);
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file://")) {
      const resolved = new URL(specifier, context.parentURL).href;
      const fixed = withExtension(resolved);
      if (fixed !== resolved) return nextResolve(fixed, context);
    }
    return nextResolve(specifier, context);
  },
});
