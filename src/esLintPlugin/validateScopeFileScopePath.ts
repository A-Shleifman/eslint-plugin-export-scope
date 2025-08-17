import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import type { MessageIdsType } from "./esLintRule";
import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { basename, dirname } from "path";
import { getFullScopePath } from "../utils";
import { validateScopePath, validateExceptionPath } from "../pathValidation";
import fs from "fs";
import { SCOPE_FILE_NAMES } from "../constants";

const isInExceptionsArray = (node: TSESTree.Literal): boolean => {
  // Check if we're inside an exceptions array
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (current.type === AST_NODE_TYPES.ArrayExpression) {
      // Look for export const exceptions = [...]
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

export const validateScopeFileScopePath = (context: RuleContext<MessageIdsType, never[]>, node: TSESTree.Literal) => {
  if (!SCOPE_FILE_NAMES.includes(basename(context.filename))) return;

  const exportDir = dirname(context.filename);
  node.loc.start.column += 1;
  node.loc.end.column -= 1;

  if (typeof node.value !== "string") {
    return;
  }

  // Skip validation for wildcard
  if (node.value === "*") return;

  const isInExceptions = isInExceptionsArray(node);
  
  if (isInExceptions) {
    // Validate exception path - can be any path within project
    const validation = validateExceptionPath(exportDir, node.value);
    if (!validation.isValid) {
      const fullPath = getFullScopePath(exportDir, node.value);
      if (fullPath) {
        context.report({ node, messageId: "invalidPath", data: { identifier: fullPath }, loc: node.loc });
      }
    } else if (validation.resolvedPath && !fs.existsSync(validation.resolvedPath)) {
      context.report({ node, messageId: "invalidPath", data: { identifier: validation.resolvedPath }, loc: node.loc });
    }
  } else if (node.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
    // Validate scope path for export default - only ancestors allowed
    const validation = validateScopePath(exportDir, node.value);
    if (!validation.isValid) {
      context.report({ node, messageId: "onlyParents", loc: node.loc });
    } else if (validation.resolvedPath && !fs.existsSync(validation.resolvedPath)) {
      context.report({ node, messageId: "invalidPath", data: { identifier: validation.resolvedPath }, loc: node.loc });
    }
  } else if (node.parent.type === AST_NODE_TYPES.ArrayExpression) {
    // General path validation for other array contexts
    const fullPath = getFullScopePath(exportDir, node.value);
    if (fullPath && !fs.existsSync(fullPath)) {
      context.report({ node, messageId: "invalidPath", data: { identifier: fullPath }, loc: node.loc });
    }
  }
};
