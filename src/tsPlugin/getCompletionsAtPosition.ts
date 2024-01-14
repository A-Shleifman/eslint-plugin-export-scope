import { ScriptElementKind, type LanguageService, type server } from "typescript";
import { checkIsAccessible } from "../common";
import { basename, dirname } from "path";
import { getNewSuggestions } from "./tsUtils";

import type { WithMetadata, CompletionInfo, CompletionEntry } from "typescript";
import { getScopeFileCompletions } from "./scopeFileCompletions";
import { jsDocCompletions } from "./jsDocCompletions";

export const getCompletionsAtPosition =
  (ts: typeof import("typescript"), info: server.PluginCreateInfo): LanguageService["getCompletionsAtPosition"] =>
  (importPath, position, ...args): WithMetadata<CompletionInfo> | undefined => {
    const ls = info.languageService;
    const tsProgram = ls.getProgram();
    const importDir = dirname(importPath);

    const original = ls.getCompletionsAtPosition(importPath, position, ...args);
    const file = tsProgram?.getSourceFile(importPath);
    const fileTextToPosition = file?.getFullText().slice(0, position);

    if (!fileTextToPosition) return original;

    if (basename(importPath) === "scope.ts") {
      return getScopeFileCompletions(ts, importDir, fileTextToPosition) ?? original;
    }

    {
      // -------------- snippets --------------
      const snippetTriggerFound = /\n\s+(@)$/.test(fileTextToPosition);

      const atSnippet = (name: string): CompletionEntry => ({
        name: `@${name}`,
        kind: ScriptElementKind.unknown,
        kindModifiers: "",
        sortText: "10",
        isSnippet: true,
        insertText: `/** @s${name} ${"${0}"} */`,
        replacementSpan: { start: position - 1, length: 1 },
      });

      if (snippetTriggerFound) {
        return {
          ...getNewSuggestions(),
          isGlobalCompletion: true,
          entries: [atSnippet("scope"), atSnippet("scopeDefault"), atSnippet("scopeException")],
        };
      }
    }

    {
      // -------------- jsdoc completions --------------
      const lastJSDocPos = fileTextToPosition.lastIndexOf("/**");
      const lastClosingJSDocPos = fileTextToPosition.lastIndexOf("*/");
      if (lastClosingJSDocPos < lastJSDocPos) {
        return jsDocCompletions(importDir, original ?? getNewSuggestions(), fileTextToPosition.slice(lastJSDocPos));
      }
    }

    // -------------- accessibility validation --------------

    if (!original || !tsProgram) return original;

    const filtered = original.entries.filter((entry) => {
      if (entry.kindModifiers !== "export") return true;

      const symbol = ls.getCompletionEntrySymbol(importPath, position, entry.name, undefined);
      const exportPath = symbol?.declarations?.[0].getSourceFile().fileName;

      return checkIsAccessible({ tsProgram, importPath, exportPath, exportName: entry.name });
    });

    return { ...original, entries: filtered ?? [] };
  };
