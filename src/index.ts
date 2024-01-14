import { rule, ruleName } from "./esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";

const esLintPluginName = "export-scope";

const configs = {
  recommended: {
    plugins: [esLintPluginName],
    rules: {
      [`${esLintPluginName}/${ruleName}`]: "error",
    },
  },
};

const rules = { [ruleName]: rule };

export = Object.assign(tsLanguageServicePlugin, { rules, configs });
