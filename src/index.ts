import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";
import { rule, ruleName } from "./esLintPlugin/esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";
import recommendedLegacy from "./configs/recommended-legacy";

import * as parserBase from "@typescript-eslint/parser";

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../package.json") as typeof import("../package.json");

const parser: FlatConfig.Parser = {
  meta: parserBase.meta,
  parseForESLint: parserBase.parseForESLint,
};

const plugin = {
  meta: { name, version },
  rules: { [ruleName]: rule },
  configs: {
    flatConfigRecommended: {
      files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mts", "**/*.mjs", "**/*.cjs"],
      languageOptions: {
        parser,
        sourceType: "module",
        parserOptions: { projectService: true },
      },
      plugins: { "export-scope": undefined as unknown as FlatConfig.Plugin },
      rules: { "export-scope/no-imports-outside-export-scope": "error" },
    },
    recommended: recommendedLegacy as unknown as FlatConfig.Config,
  },
} satisfies FlatConfig.Plugin;

plugin.configs.flatConfigRecommended.plugins["export-scope"] = plugin;

const pluginForManualConfigs = { plugin };

const combinedEslintTsPlugin = Object.assign(tsLanguageServicePlugin, plugin, pluginForManualConfigs);

export default combinedEslintTsPlugin as typeof plugin & typeof pluginForManualConfigs;
module.exports = combinedEslintTsPlugin as typeof plugin & typeof pluginForManualConfigs;
