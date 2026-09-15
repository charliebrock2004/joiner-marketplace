import next from "eslint-config-next";

/**
 * eslint-config-next 16 ships a flat config array that already bundles the
 * core-web-vitals and TypeScript rule sets, so it is spread directly.
 */
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...next,
];

export default config;
