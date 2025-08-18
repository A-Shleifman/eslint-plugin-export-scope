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

function typedTsEsRulesOff(): Record<string, "off"> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tses = require("@typescript-eslint/eslint-plugin") as {
      rules: Record<string, { meta?: { docs?: { requiresTypeChecking?: boolean } } }>;
    };
    const out: Record<string, "off"> = {};
    for (const [n, def] of Object.entries(tses.rules ?? {})) {
      if (def?.meta?.docs?.requiresTypeChecking) out[`@typescript-eslint/${n}`] = "off";
    }
    return out;
  } catch {
    return {};
  }
}

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
    recommended: recommendedLegacy as unknown as FlatConfig.Config,
  },
} satisfies FlatConfig.Plugin;

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
    files: ["**/*.scope.{ts,js}", "**/*.scope.default.{ts,js}"],
    processor: "export-scope/export-scope",
    linterOptions: { reportUnusedDisableDirectives: "off" },
    languageOptions: {
      parser,
      parserOptions: { projectService: false },
      sourceType: "module",
    },
    plugins: { "export-scope": plugin },
    rules: {
      ...typedTsEsRulesOff(),
      [`export-scope/${ruleName}`]: "error",
    },
  },
];

const pluginForManualConfigs = { plugin };
const combinedEslintTsPlugin = Object.assign(tsLanguageServicePlugin, plugin, pluginForManualConfigs);

export default combinedEslintTsPlugin as typeof plugin & typeof pluginForManualConfigs;
module.exports = combinedEslintTsPlugin as typeof plugin & typeof pluginForManualConfigs;
