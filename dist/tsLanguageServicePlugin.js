"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsLanguageServicePlugin = void 0;
const typescript_1 = require("typescript");
const common_1 = require("./common");
const path_1 = require("path");
const tsUtils_1 = require("./tsUtils");
function tsLanguageServicePlugin(modules) {
    const ts = modules.typescript;
    function create(info) {
        const ls = info.languageService;
        const proxy = Object.assign({}, ls);
        proxy.getCompletionsAtPosition = (importPath, position, ...args) => {
            var _a;
            const tsProgram = ls.getProgram();
            const importDir = (0, path_1.dirname)(importPath);
            const original = ls.getCompletionsAtPosition(importPath, position, ...args);
            const file = tsProgram === null || tsProgram === void 0 ? void 0 : tsProgram.getSourceFile(importPath);
            const fileTextToPosition = file === null || file === void 0 ? void 0 : file.getFullText().slice(0, position);
            if (!fileTextToPosition)
                return original;
            if ((0, path_1.basename)(importPath) === "scope.ts") {
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
                        return original;
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
            }
            const snippetTriggerFound = /^\s+(@)$/m.test(fileTextToPosition);
            if (snippetTriggerFound) {
                return Object.assign(Object.assign({}, (0, tsUtils_1.getNewSuggestions)()), { isGlobalCompletion: true, entries: [
                        {
                            name: "@scope",
                            kind: typescript_1.ScriptElementKind.unknown,
                            kindModifiers: "",
                            sortText: "10",
                            isSnippet: true,
                            insertText: "/** @scope ${0} */",
                            replacementSpan: {
                                start: position - 1,
                                length: 1,
                            },
                        },
                    ] });
            }
            const lastJSDocPos = fileTextToPosition.lastIndexOf("/**");
            const lastClosingJSDocPos = fileTextToPosition.lastIndexOf("*/");
            if (lastClosingJSDocPos < lastJSDocPos) {
                const jsdoc = fileTextToPosition.slice(lastJSDocPos);
                const suggestions = original !== null && original !== void 0 ? original : (0, tsUtils_1.getNewSuggestions)();
                const isEmpty = /^\/\*\*(\*|\s)*$/m.test(jsdoc);
                if (isEmpty && suggestions.entries.every((x) => x.name !== "@scope")) {
                    suggestions.entries.push((0, tsUtils_1.entry)("@scope", typescript_1.ScriptElementKind.keyword));
                }
                const isAfterAtSymbol = /^\/\*\*(\*|\s)*@$/m.test(jsdoc);
                if (isAfterAtSymbol && suggestions.entries.every((x) => x.name !== "scope")) {
                    suggestions.entries.push((0, tsUtils_1.entry)("scope", typescript_1.ScriptElementKind.keyword));
                }
                const isAfterScopeDeclaration = /^\/\*\*(\*|\s)*@scope\s+$/m.test(jsdoc);
                if (isAfterScopeDeclaration) {
                    const rootDir = (0, common_1.getRootDir)(importDir);
                    return rootDir ? (0, tsUtils_1.getParentSuggestions)(rootDir, importDir) : suggestions;
                }
                return suggestions;
            }
            if (!original || !tsProgram)
                return original;
            const filtered = original.entries.filter((entry) => {
                var _a;
                if (entry.kindModifiers !== "export")
                    return true;
                const symbol = ls.getCompletionEntrySymbol(importPath, position, entry.name, undefined);
                const exportPath = (_a = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _a === void 0 ? void 0 : _a[0].getSourceFile().fileName;
                return (0, common_1.checkIsAccessible)({ tsProgram, importPath, exportPath, exportName: entry.name });
            });
            return Object.assign(Object.assign({}, original), { entries: filtered !== null && filtered !== void 0 ? filtered : [] });
        };
        proxy.getCodeFixesAtPosition = (importPath, ...args) => {
            const fixes = ls.getCodeFixesAtPosition(importPath, ...args);
            const tsProgram = ls.getProgram();
            if (!tsProgram)
                return fixes;
            return fixes.filter((fix) => {
                var _a, _b, _c;
                if (fix.fixName !== "import")
                    return true;
                const exportPathRegex = /["]([^"]+?)["]$/;
                // TODO: find a more reliable source of this data
                const [, relativeExportPath] = (_a = fix.description.match(exportPathRegex)) !== null && _a !== void 0 ? _a : [];
                const exportName = (_c = (_b = fix.changes) === null || _b === void 0 ? void 0 : _b[0].textChanges) === null || _c === void 0 ? void 0 : _c[0].newText.replace(/[{} ]/g, "");
                if (!relativeExportPath)
                    return true;
                const { resolvedModule } = ts.resolveModuleName(relativeExportPath, importPath, info.project.getCompilerOptions(), ts.sys);
                const exportPath = resolvedModule === null || resolvedModule === void 0 ? void 0 : resolvedModule.resolvedFileName;
                return (0, common_1.checkIsAccessible)({ tsProgram, importPath, exportPath, exportName });
            });
        };
        return proxy;
    }
    return { create };
}
exports.tsLanguageServicePlugin = tsLanguageServicePlugin;
//# sourceMappingURL=tsLanguageServicePlugin.js.map