import { readdirSync } from "fs";
import { dirname, extname, relative, resolve } from "path";
import { SCOPE_JS_FILE_NAME, SCOPE_TS_FILE_NAME } from "./checkIsImportable";

export const getFileTree = (dir: string, extensions = [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"]) => {
  const extSet = new Set(extensions);
  const filePaths: string[] = [];
  const dirPaths: string[] = [];

  const traverse = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });

    entries.map((x) => {
      if ([SCOPE_TS_FILE_NAME, SCOPE_JS_FILE_NAME].includes(x.name)) return;
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

const nearestConfigMap = new Map<string, string | null>();

export const getPathOfTheNearestConfig = (originPath: string, configFileName: string | string[]) => {
  const configFileNames = Array.isArray(configFileName) ? configFileName : [configFileName];

  const key = [originPath, configFileNames.join("_")].join("_");
  if (nearestConfigMap.has(key)) {
    return nearestConfigMap.get(key);
  }

  const cacheResult = (result: string | null) => {
    nearestConfigMap.set(key, result);

    // clear cache after 1 second
    setTimeout(() => nearestConfigMap.delete(key), 1000);

    return result;
  };

  let currentDir = originPath;
  while (currentDir !== "/") {
    const fileNames = readdirSync(currentDir);
    const fileName = fileNames.find((x) => configFileNames.includes(x));

    if (fileName) {
      return cacheResult(resolve(currentDir, fileName));
    }

    if (fileNames.includes("package.json")) {
      return cacheResult(null);
    }

    currentDir = dirname(currentDir);
  }

  return cacheResult(null);
};

export const getRootDir = (originPath: string) => {
  const configPath = getPathOfTheNearestConfig(originPath, "package.json");

  return configPath ? dirname(configPath) : null;
};

export const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && x.every((x) => typeof x === "string");

export const getFullScopePath = (exportDir: string, scope: string) => {
  if (scope.startsWith(".")) {
    return resolve(exportDir, scope);
  }

  const rootDir = getRootDir(exportDir);
  if (!rootDir) return null;

  return resolve(rootDir, scope);
};

export const isSubPath = (path1: string, path2: string) =>
  !relative(path1.toLowerCase(), path2.toLowerCase()).startsWith(".");
