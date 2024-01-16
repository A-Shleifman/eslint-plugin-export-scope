"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIsImportable = exports.SCOPE_FILE_NAME = void 0;
const path_1 = __importDefault(require("path"));
const typescript_1 = require("typescript");
const utils_1 = require("./utils");
exports.SCOPE_FILE_NAME = ".scope.ts";
const getFullScopePath = (exportDir, scope) => {
    if (scope.startsWith(".")) {
        return path_1.default.resolve(exportDir, scope);
    }
    const rootDir = (0, utils_1.getRootDir)(exportDir);
    if (!rootDir)
        return null;
    return path_1.default.resolve(rootDir, scope);
};
const isSubPath = (path1, path2) => !path_1.default.relative(path1.toLowerCase(), path2.toLowerCase()).startsWith(".");
const checkIsImportable = ({ tsProgram, importPath, exportPath, exportName, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if (!importPath || !exportPath || exportPath.includes("node_modules"))
        return true;
    const exportFile = tsProgram.getSourceFile(exportPath);
    const exportDir = path_1.default.dirname(exportPath);
    let scope;
    if (!exportFile)
        return true;
    getLocalScope: {
        if (!exportName)
            break getLocalScope;
        const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
        const jsDocTags = (_b = (_a = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _a === void 0 ? void 0 : _a.get((0, typescript_1.escapeLeadingUnderscores)(exportName))) === null || _b === void 0 ? void 0 : _b.getJsDocTags();
        if (!jsDocTags)
            break getLocalScope;
        for (const tag of jsDocTags) {
            if (tag.name === "scopeException") {
                const exception = (_d = (_c = tag.text) === null || _c === void 0 ? void 0 : _c.at(0)) === null || _d === void 0 ? void 0 : _d.text;
                if (!exception)
                    continue;
                const exceptionFullPath = getFullScopePath(exportDir, exception);
                if (exceptionFullPath && isSubPath(exceptionFullPath, importPath)) {
                    return true;
                }
            }
            if (tag.name === "scope") {
                scope = (_f = (_e = tag.text) === null || _e === void 0 ? void 0 : _e.at(0)) === null || _f === void 0 ? void 0 : _f.text;
            }
        }
    }
    getFileScope: {
        if (scope)
            break getFileScope;
        const firstStatementEndIndex = exportFile.statements[0].getEnd();
        const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
        [, scope] = (_g = fileComments.match(/@scopeDefault\s+([^\s]+)/)) !== null && _g !== void 0 ? _g : [];
    }
    getFolderScope: {
        if (scope)
            break getFolderScope;
        const scopeConfigPath = (0, utils_1.getPathOfTheNearestConfig)(exportDir, exports.SCOPE_FILE_NAME);
        const scopeFile = scopeConfigPath && tsProgram.getSourceFile(scopeConfigPath);
        if (!scopeFile)
            break getFolderScope;
        const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(scopeFile);
        const defaultExportValDecl = (_j = (_h = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _h === void 0 ? void 0 : _h.get((0, typescript_1.escapeLeadingUnderscores)("default"))) === null || _j === void 0 ? void 0 : _j.valueDeclaration;
        const exceptionsValDecl = (_l = (_k = symbols === null || symbols === void 0 ? void 0 : symbols.exports) === null || _k === void 0 ? void 0 : _k.get((0, typescript_1.escapeLeadingUnderscores)("exceptions"))) === null || _l === void 0 ? void 0 : _l.valueDeclaration;
        // @ts-expect-error: ts.isExportAssignment is missing in ESLint plugin
        const text = (_o = (_m = defaultExportValDecl === null || defaultExportValDecl === void 0 ? void 0 : defaultExportValDecl.expression) === null || _m === void 0 ? void 0 : _m.getText) === null || _o === void 0 ? void 0 : _o.call(_m);
        if (typeof text === "string") {
            scope = text.slice(1, -1);
        }
        // @ts-expect-error: ts.isVariableDeclaration is missing in ESLint plugin
        const exceptions = (_q = (_p = exceptionsValDecl === null || exceptionsValDecl === void 0 ? void 0 : exceptionsValDecl.initializer) === null || _p === void 0 ? void 0 : _p.elements) === null || _q === void 0 ? void 0 : _q.map((x) => x === null || x === void 0 ? void 0 : x.getText());
        if ((0, utils_1.isStringArray)(exceptions)) {
            for (const exception of exceptions) {
                const exceptionFullPath = getFullScopePath(exportDir, exception.slice(1, -1));
                if (!exceptionFullPath)
                    continue;
                if (isSubPath(exceptionFullPath, importPath)) {
                    return true;
                }
            }
        }
    }
    // handles index files
    scope !== null && scope !== void 0 ? scope : (scope = path_1.default.parse(exportFile.fileName).name === "index" ? ".." : ".");
    if (scope === "*")
        return true;
    const fullScopePath = getFullScopePath(exportDir, scope);
    if (!fullScopePath)
        return true;
    return isSubPath(fullScopePath, importPath);
};
exports.checkIsImportable = checkIsImportable;
//# sourceMappingURL=importabilityChecker.js.map