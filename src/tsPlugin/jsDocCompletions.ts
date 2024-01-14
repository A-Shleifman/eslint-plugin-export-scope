import { getRootDir } from "../common";
import { getParentSuggestions, entry } from "./tsUtils";
import { ScriptElementKind, type WithMetadata, type CompletionInfo } from "typescript";

export const jsDocCompletions = (importDir: string, completions: WithMetadata<CompletionInfo>, jsDoc: string) => {
  const addJsDocProp = (name: string) => {
    if (completions.entries.every((x) => x.name !== name)) {
      completions.entries.push(entry(name, ScriptElementKind.keyword));
    }
  };

  const isEmpty = /(\/\*\*|\s\*)\s*$/.test(jsDoc);
  if (isEmpty) {
    addJsDocProp("@scope");
    addJsDocProp("@scopeDefault");
    addJsDocProp("@scopeException");
  }

  const isAfterAtSymbol = /(\/\*\*|\s\*)\s*@$/.test(jsDoc);
  if (isAfterAtSymbol) {
    addJsDocProp("scope");
    addJsDocProp("scopeDefault");
    addJsDocProp("scopeException");
  }

  const isAfterScopeDeclaration = /(@scope|@scopeDefault)\s+$/.test(jsDoc);
  if (isAfterScopeDeclaration) {
    const rootDir = getRootDir(importDir);

    if (rootDir) return getParentSuggestions(rootDir, importDir);
  }

  return completions;
};
