"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRootDir = exports.getPathOfTheNearestConfig = exports.getFileTree = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const common_1 = require("./common");
const getFileTree = (dir, extensions = [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"]) => {
    const extSet = new Set(extensions);
    const filePaths = [];
    const dirPaths = [];
    const traverse = (dir) => {
        const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        entries.map((x) => {
            if (x.name === common_1.SCOPE_FILE_NAME)
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
    const configPath = (0, exports.getPathOfTheNearestConfig)(originPath, "package.json");
    return configPath ? (0, path_1.dirname)(configPath) : null;
};
exports.getRootDir = getRootDir;
//# sourceMappingURL=utils.js.map