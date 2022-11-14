import path from "path";
import { escapeLeadingUnderscores, Program, SourceFile } from "typescript";

export type Config = {
  defaultProjectPackage?: string;
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
  defaultPackage,
}: {
  tsProgram: Program;
  importPath: string | undefined;
  exportPath: string | undefined;
  exportName: string | undefined;
  defaultPackage: string | undefined;
}) => {
  if (!importPath || !exportPath || !exportName) return true;

  const exportFile = tsProgram.getSourceFile(exportPath);
  const exportDir = path.dirname(exportPath);
  const importDir = path.dirname(importPath);

  if (!exportFile) return true;

  const localTag = getExportJsDoc(tsProgram, exportFile, exportName);

  // 1) get local package path
  let packageRelativePath = localTag?.text?.[0].text;

  // 2) get file package path
  if (!packageRelativePath) {
    const fileJsDoc = exportFile.getFullText().match(/\/\*\*[\s\S]*?\*\//)?.[0];

    const fileRegExp = new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`);
    const [filePackageTag, defaultFilePackageRelativePath] = fileJsDoc?.match(fileRegExp) ?? [];

    packageRelativePath = filePackageTag && defaultFilePackageRelativePath;
  }

  // 3) get project package path
  packageRelativePath ??= defaultPackage;

  if (!packageRelativePath) return true;

  const packageDir = packageRelativePath ? path.resolve(exportDir, packageRelativePath.trim()) : exportDir;
  return !path.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
