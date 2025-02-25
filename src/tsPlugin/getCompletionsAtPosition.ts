import { ScriptElementKind, type LanguageService, type server } from "typescript";
import { SCOPE_JS_FILE_NAME, SCOPE_TS_FILE_NAME, checkIsImportable } from "../checkIsImportable";
import { basename, dirname } from "path";
import { getNewCompletions } from "./tsUtils";

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

    if ([SCOPE_TS_FILE_NAME, SCOPE_JS_FILE_NAME].includes(basename(importPath))) {
      return getScopeFileCompletions(ts, importDir, fileTextToPosition) ?? original;
    }

    {
      // -------------- snippets --------------
      const lastLine = fileTextToPosition.split("\n").at(-1)?.trimStart();
      // autocompletion in VSCode only triggers direcly after @ symbol
      const snippetTriggerFound = ["@scope", "@scopeDefault", "@scopeException"].some(
        (x) => lastLine && x.startsWith(lastLine),
      );

      if (snippetTriggerFound) {
        const atSnippet = (name: string): CompletionEntry => ({
          name: `@${name}`,
          kind: ScriptElementKind.unknown,
          kindModifiers: "",
          sortText: "10",
          isSnippet: true,
          insertText: `/** @${name} ${"${0}"} */`,
          replacementSpan: { start: position - 1, length: 1 },
        });

        return {
          ...getNewCompletions(),
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
        return jsDocCompletions(importDir, original ?? getNewCompletions(), fileTextToPosition.slice(lastJSDocPos));
      }
    }

    // -------------- accessibility validation --------------

    if (!original || !tsProgram) return original;

    const filtered = original.entries.filter((entry) => {
      if (entry.kind !== ScriptElementKind.alias && entry.kindModifiers !== "export") return true;

      let exportPath = entry.data?.fileName;

      if (!exportPath) {
        const symbol = ls.getCompletionEntrySymbol(importPath, position, entry.name, undefined);
        exportPath = symbol?.declarations?.[0]?.getSourceFile().fileName;
      }

      return checkIsImportable({ tsProgram, importPath, exportPath, exportName: entry.name });
    });

    return { ...original, entries: filtered ?? [] };
  };
