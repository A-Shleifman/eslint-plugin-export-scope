import { rule, ruleName } from "./esLintRule";
import { tsLanguageServicePlugin } from "./tsLanguageServicePlugin";

const esLintPluginName = "import-access";

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
