import type { TSESTree } from "@typescript-eslint/utils";
import { getScopeDeclarations } from "./esLintUtils";
import { dirname } from "path";
import { getFullScopePath } from "../utils";
import { validateScopePath, validateExceptionPath } from "../pathValidation";
import fs from "fs";
import { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import type { MessageIdsType } from "./esLintRule";

let cachedScopeDeclarations: ReturnType<typeof getScopeDeclarations> = [];

export const validateJsDoc = (context: RuleContext<MessageIdsType, never[]>, node: TSESTree.Program) => {
  const scopeDeclarations = getScopeDeclarations(context.sourceCode.getAllComments());

  if (
    scopeDeclarations.length === cachedScopeDeclarations.length &&
    scopeDeclarations.every(({ path, type }, i) => {
      const cached = cachedScopeDeclarations[i];
      return cached?.path === path && cached.type === type;
    })
  ) {
    return;
  }

  cachedScopeDeclarations = scopeDeclarations;

  const exportDir = dirname(context.filename);

  scopeDeclarations.forEach(({ type, path, loc }) => {
    // Skip validation for wildcard
    if (path === "*") return;

    if (type === "scope" || type === "scopeDefault") {
      // Validate scope paths - only ancestors allowed
      const validation = validateScopePath(exportDir, path);
      if (!validation.isValid) {
        return context.report({ 
          node, 
          messageId: "onlyParents", 
          loc
        });
      }
      
      // Check if path exists
      if (validation.resolvedPath && !fs.existsSync(validation.resolvedPath)) {
        context.report({
          node,
          messageId: "invalidPath",
          data: { identifier: validation.resolvedPath },
          loc,
        });
      }
    } else if (type === "scopeException") {
      // Validate exception paths - can be any path within project
      const validation = validateExceptionPath(exportDir, path);
      if (!validation.isValid) {
        const fullPath = getFullScopePath(exportDir, path);
        if (fullPath) {
          context.report({
            node,
            messageId: "invalidPath",
            data: { identifier: fullPath },
            loc,
          });
        }
      } else if (validation.resolvedPath && !fs.existsSync(validation.resolvedPath)) {
        context.report({
          node,
          messageId: "invalidPath",
          data: { identifier: validation.resolvedPath },
          loc,
        });
      }
    }
  });
};
