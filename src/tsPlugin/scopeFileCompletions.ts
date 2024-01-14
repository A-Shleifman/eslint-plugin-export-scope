import { getParentCompletions, getNewCompletions, entry } from "./tsUtils";
import { ScriptElementKind } from "typescript";
import { getFileTree, getRootDir } from "../utils";
import { relative } from "path";

const hasOpenQuote = (string: string) => {
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

export const getScopeFileCompletions = (
  ts: typeof import("typescript"),
  importDir: string,
  fileTextToPosition: string,
) => {
  const lastLine = fileTextToPosition.split("\n").pop() ?? "";
  if (!hasOpenQuote(lastLine)) return;

  const rootDir = getRootDir(importDir);

  if (!rootDir) return;

  const lastExportDefaultPos = fileTextToPosition.lastIndexOf("export default");
  const lastExportPos = fileTextToPosition.lastIndexOf("export");
  const isDefaultExport = lastExportDefaultPos === lastExportPos;
  if (isDefaultExport) {
    return getParentCompletions(rootDir, importDir);
  }

  const { filePaths, dirPaths } = getFileTree(rootDir);

  return {
    ...getNewCompletions(),
    entries: [
      ...dirPaths.map((x) => entry(relative(rootDir, x), ScriptElementKind.string)),
      ...filePaths.map((x) => entry(relative(rootDir, x), ScriptElementKind.string)),
    ],
  };
};
