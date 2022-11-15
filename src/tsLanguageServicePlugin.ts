import("typescript/lib/tsserverlibrary");
import { checkIsAccessible, Config } from "./common";

export function tsLanguageServicePlugin() {
  function create(info: ts.server.PluginCreateInfo) {
    const { strictMode } = info.config as Config;
    const proxy = { ...info.languageService };

    proxy.getCompletionsAtPosition = (importPath, ...args) => {
      const original = info.languageService.getCompletionsAtPosition(importPath, ...args);
      const tsProgram = info.languageService.getProgram();

      if (!original || !tsProgram) return original;

      const filtered = original?.entries.filter((entry) => {
        if (entry.kindModifiers !== "export") return true;

        // TODO: `import {%named export%} from '';` will not have entry.data, but should still be handled
        if (!entry.data) return true;

        const { exportName, fileName: exportPath } = entry.data;

        return checkIsAccessible({ tsProgram, importPath, exportPath, exportName, strictMode });
      });

      return { ...original, entries: filtered ?? [] };
    };

    proxy.getCodeFixesAtPosition = (importPath, ...args) => {
      const original = info.languageService.getCodeFixesAtPosition(importPath, ...args);
      const tsProgram = info.languageService.getProgram();

      if (!tsProgram) return original;

      return original.filter((fix) => {
        if (fix.fixName !== "import") return true;

        const importMatch = /['"]([^'"]+?)['"][^'"]*['"]([^'"]+?)['"]/;
        // TODO: find a more reliable source of this data
        const [, exportName, relativeExportPath] = fix.description.match(importMatch) ?? [];

        if (!relativeExportPath) return true;

        const exportPath = info.project.resolveModuleNames([relativeExportPath], importPath)[0]?.resolvedFileName;

        return checkIsAccessible({ tsProgram, importPath, exportPath, exportName, strictMode });
      });
    };

    return proxy;
  }

  return { create };
}
