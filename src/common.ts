import path, { resolve } from "path";
import { escapeLeadingUnderscores } from "typescript";
import type { Program } from "typescript";
import { getPathOfTheNearestConfig, getRootDir } from "./utils";

export const SCOPE_FILE_NAME = "scope.ts";

// const getExportComments = (tsProgram: Program, exportFile: SourceFile, exportName: string) => {
//   const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
//   const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
//   const exportSymbolStartIndex = exportSymbol?.declarations?.[0]?.getStart() ?? 0;

//   let exportStatementIndex = -1;
//   while (exportFile.statements[++exportStatementIndex].getEnd() < exportSymbolStartIndex);

//   const prevStatementEndIndex = exportFile.statements?.[exportStatementIndex - 1]?.getEnd() ?? 0;
//   const exportStatementStartIndex = exportFile.statements[exportStatementIndex].getStart();
//   return exportFile.getFullText().slice(prevStatementEndIndex, exportStatementStartIndex);
// };

export const checkIsAccessible = ({
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
  const importDir = path.dirname(importPath);
  let scope: string | undefined;

  if (!exportFile) return true;

  // 1) parse local scope
  if (exportName) {
    const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
    const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
    exportSymbol?.getJsDocTags().forEach((tag) => {
      if (tag.name === "scopeException") {
        const exception = tag.text?.at(0)?.text;
        if (!exception) return;

        const exceptionFullPath = resolve(exportDir, exception);

        if (!path.relative(exceptionFullPath.toLowerCase(), importDir.toLowerCase()).startsWith(".")) {
          return true;
        }
      }

      if (tag.name === "scope") {
        scope = tag.text?.at(0)?.text;
      }
    });
  }

  // 2) parse file scope
  if (!scope) {
    const firstStatementEndIndex = exportFile.statements[0].getEnd();
    const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
    [, scope] = fileComments.match(/@scopeDefault\s+([^\s]+)/) ?? [];
  }

  // 3) parse folder scope
  if (!scope) {
    const scopeConfigPath = getPathOfTheNearestConfig(exportDir, SCOPE_FILE_NAME);
    const scopeFile = scopeConfigPath && tsProgram.getSourceFile(scopeConfigPath);

    if (scopeFile) {
      const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(scopeFile);
      const exportSymbols = symbols?.exports?.get(escapeLeadingUnderscores("default"));

      console.log(exportSymbols);

      // const fileText = fs.readFileSync(scopeConfigPath, "utf8");

      // const isWhitelisted = fileText.split("\n").some((relativePath) => {
      //   const whitelistedPath = path.resolve(path.dirname(scopeConfigPath), relativePath);

      //   return new RegExp(`^${whitelistedPath}($|${path.sep}.*)`, "i").test(importPath);
      // });

      // if (isWhitelisted) return true;
    }
  }

  // 4) handle index files
  scope ??= path.parse(exportFile.fileName).name === "index" ? ".." : ".";

  if (scope === "*") return true;

  let fullScopePath: string;
  if (scope.startsWith(".")) {
    fullScopePath = path.resolve(exportDir, scope);
  } else {
    const rootDir = getRootDir(exportDir);
    if (!rootDir) return true;

    fullScopePath = path.resolve(rootDir, scope);
  }

  return !path.relative(fullScopePath, importDir).startsWith(".");
};
