import tseslint from "typescript-eslint";
// eslint-disable-next-line export-scope/no-imports-outside-export-scope
import exportScope from "eslint-plugin-export-scope";

export default tseslint.config(exportScope.configs.recommended, {
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
