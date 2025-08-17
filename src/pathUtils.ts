import { readdirSync } from "fs";
import { dirname, resolve, relative, isAbsolute } from "path";

// Platform-aware path operations
const isWin = process.platform === "win32";
const fold = (s: string) => (isWin ? s.toLowerCase() : s);

/** child is same as base or inside base (logical tree only). */
export const sameOrSubPath = (base: string, child: string) => {
  const a = fold(resolve(base));
  const b = fold(resolve(child));
  if (a === b) return true;
  const rel = relative(a, b);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
};

export const toPosix = (p: string) => p.replace(/\\/g, "/");

// Config and root directory utilities
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

// Path validation types and utilities
export interface PathValidationResult {
  isValid: boolean;
  resolvedPath?: string;
  isAncestor?: boolean;
}

/**
 * Check if a path is an ancestor of the current directory (or is the current directory)
 */
export const isAncestorPath = (currentDir: string, targetPath: string): boolean => {
  // Use sameOrSubPath: target is ancestor if current is same or sub path of target
  return sameOrSubPath(targetPath, currentDir);
};

/**
 * Validate a scope path for export default, @scope, and @scopeDefault
 * These should only allow ancestor directories or "*"
 */
export const validateScopePath = (currentDir: string, scopePath: string): PathValidationResult => {
  // Always allow wildcard
  if (scopePath === "*") {
    return { isValid: true };
  }
  
  // Always allow current directory
  if (scopePath === ".") {
    return { isValid: true, resolvedPath: currentDir, isAncestor: true };
  }
  
  const fullPath = getFullScopePath(currentDir, scopePath);
  if (!fullPath) {
    return { isValid: false };
  }
  
  const isAncestor = isAncestorPath(currentDir, fullPath);
  
  return {
    isValid: isAncestor,
    resolvedPath: fullPath,
    isAncestor,
  };
};

/**
 * Validate an exception path - can be any valid path within the project
 */
export const validateExceptionPath = (currentDir: string, exceptionPath: string): PathValidationResult => {
  const rootDir = getRootDir(currentDir);
  if (!rootDir) {
    return { isValid: false };
  }
  
  const fullPath = getFullScopePath(currentDir, exceptionPath);
  if (!fullPath) {
    return { isValid: false };
  }
  
  // Check if path is within project root
  const relativePath = relative(rootDir, fullPath);
  const isWithinProject = !relativePath.startsWith("..") && !relativePath.includes("..");
  
  return {
    isValid: isWithinProject,
    resolvedPath: fullPath,
    isAncestor: isAncestorPath(currentDir, fullPath),
  };
};

/**
 * Generate all possible ancestor paths for autocompletion
 */
export const generateAncestorPaths = (currentDir: string, rootDir: string): string[] => {
  const paths: string[] = ["."];
  
  let current = currentDir;
  let levelsUp = 0;
  const maxLevels = 10; // Reasonable limit
  
  while (current !== rootDir && levelsUp < maxLevels) {
    current = dirname(current);
    levelsUp++;
    
    // Add relative path (../, ../../, etc.)
    const relativePath = Array(levelsUp).fill("..").join("/");
    paths.push(relativePath);
    
    // Add absolute path from root
    const relativeToRoot = relative(rootDir, current);
    if (relativeToRoot && relativeToRoot !== ".") {
      paths.push(relativeToRoot);
    }
  }
  
  return paths;
};

/**
 * Get path type for determining completion behavior
 */
export enum PathContextType {
  SCOPE_DEFAULT_EXPORT = "scope_default_export",
  SCOPE_JSDOC = "scope_jsdoc", 
  SCOPE_DEFAULT_JSDOC = "scope_default_jsdoc",
  SCOPE_EXCEPTION_JSDOC = "scope_exception_jsdoc",
  EXCEPTIONS_ARRAY = "exceptions_array",
}

export const getPathContext = (text: string, position: number): PathContextType | null => {
  const textBeforePosition = text.substring(0, position);
  
  // Check for export default in .scope files
  if (textBeforePosition.includes("export default") && text.includes(".scope.")) {
    return PathContextType.SCOPE_DEFAULT_EXPORT;
  }
  
  // Check for JSDoc contexts
  if (textBeforePosition.includes("@scope ") && !textBeforePosition.includes("@scopeDefault") && !textBeforePosition.includes("@scopeException")) {
    return PathContextType.SCOPE_JSDOC;
  }
  
  if (textBeforePosition.includes("@scopeDefault")) {
    return PathContextType.SCOPE_DEFAULT_JSDOC;
  }
  
  if (textBeforePosition.includes("@scopeException")) {
    return PathContextType.SCOPE_EXCEPTION_JSDOC;
  }
  
  // Check for exceptions array
  if (textBeforePosition.includes("export const exceptions")) {
    return PathContextType.EXCEPTIONS_ARRAY;
  }
  
  return null;
};

// Re-export for backward compatibility
export { sameOrSubPath as isSubPath };