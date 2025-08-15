import path from "path";
import fs from "fs";
import { SymbolFlags, type Program } from "typescript";
import { getFullScopePath, getRootDir, isSubPath } from "./utils";
import {
  SCOPE_DEFAULT_JS_FILE_NAME,
  SCOPE_DEFAULT_TS_FILE_NAME,
  SCOPE_JS_FILE_NAME,
  SCOPE_TS_FILE_NAME,
} from "./constants";
import { parseScopeFile } from "./parseScopeFile";

export const checkIsImportable = ({
  tsProgram,
  importPath,
  exportPath,
  exportName,
}: {
  tsProgram: Program;
  importPath: string | undefined;
  exportPath: string | undefined;
  exportName?: string;
}) => {
  if (!importPath || !exportPath || exportPath.includes("node_modules")) return true;

  const exportFile = tsProgram.getSourceFile(exportPath);
  const exportDir = path.dirname(exportPath);
  let scope: string | undefined;

  if (!exportFile) return true;

  const isIndexFile = path.parse(exportFile.fileName).name === "index";

  getLocalScope: {
    if (!exportName) break getLocalScope;
    const typeChecker = tsProgram.getTypeChecker();
    const fileSymbol = typeChecker.getSymbolAtLocation(exportFile);
    const exports = fileSymbol && typeChecker.getExportsOfModule(fileSymbol);
    let exportSymbol = exports?.find((x) => x.name === exportName);

    if (!exportSymbol) break getLocalScope;

    if (exportName !== "default" && exportSymbol.flags & SymbolFlags.Alias) {
      exportSymbol = typeChecker.getImmediateAliasedSymbol(exportSymbol);
    }

    const jsDocTags = exportSymbol?.getJsDocTags();

    if (!jsDocTags) break getLocalScope;

    for (const tag of jsDocTags) {
      if (tag.name === "scopeException") {
        const exception = tag.text?.at(0)?.text;
        if (!exception) continue;

        const exceptionFullPath = getFullScopePath(exportDir, exception);

        if (exceptionFullPath && isSubPath(exceptionFullPath, importPath)) {
          return true;
        }
      }

      if (tag.name === "scope") {
        scope = tag.text?.at(0)?.text;
      }
    }
  }

  getFileScope: {
    if (scope) break getFileScope;
    const firstStatementEndIndex = exportFile.statements[0]?.getEnd() ?? -1;
    const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
    [, scope] = fileComments.match(/@scopeDefault\s+([^\s]+)/) ?? [];
  }

  getFolderScope: {
    if (scope) break getFolderScope;

    let scopeFilePath: string | null = null;
    const rootDir = getRootDir(exportDir);

    // First, try regular scope files in current directory only
    for (const fileName of [SCOPE_TS_FILE_NAME, SCOPE_JS_FILE_NAME]) {
      const filePath = path.join(exportDir, fileName);
      if (fs.existsSync(filePath)) {
        scopeFilePath = filePath;
        break;
      }
    }

    // If index file, also check parent directory for regular scope files
    if (!scopeFilePath && isIndexFile) {
      const parentDir = path.dirname(exportDir);
      for (const fileName of [SCOPE_TS_FILE_NAME, SCOPE_JS_FILE_NAME]) {
        const filePath = path.join(parentDir, fileName);
        if (fs.existsSync(filePath)) {
          scopeFilePath = filePath;
          break;
        }
      }
    }

    // Then, recursively look for default scope files in current directory and ancestors
    if (!scopeFilePath) {
      let currentDir = exportDir;
      while (currentDir !== path.dirname(currentDir)) {
        for (const fileName of [SCOPE_DEFAULT_TS_FILE_NAME, SCOPE_DEFAULT_JS_FILE_NAME]) {
          const filePath = path.join(currentDir, fileName);
          if (fs.existsSync(filePath)) {
            scopeFilePath = filePath;
            break;
          }
        }

        if (scopeFilePath) break;

        // Stop when we reach or go beyond the root directory
        if (rootDir && currentDir === rootDir) break;
        currentDir = path.dirname(currentDir);
      }
    }

    // Parse the found scope file
    if (!scopeFilePath) break getFolderScope;

    try {
      const exports = parseScopeFile(scopeFilePath);
      scope = exports.scope;

      for (const exception of exports.exceptions) {
        const exceptionFullPath = getFullScopePath(exportDir, exception);
        if (!exceptionFullPath) continue;

        if (isSubPath(exceptionFullPath, importPath)) {
          return true;
        }
      }
    } catch {
      break getFolderScope;
    }
  }

  // handles index files
  scope ??= isIndexFile ? ".." : ".";

  if (scope === "*") return true;

  const fullScopePath = getFullScopePath(exportDir, scope);
  if (!fullScopePath) return true;

  return isSubPath(fullScopePath, importPath);
};
