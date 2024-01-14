"use strict";
const esLintRule_1 = require("./esLintRule");
const tsPlugin_1 = require("./tsPlugin");
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
module.exports = Object.assign(tsPlugin_1.tsLanguageServicePlugin, { rules, configs });
//# sourceMappingURL=index.js.map