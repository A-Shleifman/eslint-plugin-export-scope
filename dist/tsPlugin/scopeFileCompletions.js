"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScopeFileCompletions = void 0;
const tsUtils_1 = require("./tsUtils");
const typescript_1 = require("typescript");
const utils_1 = require("../utils");
const path_1 = require("path");
const hasOpenQuote = (string) => {
    const stack = [];
    string.split("").forEach((c) => {
        if (c === `'` || c === `"` || c === "`") {
            if (stack.at(-1) === c) {
                stack.pop();
            }
            else {
                stack.push(c);
            }
        }
    });
    return !!stack.at(-1);
};
const getScopeFileCompletions = (ts, importDir, fileTextToPosition) => {
    var _a;
    const lastLine = (_a = fileTextToPosition.split("\n").pop()) !== null && _a !== void 0 ? _a : "";
    if (!hasOpenQuote(lastLine))
        return;
    const rootDir = (0, utils_1.getRootDir)(importDir);
    if (!rootDir)
        return;
    const lastExportDefaultPos = fileTextToPosition.lastIndexOf("export default");
    const lastExportPos = fileTextToPosition.lastIndexOf("export");
    const isDefaultExport = lastExportDefaultPos === lastExportPos;
    if (isDefaultExport) {
        return (0, tsUtils_1.getParentCompletions)(rootDir, importDir);
    }
    const { filePaths, dirPaths } = (0, utils_1.getFileTree)(rootDir);
    return Object.assign(Object.assign({}, (0, tsUtils_1.getNewCompletions)()), { entries: [
            ...dirPaths.map((x) => (0, tsUtils_1.entry)((0, path_1.relative)(rootDir, x), typescript_1.ScriptElementKind.string)),
            ...filePaths.map((x) => (0, tsUtils_1.entry)((0, path_1.relative)(rootDir, x), typescript_1.ScriptElementKind.string)),
        ] });
};
exports.getScopeFileCompletions = getScopeFileCompletions;
//# sourceMappingURL=scopeFileCompletions.js.map