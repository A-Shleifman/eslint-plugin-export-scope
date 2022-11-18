"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cast = exports.checkIsAccessible = void 0;
const path_1 = __importDefault(require("path"));
const typescript_1 = require("typescript");
const getExportComments = (tsProgram, exportFile, exportName) => {
    var _a, _b, _c, _d, _e, _f;
    const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
    const exportSymbol = (_a = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _a === void 0 ? void 0 : _a.get((0, typescript_1.escapeLeadingUnderscores)(exportName));
    const exportSymbolStartIndex = (_c = (_b = exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.valueDeclaration) === null || _b === void 0 ? void 0 : _b.getStart()) !== null && _c !== void 0 ? _c : 0;
    let exportStatementIndex = -1;
    while (exportFile.statements[++exportStatementIndex].getEnd() < exportSymbolStartIndex)
        ;
    const prevStatementEndIndex = (_f = (_e = (_d = exportFile.statements) === null || _d === void 0 ? void 0 : _d[exportStatementIndex - 1]) === null || _e === void 0 ? void 0 : _e.getEnd()) !== null && _f !== void 0 ? _f : 0;
    const exportStatementStartIndex = exportFile.statements[exportStatementIndex].getStart();
    return exportFile.getFullText().slice(prevStatementEndIndex, exportStatementStartIndex);
};
const checkIsAccessible = ({ tsProgram, importPath, exportPath, exportName, strictMode, }) => {
    var _a, _b, _c, _d;
    if (!importPath || !exportPath || !exportName || exportPath.includes("node_modules"))
        return true;
    const exportFile = tsProgram.getSourceFile(exportPath);
    const exportDir = path_1.default.dirname(exportPath);
    const importDir = path_1.default.dirname(importPath);
    let scopePath;
    if (!exportFile)
        return true;
    // 1) parse path tag
    const [, pathTag] = (_a = exportPath.match(/.*\/(@\.*)/)) !== null && _a !== void 0 ? _a : [];
    if (pathTag) {
        // `...` => `../..`
        const slashfulPath = [...((_b = pathTag.slice(2)) !== null && _b !== void 0 ? _b : [])].fill("..").join(path_1.default.sep) || ".";
        scopePath = pathTag === "@" ? "*" : slashfulPath;
    }
    // 2) parse file tag
    const firstStatementEndIndex = exportFile.statements[0].getEnd();
    const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
    const [, fileTagPath] = (_c = fileComments.match(/@scope\s+default\s+([./*]+)/)) !== null && _c !== void 0 ? _c : [];
    scopePath = fileTagPath ? fileTagPath : scopePath;
    // 3) parse local tag
    const comments = getExportComments(tsProgram, exportFile, exportName);
    const [, localTagPath] = (_d = comments.match(/@scope\s+([./*]+)/)) !== null && _d !== void 0 ? _d : [];
    scopePath = localTagPath ? localTagPath : scopePath;
    // 4) defer to project settings
    if (strictMode) {
        scopePath !== null && scopePath !== void 0 ? scopePath : (scopePath = path_1.default.parse(exportFile.fileName).name === "index" ? ".." : ".");
    }
    if (!scopePath || scopePath === "*")
        return true;
    scopePath = scopePath.replaceAll("/", path_1.default.sep);
    const scopeDir = scopePath ? path_1.default.resolve(exportDir, scopePath) : exportDir;
    return !path_1.default.relative(scopeDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
const cast = (param) => param;
exports.cast = cast;
