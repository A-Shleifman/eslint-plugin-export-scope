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
    let privatePath;
    if (!exportFile)
        return true;
    // 1) parse path tag
    const [, pathTag] = (_a = exportPath.match(/.*\/(@\.*)/)) !== null && _a !== void 0 ? _a : [];
    if (pathTag) {
        // `...` => `../..`
        const slashfulPath = [...((_b = pathTag.slice(2)) !== null && _b !== void 0 ? _b : [])].fill("..").join(path_1.default.sep) || ".";
        privatePath = pathTag === "@" ? "*" : slashfulPath;
    }
    // 2) parse file tag
    const firstStatementEndIndex = exportFile.statements[0].getEnd();
    const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
    const [fileTagMatch, fileTagModifier, fileTagPath] = (_c = fileComments.match(/@(private|public)\s+default\s*([./]*)/)) !== null && _c !== void 0 ? _c : [];
    if (fileTagMatch) {
        privatePath = fileTagModifier === "public" ? "*" : fileTagPath || ".";
    }
    // 3) parse local tag
    const comments = getExportComments(tsProgram, exportFile, exportName);
    const [localTagMatch, localTagModifier, localTagPath] = (_d = comments.match(/(?!.+default)@(private|public)\s*([./]*)/)) !== null && _d !== void 0 ? _d : [];
    if (localTagMatch) {
        privatePath = localTagModifier === "public" ? "*" : localTagPath || ".";
    }
    // 4) defer to project settings
    if (strictMode) {
        privatePath !== null && privatePath !== void 0 ? privatePath : (privatePath = path_1.default.parse(exportFile.fileName).name === "index" ? ".." : ".");
    }
    if (!privatePath || privatePath === "*")
        return true;
    privatePath = privatePath.replaceAll("/", path_1.default.sep);
    const packageDir = privatePath ? path_1.default.resolve(exportDir, privatePath) : exportDir;
    return !path_1.default.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
const cast = (param) => param;
exports.cast = cast;
