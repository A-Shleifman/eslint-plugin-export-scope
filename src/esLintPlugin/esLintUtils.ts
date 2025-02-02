import { AST_NODE_TYPES, AST_TOKEN_TYPES, type TSESTree } from "@typescript-eslint/utils";

type ScopeDeclaration = {
  type: "scope" | "scopeDefault" | "scopeException";
  path: string;
  loc: TSESTree.SourceLocation;
};

export const getScopeDeclarations = (comments: TSESTree.Comment[]) => {
  return comments.reduce((acc, { type, value, loc }) => {
    if (type !== AST_TOKEN_TYPES.Block) return acc;

    const [, prefix, scopeType, path] = value.match(/(\s*\*\s*@)(scope|scopeDefault|scopeException)\s+([^\s]+)/) ?? [];

    if (prefix && scopeType && path) {
      // loc.start.column = loc.start.column + prefix.length + scopeType.length + 1;
      acc.push({ type: scopeType as ScopeDeclaration["type"], path, loc });
    }

    return acc;
  }, [] as ScopeDeclaration[]);
};

export const getPathLoc = (text: string, loc: TSESTree.SourceLocation): TSESTree.SourceLocation => {
  const commentLine = text.split("\n")[loc.start.line - 1];
  const [, prefix, tag, postfix, path] =
    commentLine?.match(/^([^]*@)(scope|scopeDefault|scopeException)(\s+)([^\s]+)/) ?? [];

  if (prefix && tag && postfix && path) {
    return {
      start: { line: loc.start.line, column: loc.start.column + prefix.length + tag.length + postfix.length },
      end: {
        line: loc.start.line,
        column: loc.start.column + prefix.length + tag.length + postfix.length + path.length,
      },
    };
  }

  return loc;
};

export const extractPathFromImport = (node: TSESTree.Node) => {
  if (node.type === AST_NODE_TYPES.ImportDeclaration) return node.source.value;
  if (
    node.type === AST_NODE_TYPES.ImportExpression &&
    node.source.type === AST_NODE_TYPES.Literal &&
    typeof node.source.value === "string"
  )
    return node.source.value;
};
