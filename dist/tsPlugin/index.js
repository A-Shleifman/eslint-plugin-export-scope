"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsLanguageServicePlugin = void 0;
const getCodeFixesAtPosition_1 = require("./getCodeFixesAtPosition");
const getCompletionsAtPosition_1 = require("./getCompletionsAtPosition");
function tsLanguageServicePlugin(modules) {
    const ts = modules.typescript;
    function create(info) {
        const ls = info.languageService;
        const proxy = Object.assign({}, ls);
        proxy.getCompletionsAtPosition = (0, getCompletionsAtPosition_1.getCompletionsAtPosition)(ts, info);
        proxy.getCodeFixesAtPosition = (0, getCodeFixesAtPosition_1.getCodeFixesAtPosition)(ts, info);
        return proxy;
    }
    return { create };
}
exports.tsLanguageServicePlugin = tsLanguageServicePlugin;
//# sourceMappingURL=index.js.map