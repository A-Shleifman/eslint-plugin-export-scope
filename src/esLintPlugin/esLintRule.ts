import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { checkIsImportable } from "../importabilityChecker";
import { validateJsDoc } from "./validateJsDoc";
import { validateScopeFileScopePath } from "./validateScopeFileScopePath";

export const ruleName = "no-imports-outside-export-scope";

const createRule = ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope");

const errorMessages = {
  exportScope: "Cannot import {{ identifier }} outside its export scope",
  invalidPath: `Invalid scope path: "{{ identifier }}"`,
  onlyParents: "Only parent dirs are allowed for @scope and @scopeDefault",
} as const;

export type MessageIdsType = keyof typeof errorMessages;

export const rule = createRule({
  name: ruleName,
  meta: {
    type: "problem",
    docs: {
      description: "Disallows importing scoped exports outside their scope",
    },
    messages: errorMessages,
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const services = ESLintUtils.getParserServices(context);

    if (!services.getSymbolAtLocation) {
      throw new Error("Please make sure you have the latest version of `@typescript-eslint/parser` installed.");
    }

    const validateNode = (
      node:
        | TSESTree.ImportDeclaration
        | TSESTree.ImportExpression
        | TSESTree.ImportSpecifier
        | TSESTree.ImportDefaultSpecifier,
      exportName?: string,
    ) => {
      const parseNode =
        "source" in node ? node.source : node.parent && "source" in node.parent ? node.parent.source : node;

      if (!parseNode) return;

      const importSymbol = services.getSymbolAtLocation(parseNode);
      const exportPath = importSymbol?.declarations?.[0]?.getSourceFile().fileName;

      if (!checkIsImportable({ tsProgram: services.program, importPath: context.filename, exportPath, exportName })) {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: exportName ? `'${exportName}'` : "module" },
        });
      }
    };

    return {
      ImportDeclaration: (node) => !node.specifiers.length && validateNode(node),
      ImportExpression: (node) => validateNode(node),
      ImportSpecifier: (node) => validateNode(node, node.imported.name),
      ImportDefaultSpecifier: (node) => validateNode(node, "default"),
      Program: (node) => validateJsDoc(context, node),
      Literal: (node) => validateScopeFileScopePath(context, node),
    };
  },
});
