import { readdirSync } from "fs";
import { dirname, extname, resolve } from "path";
import { SCOPE_FILE_NAME } from "./common";

export const getFileTree = (dir: string, extensions = [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"]) => {
  const extSet = new Set(extensions);
  const filePaths: string[] = [];
  const dirPaths: string[] = [];

  const traverse = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });

    entries.map((x) => {
      if (x.name === SCOPE_FILE_NAME) return;
      if (x.name === "node_modules" || x.name.startsWith(".")) return;

      const path = resolve(dir, x.name);

      if (x.isDirectory()) {
        dirPaths.push(path);
        return traverse(path);
      } else {
        if (extSet.has(extname(x.name))) {
          filePaths.push(path);
        }
      }
    });
  };

  traverse(dir);

  return { filePaths, dirPaths };
};

export const getPathOfTheNearestConfig = (originPath: string, configFileName: string) => {
  let currentDir = originPath;
  while (currentDir !== "/") {
    const fileNames = readdirSync(currentDir);
    const isFound = fileNames.some((x) => x === configFileName);

    if (isFound) {
      return resolve(currentDir, configFileName);
    }

    if (fileNames.includes("package.json")) {
      return null;
    }

    currentDir = dirname(currentDir);
  }

  return null;
};

export const getRootDir = (originPath: string) => {
  const configPath = getPathOfTheNearestConfig(originPath, "package.json");

  return configPath ? dirname(configPath) : null;
};
