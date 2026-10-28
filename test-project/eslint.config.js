import { defineConfig } from "eslint/config";
// eslint-disable-next-line export-scope/no-imports-outside-export-scope
import exportScope from "eslint-plugin-export-scope";

export default defineConfig(exportScope.configs.flatConfigRecommended);
