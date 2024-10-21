import globals from "globals";
import js from "@eslint/js";
import jest from "eslint-plugin-jest";
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
    ...jest.configs["flat/recommended"],
    "files": ["test/**/*{spec,test}.{js,cjs,mjs}", "test/mocks/jest-mocks.js"],
    "languageOptions": {
      "globals": {
        ...globals.jest
      }
    },
    "name": "Test files",
    "rules": {
      ...jest.configs["flat/recommended"].rules,
      "jest/prefer-expect-assertions": "off",
      "jest/expect-expect": "off"
    }
  }
];
