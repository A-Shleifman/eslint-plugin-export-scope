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

  console.log({ packagePath: privatePath });

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
  const [fileTagMatch, , fileTagPath] = fileComments.match(/@private[\s]+default[\s]+((\.\S*|\*)[\s])?/) ?? [];
  privatePath = !fileTagMatch ? privatePath : fileTagPath ?? ".";

  // 3) parse local tag
  const comments = getExportComments(tsProgram, exportFile, exportName);
  // [^d] - ignores `@private default`
  const [localTagMatch, , , localTagPath] = comments.match(/@private(([\s]+(\.\S*|\*)[\s])|\s+[^d])/) ?? [];
  privatePath = !localTagMatch ? privatePath : localTagPath ?? ".";

  // 4) defer to project settings
  if (strictMode) {
    privatePath ??= path.parse(exportFile.fileName).name === "index" ? ".." : ".";
  }

  if (!privatePath || privatePath === "*") return true;

  privatePath = privatePath.replaceAll("/", path.sep);

  const packageDir = privatePath ? path.resolve(exportDir, privatePath) : exportDir;
  return !path.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};

export const cast = <T>(param: T) => param;
