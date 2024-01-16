import path from "path";
import { escapeLeadingUnderscores } from "typescript";
import type { Program } from "typescript";
import { getFullScopePath, getPathOfTheNearestConfig, isStringArray, isSubPath } from "./utils";

export const SCOPE_FILE_NAME = ".scope.ts";

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

  getLocalScope: {
    if (!exportName) break getLocalScope;
    const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
    const jsDocTags = symbols?.exports?.get(escapeLeadingUnderscores(exportName))?.getJsDocTags();

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
    const firstStatementEndIndex = exportFile.statements[0].getEnd();
    const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
    [, scope] = fileComments.match(/@scopeDefault\s+([^\s]+)/) ?? [];
  }

  getFolderScope: {
    if (scope) break getFolderScope;
    const scopeConfigPath = getPathOfTheNearestConfig(exportDir, SCOPE_FILE_NAME);
    const scopeFile = scopeConfigPath && tsProgram.getSourceFile(scopeConfigPath);

    if (!scopeFile) break getFolderScope;

    const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(scopeFile);
    const defaultExportValDecl = symbols?.exports?.get(escapeLeadingUnderscores("default"))?.valueDeclaration;
    const exceptionsValDecl = symbols?.exports?.get(escapeLeadingUnderscores("exceptions"))?.valueDeclaration;

    // @ts-expect-error: ts.isExportAssignment is missing in ESLint plugin
    const text = defaultExportValDecl?.expression?.getText?.();
    if (typeof text === "string") {
      scope = text.slice(1, -1);
    }

    // @ts-expect-error: ts.isVariableDeclaration is missing in ESLint plugin
    const exceptions = exceptionsValDecl?.initializer?.elements?.map((x) => x?.getText());

    if (isStringArray(exceptions)) {
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
  scope ??= path.parse(exportFile.fileName).name === "index" ? ".." : ".";

  if (scope === "*") return true;

  const fullScopePath = getFullScopePath(exportDir, scope);
  if (!fullScopePath) return true;

  return isSubPath(fullScopePath, importPath);
};
