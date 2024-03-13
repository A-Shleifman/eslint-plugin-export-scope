import type { TSESTree } from "@typescript-eslint/utils";
import { getPathLoc, getScopeDeclarations } from "./esLintUtils";
import { dirname } from "path";
import { getFullScopePath } from "../utils";
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
      return cached.path === path && cached.type === type;
    })
  ) {
    return;
  }

  cachedScopeDeclarations = scopeDeclarations;

  const exportDir = dirname(context.filename);

  scopeDeclarations.forEach(({ type, path, loc }) => {
    const fullPath = getFullScopePath(exportDir, path);

    if (!fullPath || path === "*") return;

    if (type === "scope" || type === "scopeDefault") {
      if (!exportDir.toLowerCase().startsWith(fullPath.toLowerCase())) {
        return context.report({ node, messageId: "onlyParents", loc: getPathLoc(context.sourceCode.text, loc) });
      }
    }

    if (!fs.existsSync(fullPath)) {
      context.report({
        node,
        messageId: "invalidPath",
        data: { identifier: fullPath },
        loc: getPathLoc(context.sourceCode.text, loc),
      });
    }
  });
};
