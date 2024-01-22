"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionsAtPosition = void 0;
const typescript_1 = require("typescript");
const importabilityChecker_1 = require("../importabilityChecker");
const path_1 = require("path");
const tsUtils_1 = require("./tsUtils");
const scopeFileCompletions_1 = require("./scopeFileCompletions");
const jsDocCompletions_1 = require("./jsDocCompletions");
const getCompletionsAtPosition = (ts, info) => (importPath, position, ...args) => {
    var _a, _b;
    const ls = info.languageService;
    const tsProgram = ls.getProgram();
    const importDir = (0, path_1.dirname)(importPath);
    const original = ls.getCompletionsAtPosition(importPath, position, ...args);
    const file = tsProgram === null || tsProgram === void 0 ? void 0 : tsProgram.getSourceFile(importPath);
    const fileTextToPosition = file === null || file === void 0 ? void 0 : file.getFullText().slice(0, position);
    if (!fileTextToPosition)
        return original;
    if ([importabilityChecker_1.SCOPE_TS_FILE_NAME, importabilityChecker_1.SCOPE_JS_FILE_NAME].includes((0, path_1.basename)(importPath))) {
        return (_a = (0, scopeFileCompletions_1.getScopeFileCompletions)(ts, importDir, fileTextToPosition)) !== null && _a !== void 0 ? _a : original;
    }
    {
        // -------------- snippets --------------
        const lastLine = (_b = fileTextToPosition.split("\n").at(-1)) === null || _b === void 0 ? void 0 : _b.trimStart();
        // autocompletion in VSCode only triggers direcly after @ symbol
        const snippetTriggerFound = ["@scope", "@scopeDefault", "@scopeException"].some((x) => lastLine && x.startsWith(lastLine));
        if (snippetTriggerFound) {
            const atSnippet = (name) => ({
                name: `@${name}`,
                kind: typescript_1.ScriptElementKind.unknown,
                kindModifiers: "",
                sortText: "10",
                isSnippet: true,
                insertText: `/** @${name} ${"${0}"} */`,
                replacementSpan: { start: position - 1, length: 1 },
            });
            return Object.assign(Object.assign({}, (0, tsUtils_1.getNewCompletions)()), { isGlobalCompletion: true, entries: [atSnippet("scope"), atSnippet("scopeDefault"), atSnippet("scopeException")] });
        }
    }
    {
        // -------------- jsdoc completions --------------
        const lastJSDocPos = fileTextToPosition.lastIndexOf("/**");
        const lastClosingJSDocPos = fileTextToPosition.lastIndexOf("*/");
        if (lastClosingJSDocPos < lastJSDocPos) {
            return (0, jsDocCompletions_1.jsDocCompletions)(importDir, original !== null && original !== void 0 ? original : (0, tsUtils_1.getNewCompletions)(), fileTextToPosition.slice(lastJSDocPos));
        }
    }
    // -------------- accessibility validation --------------
    if (!original || !tsProgram)
        return original;
    const filtered = original.entries.filter((entry) => {
        var _a, _b;
        if (entry.kindModifiers !== "export")
            return true;
        let exportPath = (_a = entry.data) === null || _a === void 0 ? void 0 : _a.fileName;
        if (!exportPath) {
            const symbol = ls.getCompletionEntrySymbol(importPath, position, entry.name, undefined);
            exportPath = (_b = symbol === null || symbol === void 0 ? void 0 : symbol.declarations) === null || _b === void 0 ? void 0 : _b[0].getSourceFile().fileName;
        }
        return (0, importabilityChecker_1.checkIsImportable)({ tsProgram, importPath, exportPath, exportName: entry.name });
    });
    return Object.assign(Object.assign({}, original), { entries: filtered !== null && filtered !== void 0 ? filtered : [] });
};
exports.getCompletionsAtPosition = getCompletionsAtPosition;
//# sourceMappingURL=getCompletionsAtPosition.js.map