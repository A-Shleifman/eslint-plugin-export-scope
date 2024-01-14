import { relative } from "path";
import { getFileTree, getRootDir } from "../utils";
import { getParentCompletions, entry, getNewCompletions } from "./tsUtils";
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

  const rootDir = getRootDir(importDir);
  if (!rootDir) return completions;

  if (/(@scope|@scopeDefault)\s+([^\s]*)$/.test(jsDoc)) {
    return getParentCompletions(rootDir, importDir);
  }

  if (/@scopeException\s+([^\s]*)$/.test(jsDoc)) {
    const { filePaths, dirPaths } = getFileTree(rootDir);

    return {
      ...getNewCompletions(),
      entries: [
        ...dirPaths.map((x) => entry(relative(rootDir, x), ScriptElementKind.string)),
        ...filePaths.map((x) => entry(relative(rootDir, x), ScriptElementKind.string)),
      ],
    };
  }

  return completions;
};
