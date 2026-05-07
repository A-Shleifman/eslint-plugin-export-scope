import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";
import { rule, ruleName } from "./esLintPlugin/esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";
import recommendedLegacy from "./configs/recommended-legacy";

import * as parserBase from "@typescript-eslint/parser";
import { exportScopeProcessor } from "./esLintPlugin/processor";

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
  processors: { "export-scope": exportScopeProcessor },
  configs: {
    flatConfigRecommended: [] as FlatConfig.Config[],
  },
} satisfies FlatConfig.Plugin;

Object.assign(plugin.configs, { recommended: recommendedLegacy });

plugin.configs.flatConfigRecommended = [
  {
    files: ["**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}"],
    languageOptions: {
      parser,
      parserOptions: { projectService: true },
      sourceType: "module",
    },
    plugins: { "export-scope": plugin },
    rules: {
      [`export-scope/${ruleName}`]: "error",
    },
  },
  { files: ["**/*.{cjs,cts}"], languageOptions: { sourceType: "commonjs" } },

  {
    files: ["**/.scope.{ts,js}", "**/.scope.default.{ts,js}"],
    processor: "export-scope/export-scope",
  },
];

const pluginForManualConfigs = { plugin };
const combinedEslintTsPlugin = Object.assign(tsLanguageServicePlugin, plugin, pluginForManualConfigs);

export default combinedEslintTsPlugin as typeof plugin & typeof pluginForManualConfigs;
module.exports = combinedEslintTsPlugin as typeof plugin & typeof pluginForManualConfigs;
