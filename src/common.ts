import path from "path";
import { escapeLeadingUnderscores, Program, SourceFile } from "typescript";

const PROPERTY_NAME = "package";

const getExportJsDoc = (tsProgram: Program, exportFile: SourceFile, exportName: string) => {
  const symbols = exportFile && tsProgram?.getTypeChecker().getSymbolAtLocation(exportFile);
  const exportSymbol = symbols?.exports?.get(escapeLeadingUnderscores(exportName));
  return exportSymbol?.getJsDocTags().find((tag) => tag.name === PROPERTY_NAME);
};

type checkIsAccessibleProps = {
  tsProgram: Program;
  importPath: string | undefined;
  exportPath: string | undefined;
  exportName: string | undefined;
};
export const checkIsAccessible = ({ tsProgram, importPath, exportPath, exportName }: checkIsAccessibleProps) => {
  if (!importPath || !exportPath || !exportName) return true;

  const exportFile = tsProgram.getSourceFile(exportPath);
  const exportDir = path.dirname(exportPath);
  const importDir = path.dirname(importPath);

  if (!exportFile) return true;

  const localTag = getExportJsDoc(tsProgram, exportFile, exportName);

  let packageRelativePath = localTag?.text?.[0].text;

  if (!localTag || packageRelativePath?.startsWith("default")) {
    const fileJsDoc = exportFile.getFullText().match(/\/\*\*[\s\S]*?\*\//)?.[0];

    const [defaultPackageTag, defaultPackageRelativePath] =
      fileJsDoc?.match(new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`)) ?? [];

    if (!defaultPackageTag) return true;

    packageRelativePath = defaultPackageRelativePath;
  }

  const packageDir = packageRelativePath ? path.resolve(exportDir, packageRelativePath.trim()) : exportDir;

  return !path.relative(packageDir.toLowerCase(), importDir.toLowerCase()).startsWith(".");
};
