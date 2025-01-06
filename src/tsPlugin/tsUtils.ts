import { dirname, relative } from "path";
import type {
  WithMetadata,
  CompletionInfo,
  CompletionEntry,
  Declaration,
  ExportAssignment,
  VariableDeclaration,
  Expression,
  ArrayLiteralExpression,
} from "typescript";
import { ScriptElementKind } from "typescript";

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
    completions.entries.push(entry(relative(rootDir, currentDir), ScriptElementKind.string));
    currentDir = dirname(currentDir);
  }

  const levelsUp = Math.min(3, completions.entries.length);

  completions.entries.push(entry(".", ScriptElementKind.string));
  completions.entries.push(entry("*", ScriptElementKind.string));

  for (let i = 1; i <= levelsUp; i++) {
    completions.entries.push(entry(Array(i).fill("..").join("/"), ScriptElementKind.string));
  }

  return completions;
};

/**
 * This function should us isExportAssignment from 'typescript',
 * but it relies on SyntaxKind which differs based on the urser's ts version
 */
export const isExportAssignment = (declaration: Declaration | undefined): declaration is ExportAssignment => {
  return !!declaration && "expression" in declaration;
};

/**
 * This function should us isVariableDeclaration from 'typescript',
 * but it relies on SyntaxKind which differs based on the urser's ts version
 */
export const isVariableDeclaration = (declaration: Declaration | undefined): declaration is VariableDeclaration => {
  return !!declaration && "initializer" in declaration;
};

/**
 * This function should us isArrayLiteralExpression from 'typescript',
 * but it relies on SyntaxKind which differs based on the urser's ts version
 */
export const isArrayLiteralExpression = (expression: Expression | undefined): expression is ArrayLiteralExpression => {
  return !!expression && "elements" in expression && Array.isArray(expression.elements);
};
