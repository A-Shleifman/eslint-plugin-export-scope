"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIsAccessible = exports.SCOPE_FILE_NAME = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const typescript_1 = require("typescript");
const utils_1 = require("./utils");
exports.SCOPE_FILE_NAME = "scope.ts";
const _SCOPE_REGEXP = /\[\^(\d+|\*)\]/;
const SCOPE_REGEXP = new RegExp(`(?<!default)${_SCOPE_REGEXP.source}`);
const DEFAULT_SCOPE_REGEXP = new RegExp(`default${_SCOPE_REGEXP.source}`);
const getExportComments = (tsProgram, exportFile, exportName) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
    const exportSymbol = (_a = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _a === void 0 ? void 0 : _a.get((0, typescript_1.escapeLeadingUnderscores)(exportName));
    const exportSymbolStartIndex = (_d = (_c = (_b = exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.declarations) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.getStart()) !== null && _d !== void 0 ? _d : 0;
    let exportStatementIndex = -1;
    while (exportFile.statements[++exportStatementIndex].getEnd() < exportSymbolStartIndex)
        ;
    const prevStatementEndIndex = (_g = (_f = (_e = exportFile.statements) === null || _e === void 0 ? void 0 : _e[exportStatementIndex - 1]) === null || _f === void 0 ? void 0 : _f.getEnd()) !== null && _g !== void 0 ? _g : 0;
    const exportStatementStartIndex = exportFile.statements[exportStatementIndex].getStart();
    return exportFile.getFullText().slice(prevStatementEndIndex, exportStatementStartIndex);
};
const checkIsAccessible = ({ tsProgram, importPath, exportPath, exportName, }) => {
    var _a, _b;
    if (!importPath || !exportPath || exportPath.includes("node_modules"))
        return true;
    const exportFile = tsProgram.getSourceFile(exportPath);
    const exportDir = path_1.default.dirname(exportPath);
    const importDir = path_1.default.dirname(importPath);
    let scopeUpLevels;
    if (!exportFile)
        return true;
    // 1) parse local tag
    if (exportName) {
        const comments = getExportComments(tsProgram, exportFile, exportName);
        const [, localScopeUpLevels] = (_a = comments.match(SCOPE_REGEXP)) !== null && _a !== void 0 ? _a : [];
        scopeUpLevels = localScopeUpLevels;
    }
    // 2) parse file tag
    if (!scopeUpLevels) {
        const firstStatementEndIndex = exportFile.statements[0].getEnd();
        const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
        const [, fileScopeUpLevels] = (_b = fileComments.match(DEFAULT_SCOPE_REGEXP)) !== null && _b !== void 0 ? _b : [];
        scopeUpLevels = fileScopeUpLevels !== null && fileScopeUpLevels !== void 0 ? fileScopeUpLevels : scopeUpLevels;
    }
    // 3) parse scope files
    if (!scopeUpLevels) {
        const scopeConfigPath = (0, utils_1.getPathOfTheNearestConfig)(exportDir, "scope.ts");
        if (scopeConfigPath) {
            // [, scopeUpLevels] = nearestScopeConfigFileName.match(SCOPE_REGEXP) ?? [];
            const fileText = fs_1.default.readFileSync(scopeConfigPath, "utf8");
            // console.debug("reading file", scopeConfigPath);
            const isWhitelisted = fileText.split("\n").some((relativePath) => {
                const whitelistedPath = path_1.default.resolve(path_1.default.dirname(scopeConfigPath), relativePath);
                return new RegExp(`^${whitelistedPath}($|${path_1.default.sep}.*)`, "i").test(importPath);
            });
            if (isWhitelisted)
                return true;
        }
    }
    // 4) handle index files
    scopeUpLevels !== null && scopeUpLevels !== void 0 ? scopeUpLevels : (scopeUpLevels = path_1.default.parse(exportFile.fileName).name === "index" ? "1" : "0");
    if (scopeUpLevels === "*")
        return true;
    let scopeDir = exportDir;
    for (let i = 0; i < Number(scopeUpLevels); i++) {
        scopeDir = path_1.default.dirname(scopeDir);
    }
    // const scopeDir = scopePath ? path.resolve(exportDir, scopePath) : exportDir;
    return !path_1.default.relative(scopeDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
//# sourceMappingURL=common.js.map