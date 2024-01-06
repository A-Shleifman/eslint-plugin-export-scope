"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsLanguageServicePlugin = void 0;
const common_1 = require("./common");
function tsLanguageServicePlugin(modules) {
    const ts = modules.typescript;
    function create(info) {
        const ls = info.languageService;
        const proxy = Object.assign({}, ls);
        proxy.getCompletionsAtPosition = (importPath, position, ...args) => {
            const tsProgram = ls.getProgram();
            const original = ls.getCompletionsAtPosition(importPath, position, ...args);
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
