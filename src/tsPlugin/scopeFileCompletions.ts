import { dirname, relative } from "path";
import { getRootDir } from "../common";
import { getParentSuggestions, getNewSuggestions, entry } from "./tsUtils";
import { ScriptElementKind } from "typescript";

export const getScopeFileCompletions = (
  ts: typeof import("typescript"),
  importDir: string,
  fileTextToPosition: string,
) => {
  const lastLine = fileTextToPosition.split("\n").pop() ?? "";

  const stack: string[] = [];
  lastLine.split("").forEach((c) => {
    if (c === `'` || c === `"` || c === "`") {
      if (stack.at(-1) === c) {
        stack.pop();
      } else {
        stack.push(c);
      }
    }
  });

  const openQuote = stack.at(-1);

  if (openQuote) {
    const rootDir = getRootDir(importDir);

    if (!rootDir) return;

    const lastExportDefaultPos = fileTextToPosition.lastIndexOf("export default");
    const lastExportPos = fileTextToPosition.lastIndexOf("export");
    const isDefaultExport = lastExportDefaultPos === lastExportPos;
    if (isDefaultExport) {
      return getParentSuggestions(rootDir, importDir);
    }

    const paths = ts.sys.readDirectory(rootDir, [".ts", ".tsx", ".mts", ".js", ".jsx", "mjs"], ["node_modules"]);

    const relativePaths = paths.map((x) => relative(rootDir, x));

    const dirs = relativePaths.reduce((acc, path) => {
      path = dirname(path); // removes filename

      while (path !== ".") {
        acc.add(path);
        path = dirname(path);
      }

      return acc;
    }, new Set<string>());

    return {
      ...getNewSuggestions(),
      entries: [
        ...[...dirs].map((x) => entry(x, ScriptElementKind.directory)),
        ...relativePaths.map((x) => entry(x, ScriptElementKind.moduleElement)),
      ],
    };
  }
};
