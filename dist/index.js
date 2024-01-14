"use strict";
const esLintRule_1 = require("./esLintRule");
const tsLanguageServicePlugin_1 = require("./tsLanguageServicePlugin");
const esLintPluginName = "export-scope";
const configs = {
    recommended: {
        plugins: [esLintPluginName],
        rules: {
            [`${esLintPluginName}/${esLintRule_1.ruleName}`]: "error",
        },
    },
};
const rules = { [esLintRule_1.ruleName]: esLintRule_1.rule };
module.exports = Object.assign(tsLanguageServicePlugin_1.tsLanguageServicePlugin, { rules, configs });
//# sourceMappingURL=index.js.map