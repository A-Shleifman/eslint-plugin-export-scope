import path from "path";
import { escapeLeadingUnderscores, Program, SourceFile } from "typescript";

export type Config = {
  strictMode?: boolean;
};

const PROPERTY_NAME = "package";

const getExportJsDoc = (tsProgram: Program, exportFile: SourceFile, exportName: string) => {
  const symbols = exportFile && tsProgram?.getTypeChecker().getSymbolAtLocation(exportFile);
  const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
  return exportSymbol?.getJsDocTags().find((tag) => tag.name === PROPERTY_NAME);
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
  let packagePath: string | undefined;

  if (!exportFile) return true;

  // 1) get package path from `@` path tags
  const [, pathTag] = exportPath.match(/.*\/(@\.*)/) ?? [];
  if (pathTag) {
    // `...` => `../..`
    const slashfulPath = [...(pathTag.slice(2) ?? [])].fill("..").join(path.sep) || ".";
    packagePath = pathTag === "@" ? "*" : slashfulPath;
  }

  // 2) get file package path
  const fileJsDoc = exportFile.getFullText().match(/\/\*\*[\s\S]*?\*\//)?.[0];
  const fileRegExp = new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`);
  const [filePackageTag, relativePath] = fileJsDoc?.match(fileRegExp) ?? [];
  packagePath = filePackageTag ? relativePath : packagePath;

  // 3) get local package path
  const localTag = getExportJsDoc(tsProgram, exportFile, exportName);
  packagePath = localTag?.text?.[0].text ?? packagePath;

  // 4) defer to project settings
  if (strictMode) {
    packagePath ??= path.parse(exportFile.fileName).name === "index" ? ".." : ".";
  }

  if (!packagePath || packagePath === "*") return true;

  packagePath = packagePath.replaceAll("/", path.sep);

  const packageDir = packagePath ? path.resolve(exportDir, packagePath.trim()) : exportDir;
  return !path.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};

export const cast = <T>(param: T) => param;
