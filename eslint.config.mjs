import globals from "globals";
import js from "@eslint/js";
import vitest from "eslint-plugin-vitest";
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * @type {import("eslint").Linter.Config}
 */
export default [
  {
    "ignores": [".git/", ".github/", ".husky/", ".scannerwork/", ".vscode/", "coverage/", "node_modules/"],
    "name": "Files to ignore"
  },
  {
    ...eslintConfigPrettier,
    "name": "Prettier"
  },
  {
    ...js.configs.recommended,
    "files": ["**/*.{js,cjs,mjs}"],
    "languageOptions": {
      "ecmaVersion": 2023
    },
    "name": "JavaScript files",
    "rules": {
      ...js.configs.recommended.rules,
      "no-var": "error",
      "no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "_.*"
        }
      ]
    }
  },
  {
    "files": ["**/*.mjs"],
    "languageOptions": {
      "sourceType": "module"
    },
    "name": "JavaScript modules"
  },
  {
    "files": ["**/*.{js,cjs,mjs}"],
    "languageOptions": {
      "globals": {
        ...globals.node
      }
    },
    "name": "Node.js files"
  },
  {
    ...vitest.configs.recommended,
    "files": ["test/**/*{spec,test,integration-test}.{js,cjs,mjs}", "test/mocks/vitest-mocks.js"],
    "languageOptions": {
      "globals": {
        ...vitest.environments.env.globals
      }
    },
    "name": "Test files",
    "rules": {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": "off"
    }
  }
];
