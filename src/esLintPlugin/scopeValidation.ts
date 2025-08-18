import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { dirname } from "path";
import { validateScopePath, validateExceptionPath, getFullScopePath } from "../pathUtils";
import { getScopeDeclarations } from "./esLintUtils";
import { existsSync } from "fs";

export interface ValidationError {
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export const isInExceptionsArray = (node: TSESTree.Literal, parent?: TSESTree.Node): boolean => {
  let current: TSESTree.Node | undefined = parent || node.parent;
  while (current) {
    if (current.type === AST_NODE_TYPES.ArrayExpression) {
      if (current.parent?.type === AST_NODE_TYPES.VariableDeclarator) {
        const declarator = current.parent;
        if (declarator.id.type === AST_NODE_TYPES.Identifier && declarator.id.name === "exceptions") {
          return true;
        }
      }
    }
    current = current.parent;
  }
  return false;
};

export const validateScopeDeclarations = (
  comments: TSESTree.Comment[],
  exportDir: string,
  onError: (error: ValidationError) => void
) => {
  const scopeDeclarations = getScopeDeclarations(comments);
  
  scopeDeclarations.forEach(({ type, path, loc }) => {
    if (path === "*") return;
    
    if (type === "scope" || type === "scopeDefault") {
      const validation = validateScopePath(exportDir, path);
      if (!validation.isValid) {
        onError({
          message: "Only parent dirs are allowed for @scope and @scopeDefault",
          line: loc.start.line,
          column: loc.start.column,
          endLine: loc.end.line,
          endColumn: loc.end.column
        });
      } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
        onError({
          message: `Invalid scope path: "${validation.resolvedPath}"`,
          line: loc.start.line,
          column: loc.start.column,
          endLine: loc.end.line,
          endColumn: loc.end.column
        });
      }
    } else if (type === "scopeException") {
      const validation = validateExceptionPath(exportDir, path);
      if (!validation.isValid) {
        const fullPath = getFullScopePath(exportDir, path);
        if (fullPath) {
          onError({
            message: `Invalid scope path: "${fullPath}"`,
            line: loc.start.line,
            column: loc.start.column,
            endLine: loc.end.line,
            endColumn: loc.end.column
          });
        }
      } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
        onError({
          message: `Invalid scope path: "${validation.resolvedPath}"`,
          line: loc.start.line,
          column: loc.start.column,
          endLine: loc.end.line,
          endColumn: loc.end.column
        });
      }
    }
  });
};

export const validateExportDefault = (
  declaration: TSESTree.ArrayExpression | TSESTree.Literal,
  exportDir: string,
  onError: (error: ValidationError) => void
) => {
  if (declaration.type === AST_NODE_TYPES.ArrayExpression) {
    for (const element of declaration.elements) {
      if (element && element.type === AST_NODE_TYPES.Literal && typeof element.value === "string") {
        const stringValue = element.value;
        if (stringValue === "*") continue;
        
        const validation = validateScopePath(exportDir, stringValue);
        if (!validation.isValid) {
          onError({
            message: "Only parent dirs are allowed for @scope and @scopeDefault",
            line: element.loc!.start.line,
            column: element.loc!.start.column + 2,
            endLine: element.loc!.end.line,
            endColumn: element.loc!.end.column
          });
        } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
          onError({
            message: `Invalid scope path: "${validation.resolvedPath}"`,
            line: element.loc!.start.line,
            column: element.loc!.start.column + 2,
            endLine: element.loc!.end.line,
            endColumn: element.loc!.end.column
          });
        }
      }
    }
  } else if (declaration.type === AST_NODE_TYPES.Literal && typeof declaration.value === "string") {
    const stringValue = declaration.value;
    if (stringValue === "*") return;
    
    const validation = validateScopePath(exportDir, stringValue);
    if (!validation.isValid) {
      onError({
        message: "Only parent dirs are allowed for @scope and @scopeDefault",
        line: declaration.loc!.start.line,
        column: declaration.loc!.start.column + 2,
        endLine: declaration.loc!.end.line,
        endColumn: declaration.loc!.end.column
      });
    } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
      onError({
        message: `Invalid scope path: "${validation.resolvedPath}"`,
        line: declaration.loc!.start.line,
        column: declaration.loc!.start.column + 2,
        endLine: declaration.loc!.end.line,
        endColumn: declaration.loc!.end.column
      });
    }
  }
};

