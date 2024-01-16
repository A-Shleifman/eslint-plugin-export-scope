"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSubPath = exports.getFullScopePath = exports.isStringArray = exports.getRootDir = exports.getPathOfTheNearestConfig = exports.getFileTree = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const importabilityChecker_1 = require("./importabilityChecker");
// const throttle = <T extends (...args: Parameters<T>) => ReturnType<T>>(func: T) => {
//   let lastCallTime = 0;
//   let lastResult: ReturnType<T>;
//   return (...args: Parameters<T>): ReturnType<T> => {
//     const currentTime = Date.now();
//     if (currentTime - lastCallTime < 1000) {
//       return lastResult;
//     }
//     lastCallTime = currentTime;
//     lastResult = func(...args);
//     return lastResult;
//   };
// };
// TODO: throttle
const getFileTree = (dir, extensions = [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"]) => {
    const extSet = new Set(extensions);
    const filePaths = [];
    const dirPaths = [];
    const traverse = (dir) => {
        const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        entries.map((x) => {
            if (x.name === importabilityChecker_1.SCOPE_FILE_NAME)
                return;
            if (x.name === "node_modules" || x.name.startsWith("."))
                return;
            const path = (0, path_1.resolve)(dir, x.name);
            if (x.isDirectory()) {
                dirPaths.push(path);
                return traverse(path);
            }
            else {
                if (extSet.has((0, path_1.extname)(x.name))) {
                    filePaths.push(path);
                }
            }
        });
    };
    traverse(dir);
    return { filePaths, dirPaths };
};
exports.getFileTree = getFileTree;
// TODO: throttle
const getPathOfTheNearestConfig = (originPath, configFileName) => {
    let currentDir = originPath;
    while (currentDir !== "/") {
        const fileNames = (0, fs_1.readdirSync)(currentDir);
        const isFound = fileNames.some((x) => x === configFileName);
        if (isFound) {
            return (0, path_1.resolve)(currentDir, configFileName);
        }
        if (fileNames.includes("package.json")) {
            return null;
        }
        currentDir = (0, path_1.dirname)(currentDir);
    }
    return null;
};
exports.getPathOfTheNearestConfig = getPathOfTheNearestConfig;
const getRootDir = (originPath) => {
    console.log("CALLING GET ROOT DIR!!");
    const configPath = (0, exports.getPathOfTheNearestConfig)(originPath, "package.json");
    return configPath ? (0, path_1.dirname)(configPath) : null;
};
exports.getRootDir = getRootDir;
const isStringArray = (x) => Array.isArray(x) && x.every((x) => typeof x === "string");
exports.isStringArray = isStringArray;
const getFullScopePath = (exportDir, scope) => {
    if (scope.startsWith(".")) {
        return (0, path_1.resolve)(exportDir, scope);
    }
    const rootDir = (0, exports.getRootDir)(exportDir);
    if (!rootDir)
        return null;
    return (0, path_1.resolve)(rootDir, scope);
};
exports.getFullScopePath = getFullScopePath;
const isSubPath = (path1, path2) => !(0, path_1.relative)(path1.toLowerCase(), path2.toLowerCase()).startsWith(".");
exports.isSubPath = isSubPath;
//# sourceMappingURL=utils.js.map