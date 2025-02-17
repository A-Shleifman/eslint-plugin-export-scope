import path from "path";
import { SymbolFlags, type Program, type __String } from "typescript";
import { getFullScopePath, getRootDir, isSubPath } from "./utils";
import { isArrayLiteralExpression, isExportAssignment, isVariableDeclaration } from "./tsPlugin/tsUtils";

export const SCOPE_TS_FILE_NAME = ".scope.ts";
export const SCOPE_JS_FILE_NAME = ".scope.js";

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
    let scopeFile = tsProgram.getSourceFile(path.join(exportDir, SCOPE_TS_FILE_NAME));
    scopeFile ??= tsProgram.getSourceFile(path.join(exportDir, SCOPE_JS_FILE_NAME));

    if (isIndexFile) {
      const parentDir = path.dirname(exportDir);
      scopeFile ??= tsProgram.getSourceFile(path.join(parentDir, SCOPE_TS_FILE_NAME));
      scopeFile ??= tsProgram.getSourceFile(path.join(parentDir, SCOPE_JS_FILE_NAME));
    }

    if (!scopeFile) {
      const rootDir = getRootDir(exportDir);
      if (rootDir) {
        scopeFile ??= tsProgram.getSourceFile(path.join(rootDir, SCOPE_TS_FILE_NAME));
        scopeFile ??= tsProgram.getSourceFile(path.join(rootDir, SCOPE_JS_FILE_NAME));
      }
    }

    if (!scopeFile) break getFolderScope;

    const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(scopeFile);
    const defaultExportValDecl = symbols?.exports?.get("default" as __String)?.valueDeclaration;
    const exceptionsValDecl = symbols?.exports?.get("exceptions" as __String)?.valueDeclaration;

    if (isExportAssignment(defaultExportValDecl)) {
      scope = defaultExportValDecl.expression.getText().slice(1, -1);
    }

    if (isVariableDeclaration(exceptionsValDecl) && isArrayLiteralExpression(exceptionsValDecl.initializer)) {
      const exceptions = exceptionsValDecl.initializer.elements.map((x) => x.getText());

      for (const exception of exceptions) {
        const exceptionFullPath = getFullScopePath(exportDir, exception.slice(1, -1));
        if (!exceptionFullPath) continue;

        if (isSubPath(exceptionFullPath, importPath)) {
          return true;
        }
      }
    }
  }

  // handles index files
  scope ??= isIndexFile ? ".." : ".";

  if (scope === "*") return true;

  const fullScopePath = getFullScopePath(exportDir, scope);
  if (!fullScopePath) return true;

  return isSubPath(fullScopePath, importPath);
};
