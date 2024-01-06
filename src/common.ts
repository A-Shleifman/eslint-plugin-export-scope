import path from "path";
import { escapeLeadingUnderscores, Program, SourceFile } from "typescript";

// export type Config = {
//   strictMode?: boolean;
// };

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
  let scopePath: string | undefined;

  if (!exportFile) return true;

  // 1) parse path tag
  const [, pathTag] = exportPath.match(/.*\/(@\.*)/) ?? [];
  if (pathTag) {
    // `...` => `../..`
    const slashfulPath = [...(pathTag.slice(2) ?? [])].fill("..").join(path.sep) || ".";
    scopePath = pathTag === "@" ? "*" : slashfulPath;
  }

  // 2) parse file tag
  const firstStatementEndIndex = exportFile.statements[0].getEnd();
  const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
  const [, fileTagPath] = fileComments.match(/@scope\s+default\s+([./*]+)/) ?? [];
  scopePath = fileTagPath ? fileTagPath : scopePath;

  // 3) parse local tag
  if (exportName) {
    const comments = getExportComments(tsProgram, exportFile, exportName);
    const [, localTagPath] = comments.match(/@scope\s+([./*]+)/) ?? [];
    scopePath = localTagPath ? localTagPath : scopePath;
  }

  // 4) defer to project settings
  // TODO: handle strict mode alternative
  scopePath ??= path.parse(exportFile.fileName).name === "index" ? ".." : ".";

  if (!scopePath || scopePath === "*") return true;

  scopePath = scopePath.replaceAll("/", path.sep);

  const scopeDir = scopePath ? path.resolve(exportDir, scopePath) : exportDir;
  return !path.relative(scopeDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};

export const cast = <T>(param: T) => param;
