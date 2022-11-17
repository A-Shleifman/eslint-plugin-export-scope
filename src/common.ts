import path from "path";
import { escapeLeadingUnderscores, Program, SourceFile } from "typescript";

export type Config = {
  strictMode?: boolean;
};

const getExportComments = (tsProgram: Program, exportFile: SourceFile, exportName: string) => {
  const symbols = tsProgram.getTypeChecker().getSymbolAtLocation(exportFile);
  const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
  const exportSymbolStartIndex = exportSymbol?.valueDeclaration?.getStart() ?? 0;

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
  strictMode,
}: {
  tsProgram: Program;
  importPath: string | undefined;
  exportPath: string | undefined;
  exportName: string | undefined;
  strictMode: Config["strictMode"] | undefined;
}) => {
  if (!importPath || !exportPath || !exportName || exportPath.includes("node_modules")) return true;

  const exportFile = tsProgram.getSourceFile(exportPath);
  const exportDir = path.dirname(exportPath);
  const importDir = path.dirname(importPath);
  let privatePath: string | undefined;

  if (!exportFile) return true;

  // 1) parse path tag
  const [, pathTag] = exportPath.match(/.*\/(@\.*)/) ?? [];
  if (pathTag) {
    // `...` => `../..`
    const slashfulPath = [...(pathTag.slice(2) ?? [])].fill("..").join(path.sep) || ".";
    privatePath = pathTag === "@" ? "*" : slashfulPath;
  }

  // 2) parse file tag
  const firstStatementEndIndex = exportFile.statements[0].getEnd();
  const fileComments = exportFile.getFullText().slice(0, firstStatementEndIndex);
  const [fileTagMatch, fileTagModifier, fileTagPath] =
    fileComments.match(/@(private|public)\s+default\s*([./]*)/) ?? [];
  if (fileTagMatch) {
    privatePath = fileTagModifier === "public" ? "*" : fileTagPath || ".";
  }

  // 3) parse local tag
  const comments = getExportComments(tsProgram, exportFile, exportName);
  const [localTagMatch, localTagModifier, localTagPath] =
    comments.match(/(?!.+default)@(private|public)\s*([./]*)/) ?? [];
  if (localTagMatch) {
    privatePath = localTagModifier === "public" ? "*" : localTagPath || ".";
  }

  // 4) defer to project settings
  if (strictMode) {
    privatePath ??= path.parse(exportFile.fileName).name === "index" ? ".." : ".";
  }

  if (!privatePath || privatePath === "*") return true;

  privatePath = privatePath.replaceAll("/", path.sep);

  const scopeDir = privatePath ? path.resolve(exportDir, privatePath) : exportDir;
  return !path.relative(scopeDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};

export const cast = <T>(param: T) => param;
