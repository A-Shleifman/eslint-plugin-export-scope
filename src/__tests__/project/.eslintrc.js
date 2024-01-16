module.exports = {
  root: true,
  ignorePatterns: ["!.scope.ts", ".eslintrc.js", "node_modules"],
  overrides: [
    {
      files: ["*.js", "*.mjs", "*.jsx", "*.ts", "*.mts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: { project: true, tsconfigRootDir: __dirname },
      plugins: ["export-scope"],
      rules: { "export-scope/no-imports-outside-export-scope": "error" },
    },
  ],
};
