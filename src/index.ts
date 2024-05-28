import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";
import { rule, ruleName } from "./esLintPlugin/esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";

const esLintPluginName = "export-scope";

const plugin: FlatConfig.Plugin = {
  meta: {
    name: `eslint-plugin-${esLintPluginName}`,
    version: "2.4.0",
  },
  rules: { [ruleName]: rule },
  configs: {},
};

plugin.configs = {
  recommended: {
    plugins: [esLintPluginName] as unknown as FlatConfig.Plugins, // <-- legacy config
    rules: { [`${esLintPluginName}/${ruleName}`]: "error" },
  },
  "flat-recommended": {
    plugins: { [esLintPluginName]: plugin },
    rules: { [`${esLintPluginName}/${ruleName}`]: "error" },
  },
};

const combinedExport = Object.assign(tsLanguageServicePlugin, { plugin }, plugin);

// for ESM
export default combinedExport;

// for CommonJS
module.exports = combinedExport;
