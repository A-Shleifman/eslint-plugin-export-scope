"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cast = exports.checkIsAccessible = void 0;
const path_1 = __importDefault(require("path"));
const typescript_1 = require("typescript");
const PROPERTY_NAME = "package";
const getExportJsDoc = (tsProgram, exportFile, exportName) => {
    var _a;
    const symbols = exportFile && (tsProgram === null || tsProgram === void 0 ? void 0 : tsProgram.getTypeChecker().getSymbolAtLocation(exportFile));
    const exportSymbol = (_a = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _a === void 0 ? void 0 : _a.get((0, typescript_1.escapeLeadingUnderscores)(exportName));
    return exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.getJsDocTags().find((tag) => tag.name === PROPERTY_NAME);
};
const checkIsAccessible = ({ tsProgram, importPath, exportPath, exportName, strictMode, }) => {
    var _a, _b, _c, _d, _e, _f;
    if (!importPath || !exportPath || !exportName || exportPath.includes("node_modules"))
        return true;
    const exportFile = tsProgram.getSourceFile(exportPath);
    const exportDir = path_1.default.dirname(exportPath);
    const importDir = path_1.default.dirname(importPath);
    let packagePath;
    if (!exportFile)
        return true;
    // 1) get package path from `@` path tags
    const [, pathTag] = (_a = exportPath.match(/.*\/(@\.*)/)) !== null && _a !== void 0 ? _a : [];
    if (pathTag) {
        // `...` => `../..`
        const slashfulPath = [...((_b = pathTag.slice(2)) !== null && _b !== void 0 ? _b : [])].fill("..").join(path_1.default.sep) || ".";
        packagePath = pathTag === "@" ? "*" : slashfulPath;
    }
    // 2) get file package path
    const fileJsDoc = (_c = exportFile.getFullText().match(/\/\*\*[\s\S]*?\*\//)) === null || _c === void 0 ? void 0 : _c[0];
    const fileRegExp = new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`);
    const [filePackageTag, relativePath] = (_d = fileJsDoc === null || fileJsDoc === void 0 ? void 0 : fileJsDoc.match(fileRegExp)) !== null && _d !== void 0 ? _d : [];
    packagePath = filePackageTag ? relativePath : packagePath;
    // 3) get local package path
    const localTag = getExportJsDoc(tsProgram, exportFile, exportName);
    packagePath = (_f = (_e = localTag === null || localTag === void 0 ? void 0 : localTag.text) === null || _e === void 0 ? void 0 : _e[0].text) !== null && _f !== void 0 ? _f : packagePath;
    // 4) defer to project settings
    if (strictMode) {
        packagePath !== null && packagePath !== void 0 ? packagePath : (packagePath = path_1.default.parse(exportFile.fileName).name === "index" ? ".." : ".");
    }
    if (!packagePath || packagePath === "*")
        return true;
    packagePath = packagePath.replaceAll("/", path_1.default.sep);
    const packageDir = packagePath ? path_1.default.resolve(exportDir, packagePath.trim()) : exportDir;
    return !path_1.default.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
const cast = (param) => param;
exports.cast = cast;
