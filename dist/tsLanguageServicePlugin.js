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
exports.tsLanguageServicePlugin = void 0;
Promise.resolve().then(() => __importStar(require("typescript/lib/tsserverlibrary")));
const common_1 = require("./common");
function tsLanguageServicePlugin() {
    function create(info) {
        const defaultPackage = info.config.defaultProjectPackage;
        const proxy = Object.assign({}, info.languageService);
        proxy.getCompletionsAtPosition = (importPath, ...args) => {
            const original = info.languageService.getCompletionsAtPosition(importPath, ...args);
            const tsProgram = info.languageService.getProgram();
            if (!original || !tsProgram)
                return original;
            const filtered = original === null || original === void 0 ? void 0 : original.entries.filter((entry) => {
                if (entry.kindModifiers !== "export")
                    return true;
                // TODO: `import {%named export%} from '';` will not have entry.data, but should still be handled
                if (!entry.data)
                    return true;
                const { exportName, fileName: exportPath } = entry.data;
                return (0, common_1.checkIsAccessible)({ tsProgram, importPath, exportPath, exportName, defaultPackage });
            });
            return Object.assign(Object.assign({}, original), { entries: filtered !== null && filtered !== void 0 ? filtered : [] });
        };
        proxy.getCodeFixesAtPosition = (importPath, ...args) => {
            const original = info.languageService.getCodeFixesAtPosition(importPath, ...args);
            const tsProgram = info.languageService.getProgram();
            if (!tsProgram)
                return original;
            return original.filter((fix) => {
                var _a, _b;
                if (fix.fixName !== "import")
                    return true;
                const importMatch = /['"]([^'"]+?)['"][^'"]*['"]([^'"]+?)['"]/;
                // TODO: find a more reliable source of this data
                const [, exportName, relativeExportPath] = (_a = fix.description.match(importMatch)) !== null && _a !== void 0 ? _a : [];
                if (!relativeExportPath)
                    return true;
                const exportPath = (_b = info.project.resolveModuleNames([relativeExportPath], importPath)[0]) === null || _b === void 0 ? void 0 : _b.resolvedFileName;
                return (0, common_1.checkIsAccessible)({ tsProgram, importPath, exportPath, exportName, defaultPackage });
            });
        };
        return proxy;
    }
    return { create };
}
exports.tsLanguageServicePlugin = tsLanguageServicePlugin;
