"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentSuggestions = exports.getNewSuggestions = exports.entry = void 0;
const path_1 = require("path");
const typescript_1 = require("typescript");
const entry = (name, kind) => ({
    name,
    kind,
    kindModifiers: "",
    sortText: "10",
});
exports.entry = entry;
const getNewSuggestions = () => ({
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: [],
});
exports.getNewSuggestions = getNewSuggestions;
const getParentSuggestions = (rootDir, importDir) => {
    const suggestions = (0, exports.getNewSuggestions)();
    let currentDir = importDir;
    while (currentDir !== rootDir) {
        suggestions.entries.push((0, exports.entry)((0, path_1.relative)(rootDir, currentDir), typescript_1.ScriptElementKind.directory));
        currentDir = (0, path_1.dirname)(currentDir);
    }
    const levelsUp = Math.min(3, suggestions.entries.length);
    suggestions.entries.push((0, exports.entry)(".", typescript_1.ScriptElementKind.directory));
    for (let i = 1; i <= levelsUp; i++) {
        suggestions.entries.push((0, exports.entry)(Array(i).fill("..").join("/"), typescript_1.ScriptElementKind.directory));
    }
    return suggestions;
};
exports.getParentSuggestions = getParentSuggestions;
//# sourceMappingURL=tsUtils.js.map