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
    var _a, _b, _c;
    if (!importPath || !exportPath || !exportName || exportPath.includes("node_modules"))
        return true;
    const exportFile = tsProgram.getSourceFile(exportPath);
    const exportDir = path_1.default.dirname(exportPath);
    const importDir = path_1.default.dirname(importPath);
    if (!exportFile)
        return true;
    const localTag = getExportJsDoc(tsProgram, exportFile, exportName);
    // 1) get local package path
    let packageRelativePath = (_a = localTag === null || localTag === void 0 ? void 0 : localTag.text) === null || _a === void 0 ? void 0 : _a[0].text;
    // 2) get file package path
    if (!packageRelativePath || packageRelativePath.includes("default")) {
        const fileJsDoc = (_b = exportFile.getFullText().match(/\/\*\*[\s\S]*?\*\//)) === null || _b === void 0 ? void 0 : _b[0];
        const fileRegExp = new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`);
        const [filePackageTag, defaultFilePackageRelativePath] = (_c = fileJsDoc === null || fileJsDoc === void 0 ? void 0 : fileJsDoc.match(fileRegExp)) !== null && _c !== void 0 ? _c : [];
        packageRelativePath = filePackageTag && defaultFilePackageRelativePath;
    }
    // 3) defer to project settings
    if (!packageRelativePath && strictMode) {
        packageRelativePath = path_1.default.parse(exportFile.fileName).name === "index" ? ".." : ".";
    }
    if (!packageRelativePath || packageRelativePath === "*")
        return true;
    const packageDir = packageRelativePath ? path_1.default.resolve(exportDir, packageRelativePath.trim()) : exportDir;
    return !path_1.default.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
const cast = (param) => param;
exports.cast = cast;
