"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIsAccessible = void 0;
const path_1 = __importDefault(require("path"));
const typescript_1 = require("typescript");
const PROPERTY_NAME = "package";
const checkIsAccessible = ({ tsProgram, importPath, exportPath, exportName, }) => {
    var _a, _b, _c, _d, _e;
    if (!importPath || !exportPath || !exportName)
        return true;
    const exportDir = path_1.default.dirname(exportPath);
    const importDir = path_1.default.dirname(importPath);
    const exportFileNode = tsProgram.getSourceFile(exportPath);
    const typeChecker = tsProgram.getTypeChecker();
    if (!exportFileNode || !typeChecker)
        return true;
    const symbols = typeChecker.getSymbolAtLocation(exportFileNode);
    const tags = (_b = (_a = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _a === void 0 ? void 0 : _a.get((0, typescript_1.escapeLeadingUnderscores)(exportName))) === null || _b === void 0 ? void 0 : _b.getJsDocTags();
    const localTag = tags === null || tags === void 0 ? void 0 : tags.find((tag) => tag.name === PROPERTY_NAME);
    let packageRelativePath = (_c = localTag === null || localTag === void 0 ? void 0 : localTag.text) === null || _c === void 0 ? void 0 : _c[0].text;
    if (!localTag || (packageRelativePath === null || packageRelativePath === void 0 ? void 0 : packageRelativePath.startsWith("default"))) {
        const fileJsDoc = (_d = exportFileNode.getFullText().match(/\/\*\*[\s\S]*?\*\//)) === null || _d === void 0 ? void 0 : _d[0];
        const [defaultPackageTag, defaultPackageRelativePath] = (_e = fileJsDoc === null || fileJsDoc === void 0 ? void 0 : fileJsDoc.match(new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`))) !== null && _e !== void 0 ? _e : [];
        if (!defaultPackageTag)
            return true;
        packageRelativePath = defaultPackageRelativePath;
    }
    const packageDir = packageRelativePath ? path_1.default.resolve(exportDir, packageRelativePath.trim()) : exportDir;
    return !path_1.default.relative(packageDir, importDir).startsWith(".");
};
exports.checkIsAccessible = checkIsAccessible;
