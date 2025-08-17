import { relative, dirname } from "path";
import { ScriptElementKind, type CompletionEntry, type WithMetadata, type CompletionInfo } from "typescript";
import { getNewCompletions, getAutocompletionFileTree } from "./tsUtils";
import { generateAncestorPaths } from "../pathValidation";

// Constants
export const COMPLETION_SORT_TEXT = "10";
export const COMPLETION_KIND_MODIFIERS = "";

export const DIRECTIVE_NAMES = ["@scope", "@scopeDefault", "@scopeException"] as const;
export type DirectiveName = typeof DIRECTIVE_NAMES[number];

// Cached regexes for better performance
export const REGEXES = {
  JSDOC_EMPTY: /(\/\*\*|\s\*)\s*$/,
  JSDOC_AFTER_AT: /(\/\*\*|\s\*)\s*@$/,
  JSDOC_PARTIAL_DIRECTIVE: /(\/\*\*|\s\*)\s*(@\w+)$/,
  QUOTE_PARTIAL: /['"](.*?)$/,
} as const;

// Directive-specific regexes (compiled once)
export const DIRECTIVE_REGEXES = {
  "@scope": /@scope\s+([^\s]*)$/,
  "@scopeDefault": /@scopeDefault\s+([^\s]*)$/,
  "@scopeException": /@scopeException\s+([^\s]*)$/,
} as const;

// Types
export interface ParsedPartialPath {
  partialPath: string;
  startPos: number;
  directive: DirectiveName;
}

export interface CompletionConfig {
  rootDir: string;
  importDir: string;
  partialPath: string;
  startPos: number;
}

// Core completion entry factory
export const createCompletionEntry = (
  name: string,
  kind: CompletionEntry["kind"],
  replacementSpan?: { start: number; length: number }
): CompletionEntry => ({
  name,
  kind,
  kindModifiers: COMPLETION_KIND_MODIFIERS,
  sortText: COMPLETION_SORT_TEXT,
  ...(replacementSpan && { replacementSpan }),
});

// Path-specific completion factory
export const createPathCompletion = (
  path: string,
  rootDir: string,
  config: { partialPath: string; startPos: number }
): CompletionEntry => {
  const relativePath = toPosix(relative(rootDir, path));
  return createCompletionEntry(
    relativePath,
    ScriptElementKind.string,
    {
      start: config.startPos,
      length: config.partialPath.length,
    }
  );
};

// Normalize path separators for cross-platform compatibility
const toPosix = (path: string): string => path.replace(/\\/g, "/");

// Unified path filtering
export const filterPathsByPartial = (paths: string[], partialPath: string, rootDir: string): string[] => {
  if (!partialPath) return paths;
  
  return paths.filter(path => {
    const relativePath = toPosix(relative(rootDir, path));
    return relativePath.startsWith(partialPath);
  });
};

// Parse directive with partial path from JSDoc
export const parseDirectiveFromJSDoc = (
  jsDoc: string, 
  jsDocStartPos: number
): ParsedPartialPath | null => {
  // Try each directive type
  for (const directive of DIRECTIVE_NAMES) {
    const regex = DIRECTIVE_REGEXES[directive];
    const match = jsDoc.match(regex);
    
    if (match) {
      const partialPath = match[1] || "";
      // Find position of the captured path text itself, not the directive
      const relativeStartPos = partialPath ? jsDoc.lastIndexOf(partialPath) : jsDoc.lastIndexOf(directive) + directive.length + 1;
      const absoluteStartPos = jsDocStartPos + relativeStartPos;
      
      return {
        partialPath,
        startPos: absoluteStartPos,
        directive,
      };
    }
  }
  
  return null;
};

// Parse partial path from quoted string in scope files
export const parsePartialPathFromQuotes = (
  line: string,
  lineStartInFile: number
): { partialPath: string; startPos: number } | null => {
  const quoteMatch = line.match(REGEXES.QUOTE_PARTIAL);
  if (!quoteMatch) return null;
  
  const partialPath = quoteMatch[1] || "";
  const lineStartPos = line.lastIndexOf(quoteMatch[0]) + 1; // +1 to skip quote
  const absoluteStartPos = lineStartInFile + lineStartPos;
  
  return { partialPath, startPos: absoluteStartPos };
};

// Generate parent directory completions
export const generateParentCompletions = (config: CompletionConfig): WithMetadata<CompletionInfo> => {
  const { rootDir, importDir, partialPath, startPos } = config;
  const completions = getNewCompletions();

  // Add all ancestor paths (both relative and absolute)
  const ancestorPaths = generateAncestorPaths(importDir, rootDir);
  
  ancestorPaths
    .filter(path => path.startsWith(partialPath))
    .forEach(path => {
      completions.entries.push(
        createCompletionEntry(path, ScriptElementKind.string, {
          start: startPos,
          length: partialPath.length,
        })
      );
    });

  // Add wildcard for global access
  if ("*".startsWith(partialPath)) {
    completions.entries.push(
      createCompletionEntry("*", ScriptElementKind.string, {
        start: startPos,
        length: partialPath.length,
      })
    );
  }

  return completions;
};

// Parse relative path to extract relative jumps and remaining path
const parseRelativePath = (partialPath: string) => {
  const parts = partialPath.split('/');
  let relativeJumps = 0;
  let remainingPath = '';
  
  let i = 0;
  while (i < parts.length && parts[i] === '..') {
    relativeJumps++;
    i++;
  }
  
  if (i < parts.length) {
    remainingPath = parts.slice(i).join('/');
  }
  
  return { relativeJumps, remainingPath };
};

// Calculate effective directory based on relative jumps
const calculateEffectiveDir = (importDir: string, relativeJumps: number): string => {
  let effectiveDir = importDir;
  for (let i = 0; i < relativeJumps; i++) {
    effectiveDir = dirname(effectiveDir);
  }
  return effectiveDir;
};

// Generate file system completions with relative path support
export const generateFileSystemCompletions = (config: CompletionConfig): WithMetadata<CompletionInfo> => {
  const { rootDir, importDir, partialPath, startPos } = config;
  
  // Parse relative path to handle ../../../packages/index.ts style paths
  const { relativeJumps, remainingPath } = parseRelativePath(partialPath);
  
  if (relativeJumps > 0) {
    // Calculate the effective directory based on relative jumps
    const effectiveDir = calculateEffectiveDir(importDir, relativeJumps);
    
    // Get file tree from the effective directory
    const { filePaths, dirPaths } = getAutocompletionFileTree(effectiveDir);
    
    // Filter by remaining path part
    const filteredDirs = filterPathsByPartial(dirPaths, remainingPath, effectiveDir);
    const filteredFiles = filterPathsByPartial(filePaths, remainingPath, effectiveDir);
    
    const completions = getNewCompletions();
    
    // Add completions with proper relative path prefixes
    const relativePrefix = Array(relativeJumps).fill('..').join('/') + '/';
    
    filteredDirs.forEach(path => {
      const relativePath = toPosix(relative(effectiveDir, path));
      const completionPath = relativePrefix + relativePath;
      if (completionPath.startsWith(partialPath)) {
        completions.entries.push(
          createCompletionEntry(completionPath, ScriptElementKind.string, {
            start: startPos,
            length: partialPath.length,
          })
        );
      }
    });
    
    filteredFiles.forEach(path => {
      const relativePath = toPosix(relative(effectiveDir, path));
      const completionPath = relativePrefix + relativePath;
      if (completionPath.startsWith(partialPath)) {
        completions.entries.push(
          createCompletionEntry(completionPath, ScriptElementKind.string, {
            start: startPos,
            length: partialPath.length,
          })
        );
      }
    });
    
    return completions;
  } else {
    // Original logic for non-relative paths
    const { filePaths, dirPaths } = getAutocompletionFileTree(rootDir);
    
    const filteredDirs = filterPathsByPartial(dirPaths, partialPath, rootDir);
    const filteredFiles = filterPathsByPartial(filePaths, partialPath, rootDir);

    return {
      ...getNewCompletions(),
      entries: [
        ...filteredDirs.map(path => createPathCompletion(path, rootDir, { partialPath, startPos })),
        ...filteredFiles.map(path => createPathCompletion(path, rootDir, { partialPath, startPos })),
      ],
    };
  }
};

// Check for partial directive completion (like "@scop")
export const getPartialDirectiveCompletions = (
  jsDoc: string,
  jsDocStartPos: number,
  completions: WithMetadata<CompletionInfo>
): WithMetadata<CompletionInfo> | null => {
  const match = jsDoc.match(REGEXES.JSDOC_PARTIAL_DIRECTIVE);
  if (!match || !match[2]) return null;
  
  const partialDirective = match[2]; // "@scop"
  let hasMatches = false;
  
  DIRECTIVE_NAMES.forEach(directive => {
    if (directive.startsWith(partialDirective) && directive !== partialDirective) {
      const directiveStartPos = jsDoc.lastIndexOf(partialDirective);
      const absoluteStartPos = jsDocStartPos + directiveStartPos;
      
      completions.entries.push(
        createCompletionEntry(directive, ScriptElementKind.keyword, {
          start: absoluteStartPos,
          length: partialDirective.length,
        })
      );
      hasMatches = true;
    }
  });
  
  return hasMatches ? completions : null;
};

// Calculate absolute position for scope file text
export const calculateAbsolutePosition = (
  fileTextToPosition: string,
  lineStartPos: number
): number => {
  const linesBeforeCurrent = fileTextToPosition.split("\n").slice(0, -1);
  return linesBeforeCurrent.reduce((acc, line) => acc + line.length + 1, 0) + lineStartPos;
};