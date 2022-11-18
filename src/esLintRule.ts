import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { JSONSchema4 } from "@typescript-eslint/utils/dist/json-schema";
import { cast, checkIsAccessible, Config } from "./common";

export const ruleName = "no-imports-outside-export-scope";

const createRule = ESLintUtils.RuleCreator(() => "");

export const rule = createRule({
  name: ruleName,
  meta: {
    type: "problem",
    docs: {
      description: "Disallows importing scoped exports outside their scope",
      recommended: false,
    },
    messages: {
      exportScope: "Cannot import '{{ identifier }}' outside its export scope",
    },
    schema: [
      {
        type: "object",
        properties: cast<Record<keyof Config, JSONSchema4>>({
          strictMode: {
            type: "boolean",
          },
        }),
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{} as Config],

  create(context) {
    const tsProgram = ESLintUtils.getParserServices(context).program;

    const validateNode = (node: TSESTree.ImportSpecifier | TSESTree.ImportDefaultSpecifier) => {
      if (node.parent?.type !== "ImportDeclaration") return;

      const tsNode = ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(node);

      if (!tsNode?.name) return;

      const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode.name);
      const exportSymbol = importSymbol && tsProgram.getTypeChecker().getImmediateAliasedSymbol(importSymbol);
      const exportPath = exportSymbol?.declarations?.[0].getSourceFile().fileName;

      const isAccessible = checkIsAccessible({
        tsProgram,
        importPath: context.getFilename(),
        exportPath,
        exportName: exportSymbol?.name,
        strictMode: context.options[0].strictMode,
      });

      if (!isAccessible) {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: node.local.name },
        });
      }
    };

    return {
      ImportSpecifier: validateNode,
      ImportDefaultSpecifier: validateNode,
    };
  },
});
