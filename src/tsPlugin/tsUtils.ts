import { dirname, relative } from "path";
import { type WithMetadata, type CompletionInfo, type CompletionEntry, ScriptElementKind } from "typescript";

export const entry = (name: string, kind: CompletionEntry["kind"]): CompletionEntry => ({
  name,
  kind,
  kindModifiers: "",
  sortText: "10",
});

export const getNewCompletions = (): WithMetadata<CompletionInfo> => ({
  isGlobalCompletion: false,
  isMemberCompletion: false,
  isNewIdentifierLocation: false,
  entries: [],
});

export const getParentCompletions = (rootDir: string, importDir: string) => {
  const completions = getNewCompletions();

  let currentDir = importDir;
  while (currentDir !== rootDir) {
    completions.entries.push(entry(relative(rootDir, currentDir), ScriptElementKind.directory));
    currentDir = dirname(currentDir);
  }

  const levelsUp = Math.min(3, completions.entries.length);

  completions.entries.push(entry(".", ScriptElementKind.directory));

  for (let i = 1; i <= levelsUp; i++) {
    completions.entries.push(entry(Array(i).fill("..").join("/"), ScriptElementKind.directory));
  }

  return completions;
};
