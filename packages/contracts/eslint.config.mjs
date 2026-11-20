import { createBaseEslintConfig } from "@saudavo/config/eslint.base.mjs";

export default [
  ...createBaseEslintConfig(),
  {
    ignores: ["dist/**", "node_modules/**"]
  }
];