export const validateExceptionsArray = (
  arrayExpression: TSESTree.ArrayExpression,
  exportDir: string,
  onError: (error: ValidationError) => void
) => {
  for (const element of arrayExpression.elements) {
    if (element && element.type === AST_NODE_TYPES.Literal && typeof element.value === "string") {
      const stringValue = element.value;
      if (stringValue === "*") continue;
      
      const validation = validateExceptionPath(exportDir, stringValue);
      if (!validation.isValid) {
        const fullPath = getFullScopePath(exportDir, stringValue);
        if (fullPath) {
          onError({
            message: `Invalid scope path: "${fullPath}"`,
            line: element.loc!.start.line,
            column: element.loc!.start.column + 2,
            endLine: element.loc!.end.line,
            endColumn: element.loc!.end.column
          });
        }
      } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
        onError({
          message: `Invalid scope path: "${validation.resolvedPath}"`,
          line: element.loc!.start.line,
          column: element.loc!.start.column + 1,
          endLine: element.loc!.end.line,
          endColumn: element.loc!.end.column - 1
        });
      }
    }
  }
};

export const validateLiteralInScope = (
  node: TSESTree.Literal,
  exportDir: string,
  onError: (error: ValidationError) => void
) => {
  if (typeof node.value !== "string") return;
  
  const stringValue = node.value;
  if (stringValue === "*") return;
  
  // Check if in export default array (e.g., export default ["../path"])
  if (node.parent?.type === AST_NODE_TYPES.ArrayExpression &&
      node.parent.parent?.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    const validation = validateScopePath(exportDir, stringValue);
    if (!validation.isValid) {
      onError({
        message: "Only parent dirs are allowed for @scope and @scopeDefault",
        line: node.loc!.start.line,
        column: node.loc!.start.column + 2,
        endLine: node.loc!.end.line,
        endColumn: node.loc!.end.column
      });
    } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
      onError({
        message: `Invalid scope path: "${validation.resolvedPath}"`,
        line: node.loc!.start.line,
        column: node.loc!.start.column + 2,
        endLine: node.loc!.end.line,
        endColumn: node.loc!.end.column
      });
    }
  }
  // Check if in export default string (e.g., export default "../path")
  else if (node.parent?.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    const validation = validateScopePath(exportDir, stringValue);
    if (!validation.isValid) {
      onError({
        message: "Only parent dirs are allowed for @scope and @scopeDefault",
        line: node.loc!.start.line,
        column: node.loc!.start.column + 2,
        endLine: node.loc!.end.line,
        endColumn: node.loc!.end.column
      });
    } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
      onError({
        message: `Invalid scope path: "${validation.resolvedPath}"`,
        line: node.loc!.start.line,
        column: node.loc!.start.column + 2,
        endLine: node.loc!.end.line,
        endColumn: node.loc!.end.column
      });
    }
  }
  // Check if in exceptions array
  else if (isInExceptionsArray(node)) {
    const validation = validateExceptionPath(exportDir, stringValue);
    if (!validation.isValid) {
      const fullPath = getFullScopePath(exportDir, stringValue);
      if (fullPath) {
        onError({
          message: `Invalid scope path: "${fullPath}"`,
          line: node.loc!.start.line,
          column: node.loc!.start.column + 2,
          endLine: node.loc!.end.line,
          endColumn: node.loc!.end.column
        });
      }
    } else if (validation.resolvedPath && !existsSync(validation.resolvedPath)) {
      onError({
        message: `Invalid scope path: "${validation.resolvedPath}"`,
        line: node.loc!.start.line,
        column: node.loc!.start.column + 2,
        endLine: node.loc!.end.line,
        endColumn: node.loc!.end.column
      });
    }
  }
  // Check if in other array expressions
  else if (node.parent?.type === AST_NODE_TYPES.ArrayExpression) {
    const fullPath = getFullScopePath(exportDir, stringValue);
    if (fullPath && !existsSync(fullPath)) {
      onError({
        message: `Invalid scope path: "${fullPath}"`,
        line: node.loc!.start.line,
        column: node.loc!.start.column + 2,
        endLine: node.loc!.end.line,
        endColumn: node.loc!.end.column
      });
    }
  }
};