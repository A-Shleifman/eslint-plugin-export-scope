import { dirname, relative } from "path";
import { type WithMetadata, type CompletionInfo, type CompletionEntry, ScriptElementKind } from "typescript";

export const entry = (name: string, kind: CompletionEntry["kind"]): CompletionEntry => ({
  name,
  kind,
  kindModifiers: "",
  sortText: "10",
});

export const getNewSuggestions = (): WithMetadata<CompletionInfo> => ({
  isGlobalCompletion: false,
  isMemberCompletion: false,
  isNewIdentifierLocation: false,
  entries: [],
});

export const getParentSuggestions = (rootDir: string, importDir: string) => {
  const suggestions = getNewSuggestions();

  let currentDir = importDir;
  while (currentDir !== rootDir) {
    suggestions.entries.push(entry(relative(rootDir, currentDir), ScriptElementKind.directory));
    currentDir = dirname(currentDir);
  }

  const levelsUp = Math.min(3, suggestions.entries.length);

  suggestions.entries.push(entry(".", ScriptElementKind.directory));

  for (let i = 1; i <= levelsUp; i++) {
    suggestions.entries.push(entry(Array(i).fill("..").join("/"), ScriptElementKind.directory));
  }

  return suggestions;
};
