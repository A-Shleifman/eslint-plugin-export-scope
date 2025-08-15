module.exports = {
  root: true,
  extends: ["plugin:@typescript-eslint/eslint-recommended", "plugin:export-scope/recommended"],
  parserOptions: { projectService: true, tsconfigRootDir: __dirname },
  overrides: [
    {
      files: ["**/.scope.*", "**/.scope.default.*"],
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
    },
    {
      files: [".eslintrc.{js,cjs}"],
      env: { node: true },
      parserOptions: { sourceType: "script" },
    },
  ],
};
