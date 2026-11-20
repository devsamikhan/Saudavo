import { createBaseEslintConfig } from "@saudavo/config/eslint.base.mjs";

export default [
  ...createBaseEslintConfig(),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**"
    ]
  }
];
