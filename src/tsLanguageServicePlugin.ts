import type { server } from "typescript";
import { checkIsAccessible } from "./common";

export function tsLanguageServicePlugin(modules: { typescript: typeof import("typescript") }) {
  const ts = modules.typescript;

  function create(info: server.PluginCreateInfo) {
    const ls = info.languageService;
    const proxy = { ...ls };

    proxy.getCompletionsAtPosition = (importPath, position, ...args) => {
      const tsProgram = ls.getProgram();
      const original = ls.getCompletionsAtPosition(importPath, position, ...args);

      if (!original || !tsProgram) return original;

      const filtered = original.entries.filter((entry) => {
        if (entry.kindModifiers !== "export") return true;

        const symbol = ls.getCompletionEntrySymbol(importPath, position, entry.name, undefined);
        const exportPath = symbol?.declarations?.[0].getSourceFile().fileName;

        return checkIsAccessible({ tsProgram, importPath, exportPath, exportName: entry.name });
      });

      return { ...original, entries: filtered ?? [] };
    };

    proxy.getCodeFixesAtPosition = (importPath, ...args) => {
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

    return proxy;
  }

  return { create };
}
