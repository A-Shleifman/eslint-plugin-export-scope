import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import type { MessageIdsType } from "./esLintRule";
import type { TSESTree } from "@typescript-eslint/utils";
import { basename, dirname } from "path";
import { SCOPE_JS_FILE_NAME, SCOPE_TS_FILE_NAME } from "../checkIsImportable";
import { getFullScopePath } from "../utils";
import fs from "fs";

export const validateScopeFileScopePath = (context: RuleContext<MessageIdsType, never[]>, node: TSESTree.Literal) => {
  if (![SCOPE_TS_FILE_NAME, SCOPE_JS_FILE_NAME].includes(basename(context.filename))) return;
  const exportDir = dirname(context.filename);
  node.loc.start.column += 1;
  node.loc.end.column -= 1;

  if (typeof node.value !== "string") {
    return;
  }

  const fullPath = getFullScopePath(exportDir, node.value);
  if (!fullPath || node.value === "*") return;

  if (node.parent.type === "ExportDefaultDeclaration") {
    if (!exportDir.toLowerCase().startsWith(fullPath.toLowerCase())) {
      return context.report({ node, messageId: "onlyParents", loc: node.loc });
    }
  }

  if (["ArrayExpression", "ExportDefaultDeclaration"].includes(node.parent.type)) {
    if (!fs.existsSync(fullPath)) {
      context.report({ node, messageId: "invalidPath", data: { identifier: fullPath }, loc: node.loc });
    }
  }
};
