import { dirname, relative } from "path";
import { getRootDir, getFullScopePath } from "./utils";
import { sameOrSubPath } from "./paths";

export interface PathValidationResult {
  isValid: boolean;
  resolvedPath?: string;
  isAncestor?: boolean;
}

/**
 * Check if a path is an ancestor of the current directory (or is the current directory)
 * Works without TypeScript program dependency
 */
export const isAncestorPath = (currentDir: string, targetPath: string): boolean => {
  // Use existing utility: target is ancestor if current is same or sub path of target
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