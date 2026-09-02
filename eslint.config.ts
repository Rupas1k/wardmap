import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  {
    ignores: ["dist/**", "node_modules/**", "target/**", "wasm/pkg/**", "eslint.config.ts"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  prettier,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.ts", "vite.config.ts"],
        },
        tsconfigRootDir,
      },
    },
    rules: {
      curly: ["error", "all"],
      "no-undef": "off",
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        {
          blankLine: "always",
          prev: ["const", "let", "var"],
          next: ["for", "while", "do", "switch", "try"],
        },
        {
          blankLine: "always",
          prev: ["const", "let", "var"],
          next: "if",
        },
        {
          blankLine: "always",
          prev: "block-like",
          next: ["const", "let", "var", "for", "while", "do", "switch", "try"],
        },
        { blankLine: "always", prev: "expression", next: "if" },
      ],
    },
  },
);
