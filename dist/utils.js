"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSubPath = exports.getFullScopePath = exports.isStringArray = exports.getRootDir = exports.getPathOfTheNearestConfig = exports.getFileTree = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const importabilityChecker_1 = require("./importabilityChecker");
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
const nearestConfigMap = new Map();
const getPathOfTheNearestConfig = (originPath, configFileName) => {
    const key = [originPath, configFileName].join("_");
    if (nearestConfigMap.has(key)) {
        return nearestConfigMap.get(key);
    }
    const cacheResult = (result) => {
        nearestConfigMap.set(key, result);
        // clear cache after 1 second
        setTimeout(() => nearestConfigMap.delete(key), 1000);
        return result;
    };
    console.log("LOOKING FOR THE NEAREST CONFIG!", originPath, configFileName);
    let currentDir = originPath;
    while (currentDir !== "/") {
        const fileNames = (0, fs_1.readdirSync)(currentDir);
        const isFound = fileNames.some((x) => x === configFileName);
        if (isFound) {
            return cacheResult((0, path_1.resolve)(currentDir, configFileName));
        }
        if (fileNames.includes("package.json")) {
            return cacheResult(null);
        }
        currentDir = (0, path_1.dirname)(currentDir);
    }
    return cacheResult(null);
};
exports.getPathOfTheNearestConfig = getPathOfTheNearestConfig;
const getRootDir = (originPath) => {
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