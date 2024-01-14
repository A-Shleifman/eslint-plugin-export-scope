"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIsAccessible = exports.SCOPE_FILE_NAME = void 0;
const path_1 = __importStar(require("path"));
const typescript_1 = require("typescript");
const utils_1 = require("./utils");
exports.SCOPE_FILE_NAME = "scope.ts";
// const getExportComments = (tsProgram: Program, exportFile: SourceFile, exportName: string) => {
//   const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
//   const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
//   const exportSymbolStartIndex = exportSymbol?.declarations?.[0]?.getStart() ?? 0;
//   let exportStatementIndex = -1;
//   while (exportFile.statements[++exportStatementIndex].getEnd() < exportSymbolStartIndex);
//   const prevStatementEndIndex = exportFile.statements?.[exportStatementIndex - 1]?.getEnd() ?? 0;
//   const exportStatementStartIndex = exportFile.statements[exportStatementIndex].getStart();
//   return exportFile.getFullText().slice(prevStatementEndIndex, exportStatementStartIndex);
// };
const checkIsAccessible = ({ tsProgram, importPath, exportPath, exportName, }) => {
    var _a, _b, _c;
    if (!importPath || !exportPath || exportPath.includes("node_modules"))
        return true;
    const exportFile = tsProgram.getSourceFile(exportPath);
    const exportDir = path_1.default.dirname(exportPath);
    const importDir = path_1.default.dirname(importPath);
    let scope;
    if (!exportFile)
        return true;
    // 1) parse local scope
    if (exportName) {
        const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
        const exportSymbol = (_a = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _a === void 0 ? void 0 : _a.get((0, typescript_1.escapeLeadingUnderscores)(exportName));
        exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.getJsDocTags().forEach((tag) => {
            var _a, _b, _c, _d;
            if (tag.name === "scopeException") {
                const exception = (_b = (_a = tag.text) === null || _a === void 0 ? void 0 : _a.at(0)) === null || _b === void 0 ? void 0 : _b.text;
                if (!exception)
                    return;
                const exceptionFullPath = (0, path_1.resolve)(exportDir, exception);
                if (!path_1.default.relative(exceptionFullPath.toLowerCase(), importDir.toLowerCase()).startsWith(".")) {
                    return true;
                }
            }
            if (tag.name === "scope") {
                scope = (_d = (_c = tag.text) === null || _c === void 0 ? void 0 : _c.at(0)) === null || _d === void 0 ? void 0 : _d.text;
            }
        });
    }
    // 2) parse file scope
    if (!scope) {
        const firstStatementEndIndex = exportFile.statements[0].getEnd();
        const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
        [, scope] = (_b = fileComments.match(/@scopeDefault\s+([^\s]+)/)) !== null && _b !== void 0 ? _b : [];
    }
    // 3) parse folder scope
    if (!scope) {
        const scopeConfigPath = (0, utils_1.getPathOfTheNearestConfig)(exportDir, exports.SCOPE_FILE_NAME);
        const scopeFile = scopeConfigPath && tsProgram.getSourceFile(scopeConfigPath);
        if (scopeFile) {
            const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(scopeFile);
            const exportSymbols = (_c = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _c === void 0 ? void 0 : _c.get((0, typescript_1.escapeLeadingUnderscores)("default"));
            console.log(exportSymbols);
            // const fileText = fs.readFileSync(scopeConfigPath, "utf8");
            // const isWhitelisted = fileText.split("\n").some((relativePath) => {
            //   const whitelistedPath = path.resolve(path.dirname(scopeConfigPath), relativePath);
            //   return new RegExp(`^${whitelistedPath}($|${path.sep}.*)`, "i").test(importPath);
            // });
            // if (isWhitelisted) return true;
        }
    }
    // 4) handle index files
    scope !== null && scope !== void 0 ? scope : (scope = path_1.default.parse(exportFile.fileName).name === "index" ? ".." : ".");
    if (scope === "*")
        return true;
    let fullScopePath;
    if (scope.startsWith(".")) {
        fullScopePath = path_1.default.resolve(exportDir, scope);
    }
    else {
        const rootDir = (0, utils_1.getRootDir)(exportDir);
        if (!rootDir)
            return true;
        fullScopePath = path_1.default.resolve(rootDir, scope);
    }
    return !path_1.default.relative(fullScopePath, importDir).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
//# sourceMappingURL=common.js.map