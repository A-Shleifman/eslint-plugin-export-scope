import path from "path";
import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { checkIsAccessible } from "./common";

export const ruleName = "no-imports-outside-package";

const createRule = ESLintUtils.RuleCreator(() => "");

export const rule = createRule({
  name: ruleName,
  meta: {
    type: "problem",
    docs: {
      description: "Disallows importing private exports outside their package",
      recommended: false,
    },
    messages: {
      packagePrivate: "Cannot import a private export '{{ identifier }}' outside its package",
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const tsProgram = ESLintUtils.getParserServices(context).program;
    if (!tsProgram) {
      console.error("Could not get parser services");
      return {};
    }

    const validateNode = (
      node: TSESTree.ImportSpecifier | TSESTree.ImportDefaultSpecifier,
      exportNameOverride?: string,
    ) => {
      if (node.parent?.type !== "ImportDeclaration") return;

      const relativeExportPath = node.parent.source.value;

      // TODO: find the extension programmatically
      const absoluteExportPath = path.resolve(path.dirname(context.getFilename()), relativeExportPath) + ".ts";

      const isAccessible = checkIsAccessible({
        tsProgram,
        importPath: context.getFilename(),
        exportPath: absoluteExportPath,
        exportName: exportNameOverride ?? node.local.name,
      });

      if (!isAccessible) {
        context.report({
          node,
          messageId: "packagePrivate",
          data: { identifier: node.local.name },
        });
      }
    };

    return {
      ImportSpecifier: validateNode,
      ImportDefaultSpecifier: (node) => validateNode(node, "default"),
    };
  },
});
