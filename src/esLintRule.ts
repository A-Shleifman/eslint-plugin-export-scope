import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { checkIsAccessible as _checkIsAccessible } from "./common";

export const ruleName = "no-imports-outside-export-scope";

const createRule = ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope");

export const rule = createRule({
  name: ruleName,
  meta: {
    type: "problem",
    docs: {
      description: "Disallows importing scoped exports outside their scope",
    },
    messages: {
      exportScope: "Cannot import {{ identifier }} outside its export scope",
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const services = ESLintUtils.getParserServices(context);

    const checkIsAccessible = (props: Pick<Parameters<typeof _checkIsAccessible>[0], "exportPath" | "exportName">) =>
      _checkIsAccessible({ tsProgram: services.program, importPath: context.filename, ...props });

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
