import type { LanguageService, server } from "typescript";
import { checkIsAccessible } from "../common";

export const getCodeFixesAtPosition =
  (ts: typeof import("typescript"), info: server.PluginCreateInfo): LanguageService["getCodeFixesAtPosition"] =>
  (importPath, ...args) => {
    const ls = info.languageService;
    const fixes = ls.getCodeFixesAtPosition(importPath, ...args);
    const tsProgram = ls.getProgram();

    if (!tsProgram) return fixes;

    return fixes.filter((fix) => {
      if (fix.fixName !== "import") return true;

      const exportPathRegex = /["]([^"]+?)["]$/;
      // TODO: find a more reliable source of this data
      const [, relativeExportPath] = fix.description.match(exportPathRegex) ?? [];
      const exportName = fix.changes?.[0].textChanges?.[0].newText.replace(/[{} ]/g, "");

      if (!relativeExportPath) return true;

      const { resolvedModule } = ts.resolveModuleName(
        relativeExportPath,
        importPath,
        info.project.getCompilerOptions(),
        ts.sys,
      );

      const exportPath = resolvedModule?.resolvedFileName;

      return checkIsAccessible({ tsProgram, importPath, exportPath, exportName });
    });
  };
