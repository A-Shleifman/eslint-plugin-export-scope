import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { JSONSchema4 } from "@typescript-eslint/utils/dist/json-schema";
import { cast, checkIsAccessible as _checkIsAccessible, Config } from "./common";

export const ruleName = "no-imports-outside-export-scope";

const createRule = ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope");

export const rule = createRule({
  name: ruleName,
  meta: {
    type: "problem",
    docs: {
      description: "Disallows importing scoped exports outside their scope",
      recommended: false,
    },
    messages: {
      exportScope: "Cannot import {{ identifier }} outside its export scope",
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
  defaultOptions: [cast<Config>({ strictMode: false })] as const,

  create(context) {
    const tsProgram = ESLintUtils.getParserServices(context).program;

    const checkIsAccessible = ({
      exportPath,
      exportName,
    }: Pick<Parameters<typeof _checkIsAccessible>[0], "exportPath" | "exportName">) =>
      _checkIsAccessible({
        tsProgram,
        importPath: context.getFilename(),
        exportPath,
        exportName,
        strictMode: context.options[0].strictMode,
      });

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

      const tsNode = ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(parseNode);
      const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode);
      const exportPath = importSymbol?.declarations?.[0]?.getSourceFile().fileName;

      if (!checkIsAccessible({ exportPath, exportName })) {
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
    };
  },
});
