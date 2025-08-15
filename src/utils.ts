import { readdirSync } from "fs";
import { dirname, resolve } from "path";

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

export const getFullScopePath = (exportDir: string, scope: string) => {
  if (scope.startsWith(".")) {
    return resolve(exportDir, scope);
  }

  const rootDir = getRootDir(exportDir);
  if (!rootDir) return null;

  return resolve(rootDir, scope);
};

export { sameOrSubPath as isSubPath } from "./paths";
