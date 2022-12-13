import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { JSONSchema4 } from "@typescript-eslint/utils/dist/json-schema";
import path from "path";
import { cast, checkIsAccessible as _checkIsAccessible, Config } from "./common";

export const ruleName = "no-imports-outside-export-scope";

const isImportDeclaration = (node: { type: string }): node is TSESTree.ImportDeclaration =>
  node.type === "ImportDeclaration";

const createRule = ESLintUtils.RuleCreator(
  () => "https://github.com/A-Shleifman/eslint-plugin-export-scope/blob/main/no-imports-outside-export-scope.md",
);

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

    const validateImportSpecifier = (node: TSESTree.ImportSpecifier | TSESTree.ImportDefaultSpecifier) => {
      const tsNode = ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(node);

      if (!tsNode?.name) return;

      const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode.name);
      const exportSymbol = importSymbol && tsProgram.getTypeChecker().getImmediateAliasedSymbol(importSymbol);
      const exportPath = exportSymbol?.valueDeclaration?.getSourceFile().fileName;

      if (!checkIsAccessible({ exportPath, exportName: exportSymbol?.name })) {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: `'${node.local.name}'` },
        });
      }
    };

    return {
      ImportDeclaration: (node) => {
        if (node.specifiers.length) return;

        const tsNode = ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(node.source);
        const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode);
        const exportPath = importSymbol?.valueDeclaration?.getSourceFile().fileName;

        if (!checkIsAccessible({ exportPath })) {
          context.report({
            node,
            messageId: "exportScope",
            data: { identifier: "module" },
          });
        }
      },
      ImportSpecifier: validateImportSpecifier,
      ImportDefaultSpecifier: validateImportSpecifier,
    };
  },
});
