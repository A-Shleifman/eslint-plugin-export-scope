import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";
import { rule, ruleName } from "./esLintPlugin/esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";

const plugin: FlatConfig.Plugin = {
  rules: { [ruleName]: rule },
  configs: {},
};

const esLintPluginName = "export-scope";

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

Object.assign(tsLanguageServicePlugin, { plugin });

// for ESM
export default tsLanguageServicePlugin as unknown as { plugin: FlatConfig.Plugin };

// for CommonJS
module.exports = tsLanguageServicePlugin;
