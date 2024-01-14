"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsDocCompletions = void 0;
const common_1 = require("../common");
const tsUtils_1 = require("./tsUtils");
const typescript_1 = require("typescript");
const jsDocCompletions = (importDir, completions, jsDoc) => {
    const addJsDocProp = (name) => {
        if (completions.entries.every((x) => x.name !== name)) {
            completions.entries.push((0, tsUtils_1.entry)(name, typescript_1.ScriptElementKind.keyword));
        }
    };
    const isEmpty = /(\/\*\*|\s\*)\s*$/.test(jsDoc);
    if (isEmpty) {
        addJsDocProp("@scope");
        addJsDocProp("@scopeDefault");
        addJsDocProp("@scopeException");
    }
    const isAfterAtSymbol = /(\/\*\*|\s\*)\s*@$/.test(jsDoc);
    if (isAfterAtSymbol) {
        addJsDocProp("scope");
        addJsDocProp("scopeDefault");
        addJsDocProp("scopeException");
    }
    const isAfterScopeDeclaration = /(@scope|@scopeDefault)\s+$/.test(jsDoc);
    if (isAfterScopeDeclaration) {
        const rootDir = (0, common_1.getRootDir)(importDir);
        if (rootDir)
            return (0, tsUtils_1.getParentSuggestions)(rootDir, importDir);
    }
    return completions;
};
exports.jsDocCompletions = jsDocCompletions;
//# sourceMappingURL=jsDocCompletions.js.map