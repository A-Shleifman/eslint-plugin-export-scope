import path from "path";
import fs from "fs";
import { escapeLeadingUnderscores } from "typescript";
import type { Program, SourceFile } from "typescript";
import { getPathOfTheNearestConfig } from "./utils";

export const SCOPE_FILE_NAME = "scope.ts";
const _SCOPE_REGEXP = /\[\^(\d+|\*)\]/;
const SCOPE_REGEXP = new RegExp(`(?<!default)${_SCOPE_REGEXP.source}`);
const DEFAULT_SCOPE_REGEXP = new RegExp(`default${_SCOPE_REGEXP.source}`);

const getExportComments = (tsProgram: Program, exportFile: SourceFile, exportName: string) => {
  const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
  const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
  const exportSymbolStartIndex = exportSymbol?.declarations?.[0]?.getStart() ?? 0;

  let exportStatementIndex = -1;
  while (exportFile.statements[++exportStatementIndex].getEnd() < exportSymbolStartIndex);

  const prevStatementEndIndex = exportFile.statements?.[exportStatementIndex - 1]?.getEnd() ?? 0;
  const exportStatementStartIndex = exportFile.statements[exportStatementIndex].getStart();
  return exportFile.getFullText().slice(prevStatementEndIndex, exportStatementStartIndex);
};

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
  let scopeUpLevels: string | undefined;

  if (!exportFile) return true;

  // 1) parse local tag
  if (exportName) {
    const comments = getExportComments(tsProgram, exportFile, exportName);
    const [, localScopeUpLevels] = comments.match(SCOPE_REGEXP) ?? [];
    scopeUpLevels = localScopeUpLevels;
  }

  // 2) parse file tag
  if (!scopeUpLevels) {
    const firstStatementEndIndex = exportFile.statements[0].getEnd();
    const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
    const [, fileScopeUpLevels] = fileComments.match(DEFAULT_SCOPE_REGEXP) ?? [];
    scopeUpLevels = fileScopeUpLevels ?? scopeUpLevels;
  }

  // 3) parse scope files
  if (!scopeUpLevels) {
    const scopeConfigPath = getPathOfTheNearestConfig(exportDir, SCOPE_FILE_NAME);

    if (scopeConfigPath) {
      // [, scopeUpLevels] = nearestScopeConfigFileName.match(SCOPE_REGEXP) ?? [];
      const fileText = fs.readFileSync(scopeConfigPath, "utf8");
      // console.debug("reading file", scopeConfigPath);

      const isWhitelisted = fileText.split("\n").some((relativePath) => {
        const whitelistedPath = path.resolve(path.dirname(scopeConfigPath), relativePath);

        return new RegExp(`^${whitelistedPath}($|${path.sep}.*)`, "i").test(importPath);
      });

      if (isWhitelisted) return true;
    }
  }

  // 4) handle index files
  scopeUpLevels ??= path.parse(exportFile.fileName).name === "index" ? "1" : "0";

  if (scopeUpLevels === "*") return true;

  let scopeDir = exportDir;
  for (let i = 0; i < Number(scopeUpLevels); i++) {
    scopeDir = path.dirname(scopeDir);
  }

  // const scopeDir = scopePath ? path.resolve(exportDir, scopePath) : exportDir;
  return !path.relative(scopeDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
