"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsDocCompletions = void 0;
const path_1 = require("path");
const utils_1 = require("../utils");
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
    const rootDir = (0, utils_1.getRootDir)(importDir);
    if (!rootDir)
        return completions;
    if (/(@scope|@scopeDefault)\s+$/.test(jsDoc)) {
        return (0, tsUtils_1.getParentCompletions)(rootDir, importDir);
    }
    if (/@scopeException\s+$/.test(jsDoc)) {
        const { filePaths, dirPaths } = (0, utils_1.getFileTree)(rootDir);
        return Object.assign(Object.assign({}, (0, tsUtils_1.getNewCompletions)()), { entries: [
                ...dirPaths.map((x) => (0, tsUtils_1.entry)((0, path_1.relative)(rootDir, x), typescript_1.ScriptElementKind.string)),
                ...filePaths.map((x) => (0, tsUtils_1.entry)((0, path_1.relative)(rootDir, x), typescript_1.ScriptElementKind.string)),
            ] });
    }
    return completions;
};
exports.jsDocCompletions = jsDocCompletions;
//# sourceMappingURL=jsDocCompletions.js.map