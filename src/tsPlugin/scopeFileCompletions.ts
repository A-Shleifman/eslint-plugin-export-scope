import { getRootDir } from "../pathUtils";
import {
  parsePartialPathFromQuotes,
  calculateAbsolutePosition,
  generateParentCompletions,
  generateFileSystemCompletions,
} from "./completionUtils";

const hasOpenQuote = (string: string): boolean => {
  const stack: string[] = [];
  string.split("").forEach((c) => {
    if (c === `'` || c === `"` || c === "`") {
      if (stack.at(-1) === c) {
        stack.pop();
      } else {
        stack.push(c);
      }
    }
  });

  return !!stack.at(-1);
};

export const getScopeFileCompletions = (importDir: string, fileTextToPosition: string) => {
  const lastLine = fileTextToPosition.split("\n").pop() ?? "";
  if (!hasOpenQuote(lastLine)) return;

  const rootDir = getRootDir(importDir);
  if (!rootDir) return;

  // Extract partial path from the current line
  const partialInfo = parsePartialPathFromQuotes(lastLine, 0);
  if (!partialInfo) return;

  const { partialPath, startPos: lineStartPos } = partialInfo;
  const absoluteStartPos = calculateAbsolutePosition(fileTextToPosition, lineStartPos);

  // Check if this is inside an exceptions array
  const lastExceptionsPos = fileTextToPosition.lastIndexOf("export const exceptions");
  const isInExceptionsArray =
    lastExceptionsPos > -1 &&
    fileTextToPosition.substring(lastExceptionsPos).includes("[") &&
    !fileTextToPosition.substring(lastExceptionsPos).includes("];");

  const config = {
    rootDir,
    importDir,
    partialPath,
    startPos: absoluteStartPos,
  };

  if (isInExceptionsArray) {
    // For exceptions array, combine both filesystem and parent completions
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
