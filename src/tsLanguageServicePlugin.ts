import { ScriptElementKind, type server } from "typescript";
import { checkIsAccessible, getRootDir } from "./common";
import { basename, dirname, relative } from "path";
import { getParentSuggestions, entry, getNewSuggestions } from "./tsUtils";

import type { WithMetadata, CompletionInfo } from "typescript";

export function tsLanguageServicePlugin(modules: { typescript: typeof import("typescript") }) {
  const ts = modules.typescript;

  function create(info: server.PluginCreateInfo) {
    const ls = info.languageService;
    const proxy = { ...ls };

    proxy.getCompletionsAtPosition = (importPath, position, ...args): WithMetadata<CompletionInfo> | undefined => {
      const tsProgram = ls.getProgram();
      const importDir = dirname(importPath);

      const original = ls.getCompletionsAtPosition(importPath, position, ...args);
      const file = tsProgram?.getSourceFile(importPath);
      const fileTextToPosition = file?.getFullText().slice(0, position);

      if (!fileTextToPosition) return original;

      if (basename(importPath) === "scope.ts") {
        const lastLine = fileTextToPosition.split("\n").pop() ?? "";

        const stack: string[] = [];
        lastLine.split("").forEach((c) => {
          if (c === `'` || c === `"` || c === "`") {
            if (stack.at(-1) === c) {
              stack.pop();
            } else {
              stack.push(c);
            }
          }
        });

        const openQuote = stack.at(-1);

        if (openQuote) {
          const rootDir = getRootDir(importDir);

          if (!rootDir) return original;

          const lastExportDefaultPos = fileTextToPosition.lastIndexOf("export default");
          const lastExportPos = fileTextToPosition.lastIndexOf("export");
          const isDefaultExport = lastExportDefaultPos === lastExportPos;
          if (isDefaultExport) {
            return getParentSuggestions(rootDir, importDir);
          }

          const paths = ts.sys.readDirectory(rootDir, [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"], ["node_modules"]);

          const relativePaths = paths.map((x) => relative(rootDir, x));

          const dirs = relativePaths.reduce((acc, path) => {
            path = dirname(path); // removes filename

            while (path !== ".") {
              acc.add(path);
              path = dirname(path);
            }

            return acc;
          }, new Set<string>());

          return {
            ...getNewSuggestions(),
            entries: [
              ...[...dirs].map((x) => entry(x, ScriptElementKind.directory)),
              ...relativePaths.map((x) => entry(x, ScriptElementKind.moduleElement)),
            ],
          };
        }
      }

      const snippetTriggerFound = /^\s+(@)$/m.test(fileTextToPosition);

      if (snippetTriggerFound) {
        return {
          ...getNewSuggestions(),
          isGlobalCompletion: true,
          entries: [
            {
              name: "@scope",
              kind: ScriptElementKind.unknown,
              kindModifiers: "",
              sortText: "10",
              isSnippet: true,
              insertText: "/** @scope ${0} */",
              replacementSpan: {
                start: position - 1,
                length: 1,
              },
            },
          ],
        };
      }

      const lastJSDocPos = fileTextToPosition.lastIndexOf("/**");
      const lastClosingJSDocPos = fileTextToPosition.lastIndexOf("*/");

      if (lastClosingJSDocPos < lastJSDocPos) {
        const jsdoc = fileTextToPosition.slice(lastJSDocPos);

        const suggestions = original ?? getNewSuggestions();

        const isEmpty = /^\/\*\*(\*|\s)*$/m.test(jsdoc);
        if (isEmpty && suggestions.entries.every((x) => x.name !== "@scope")) {
          suggestions.entries.push(entry("@scope", ScriptElementKind.keyword));
        }

        const isAfterAtSymbol = /^\/\*\*(\*|\s)*@$/m.test(jsdoc);
        if (isAfterAtSymbol && suggestions.entries.every((x) => x.name !== "scope")) {
          suggestions.entries.push(entry("scope", ScriptElementKind.keyword));
        }

        const isAfterScopeDeclaration = /^\/\*\*(\*|\s)*@scope\s+$/m.test(jsdoc);
        if (isAfterScopeDeclaration) {
          const rootDir = getRootDir(importDir);

          return rootDir ? getParentSuggestions(rootDir, importDir) : suggestions;
        }

        return suggestions;
      }

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
