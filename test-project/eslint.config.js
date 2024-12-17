// @ts-check

import tseslint from "typescript-eslint";
import exportScope from "eslint-plugin-export-scope";

export default tseslint.config(exportScope.configs.flatConfigRecommended);
