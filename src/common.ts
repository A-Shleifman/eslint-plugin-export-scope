import path from "path";
import { escapeLeadingUnderscores, Program } from "typescript";

const PROPERTY_NAME = "package";

export const checkIsAccessible = ({
  tsProgram,
  importPath,
  exportPath,
  exportName,
}: {
  tsProgram: Program;
  importPath: string | undefined;
  exportPath: string | undefined;
  exportName: string | undefined;
}) => {
  if (!importPath || !exportPath || !exportName) return true;

  const exportDir = path.dirname(exportPath);
  const importDir = path.dirname(importPath);

  const exportFileNode = tsProgram.getSourceFile(exportPath);
  const typeChecker = tsProgram.getTypeChecker();

  if (!exportFileNode || !typeChecker) return true;

  const symbols = typeChecker.getSymbolAtLocation(exportFileNode);

  const tags = symbols?.exports?.get(escapeLeadingUnderscores(exportName))?.getJsDocTags();
  const localTag = tags?.find((tag) => tag.name === PROPERTY_NAME);

  let packageRelativePath = localTag?.text?.[0].text;

  if (!localTag || packageRelativePath?.startsWith("default")) {
    const fileJsDoc = exportFileNode.getFullText().match(/\/\*\*[\s\S]*?\*\//)?.[0];

    const [defaultPackageTag, defaultPackageRelativePath] =
      fileJsDoc?.match(new RegExp(`@${PROPERTY_NAME}[\\s]+default(\\s+[^\\s*]+)?`)) ?? [];

    if (!defaultPackageTag) return true;

    packageRelativePath = defaultPackageRelativePath;
  }

  const packageDir = packageRelativePath ? path.resolve(exportDir, packageRelativePath.trim()) : exportDir;
  return !path.relative(packageDir, importDir).startsWith(".");
};
