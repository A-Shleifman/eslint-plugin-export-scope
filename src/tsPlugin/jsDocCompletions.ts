import { getRootDir } from "../pathUtils";
import { ScriptElementKind, type WithMetadata, type CompletionInfo } from "typescript";
import {
  REGEXES,
  DIRECTIVE_NAMES,
  createCompletionEntry,
  parseDirectiveFromJSDoc,
  generateParentCompletions,
  generateFileSystemCompletions,
  getPartialDirectiveCompletions,
} from "./completionUtils";

export const jsDocCompletions = (
  importDir: string,
  completions: WithMetadata<CompletionInfo>,
  jsDoc: string,
  jsDocStartPos: number = 0
): WithMetadata<CompletionInfo> => {
  // Helper to add JSDoc properties if not already present
  const addJsDocProp = (name: string) => {
    if (completions.entries.every(entry => entry.name !== name)) {
      completions.entries.push(createCompletionEntry(name, ScriptElementKind.keyword));
    }
  };

  // Handle empty JSDoc or after @ symbol
  if (REGEXES.JSDOC_EMPTY.test(jsDoc)) {
    DIRECTIVE_NAMES.forEach(directive => addJsDocProp(directive));
    return completions;
  }

  if (REGEXES.JSDOC_AFTER_AT.test(jsDoc)) {
    ["scope", "scopeDefault", "scopeException"].forEach(name => addJsDocProp(name));
    return completions;
  }

  // Handle partial directive completion like "@scop"
  const partialDirectiveResult = getPartialDirectiveCompletions(jsDoc, jsDocStartPos, completions);
  if (partialDirectiveResult) {
    return partialDirectiveResult;
  }

  // Get root directory for path operations
  const rootDir = getRootDir(importDir);
  if (!rootDir) return completions;

  // Parse directive with partial path
  const directiveMatch = parseDirectiveFromJSDoc(jsDoc, jsDocStartPos);
  if (!directiveMatch) return completions;

  const { partialPath, startPos, directive } = directiveMatch;
  const config = { rootDir, importDir, partialPath, startPos };

  // Return appropriate completions based on directive type
  if (directive === "@scopeException") {
    // For @scopeException, combine both filesystem and parent completions
    const filesystemCompletions = generateFileSystemCompletions(config);
    const parentCompletions = generateParentCompletions(config);
    
    return {
      ...filesystemCompletions,
      entries: [...filesystemCompletions.entries, ...parentCompletions.entries],
    };
  } else {
    return generateParentCompletions(config);
  }
};
