"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentCompletions = exports.getNewCompletions = exports.entry = void 0;
const path_1 = require("path");
const typescript_1 = require("typescript");
const entry = (name, kind) => ({
    name,
    kind,
    kindModifiers: "",
    sortText: "10",
});
exports.entry = entry;
const getNewCompletions = () => ({
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: [],
});
exports.getNewCompletions = getNewCompletions;
const getParentCompletions = (rootDir, importDir) => {
    const completions = (0, exports.getNewCompletions)();
    let currentDir = importDir;
    while (currentDir !== rootDir) {
        completions.entries.push((0, exports.entry)((0, path_1.relative)(rootDir, currentDir), typescript_1.ScriptElementKind.directory));
        currentDir = (0, path_1.dirname)(currentDir);
    }
    const levelsUp = Math.min(3, completions.entries.length);
    completions.entries.push((0, exports.entry)(".", typescript_1.ScriptElementKind.directory));
    for (let i = 1; i <= levelsUp; i++) {
        completions.entries.push((0, exports.entry)(Array(i).fill("..").join("/"), typescript_1.ScriptElementKind.directory));
    }
    return completions;
};
exports.getParentCompletions = getParentCompletions;
//# sourceMappingURL=tsUtils.js.map