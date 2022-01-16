module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "node/no-unpublished-require": ["error", {"devDependencies": true}],
    "node/no-unsupported-features/es-syntax": [
      "error",
      { ignores: ["modules"] },
    ],
    "no-unused-vars": "off",
    indent: ["off"],
    "node/no-missing-import": [
      "error",
      {
        allowModules: [],
        resolvePaths: ["."],
        tryExtensions: [".js", ".ts"],
      },
    ],
  },
};
