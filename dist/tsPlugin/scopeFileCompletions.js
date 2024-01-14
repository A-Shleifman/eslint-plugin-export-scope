"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScopeFileCompletions = void 0;
const path_1 = require("path");
const common_1 = require("../common");
const tsUtils_1 = require("./tsUtils");
const typescript_1 = require("typescript");
const getScopeFileCompletions = (ts, importDir, fileTextToPosition) => {
    var _a;
    const lastLine = (_a = fileTextToPosition.split("\n").pop()) !== null && _a !== void 0 ? _a : "";
    const stack = [];
    lastLine.split("").forEach((c) => {
        if (c === `'` || c === `"` || c === "`") {
            if (stack.at(-1) === c) {
                stack.pop();
            }
            else {
                stack.push(c);
            }
        }
    });
    const openQuote = stack.at(-1);
    if (openQuote) {
        const rootDir = (0, common_1.getRootDir)(importDir);
        if (!rootDir)
            return;
        const lastExportDefaultPos = fileTextToPosition.lastIndexOf("export default");
        const lastExportPos = fileTextToPosition.lastIndexOf("export");
        const isDefaultExport = lastExportDefaultPos === lastExportPos;
        if (isDefaultExport) {
            return (0, tsUtils_1.getParentSuggestions)(rootDir, importDir);
        }
        const paths = ts.sys.readDirectory(rootDir, [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"], ["node_modules"]);
        const relativePaths = paths.map((x) => (0, path_1.relative)(rootDir, x));
        const dirs = relativePaths.reduce((acc, path) => {
            path = (0, path_1.dirname)(path); // removes filename
            while (path !== ".") {
                acc.add(path);
                path = (0, path_1.dirname)(path);
            }
            return acc;
        }, new Set());
        return Object.assign(Object.assign({}, (0, tsUtils_1.getNewSuggestions)()), { entries: [
                ...[...dirs].map((x) => (0, tsUtils_1.entry)(x, typescript_1.ScriptElementKind.directory)),
                ...relativePaths.map((x) => (0, tsUtils_1.entry)(x, typescript_1.ScriptElementKind.moduleElement)),
            ] });
    }
};
exports.getScopeFileCompletions = getScopeFileCompletions;
//# sourceMappingURL=scopeFileCompletions.js.map