import { AST_NODE_TYPES, AST_TOKEN_TYPES, type TSESTree } from "@typescript-eslint/utils";

type ScopeDeclaration = {
  type: "scope" | "scopeDefault" | "scopeException";
  path: string;
  loc: TSESTree.SourceLocation;
};

export const getScopeDeclarations = (comments: TSESTree.Comment[]) => {
  return comments.reduce((acc, { type, value, loc }) => {
    if (type !== AST_TOKEN_TYPES.Block) return acc;

    // Match multiple directives in a single comment block  
    const regex = /(\s*\*?\s*@)(scope|scopeDefault|scopeException)\s+([^\s\n\r]+)/g;
    let match;
    
    while ((match = regex.exec(value)) !== null) {
      const [, prefix, scopeType, path] = match;
      if (prefix && scopeType && path) {
        // Find the line and column of the path within the comment
        const beforePath = value.substring(0, match.index + prefix.length + scopeType.length + 1);
        const linesBeforePath = beforePath.split('\n');
        const pathLineOffset = linesBeforePath.length - 1;
        
        // Calculate column position of path start
        const columnOffset = pathLineOffset > 0 
          ? linesBeforePath[linesBeforePath.length - 1].length // Column in the current line
          : loc.start.column + 2 + beforePath.length; // +2 for /*
        
        acc.push({ 
          type: scopeType as ScopeDeclaration["type"], 
          path, 
          loc: {
            start: {
              line: loc.start.line + pathLineOffset,
              column: columnOffset
            },
            end: {
              line: loc.start.line + pathLineOffset, 
              column: columnOffset + path.length
            }
          }
        });
      }
    }

    return acc;
  }, [] as ScopeDeclaration[]);
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
