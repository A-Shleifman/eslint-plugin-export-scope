"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeFixesAtPosition = void 0;
const importabilityChecker_1 = require("../importabilityChecker");
const getCodeFixesAtPosition = (ts, info) => (importPath, ...args) => {
    const ls = info.languageService;
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
        return (0, importabilityChecker_1.checkIsImportable)({ tsProgram, importPath, exportPath, exportName });
    });
};
exports.getCodeFixesAtPosition = getCodeFixesAtPosition;
//# sourceMappingURL=getCodeFixesAtPosition.js.map