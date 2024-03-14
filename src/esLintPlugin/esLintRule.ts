import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { checkIsImportable } from "../checkIsImportable";
import { validateJsDoc } from "./validateJsDoc";
import { validateScopeFileScopePath } from "./validateScopeFileScopePath";
import { SymbolFlags } from "typescript";

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
        | TSESTree.ImportDefaultSpecifier
        | TSESTree.MemberExpression,
      exportName?: string,
    ) => {
      const parseNode =
        "source" in node ? node.source : node.parent && "source" in node.parent ? node.parent.source : node;

      if (!parseNode) return;

      const importSymbol = services.getSymbolAtLocation(parseNode);
      const exportPath = importSymbol?.declarations?.[0]?.getSourceFile().fileName;

      // required for MemberExpressions that are not part of imports (pojo)
      if (exportPath?.toLowerCase() === context.filename.toLowerCase()) return;

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
      // 👇 dynamic import of the whole module without accessing exports
      ImportExpression: (node) => node.parent.parent?.type === "Program" && validateNode(node),
      ImportSpecifier: (node) => validateNode(node, node.imported.name),
      ImportDefaultSpecifier: (node) => validateNode(node, "default"),
      MemberExpression: (node) => {
        const symbol = services.getSymbolAtLocation(node);

        if (
          !(
            symbol &&
            "parent" in symbol &&
            symbol.parent &&
            typeof symbol.parent === "object" &&
            "flags" in symbol.parent &&
            typeof symbol.parent.flags === "number" &&
            symbol.parent.flags & SymbolFlags.ValueModule
          )
        )
          return;

        validateNode(node, "name" in node.property ? node.property.name : undefined);
      },
      Program: (node) => validateJsDoc(context, node),
      Literal: (node) => validateScopeFileScopePath(context, node),
    };
  },
});
