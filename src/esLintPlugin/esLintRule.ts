import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { checkIsImportable as _checkIsImportable } from "../importabilityChecker";
import { getFullScopePath } from "../utils";
import { dirname } from "path";
import fs from "fs";
import { getPathLoc, getScopeDeclarations } from "./esLintUtils";

export const ruleName = "no-imports-outside-export-scope";

const createRule = ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope");

let cachedScopeDeclarations: ReturnType<typeof getScopeDeclarations> = [];

export const rule = createRule({
  name: ruleName,
  meta: {
    type: "problem",
    docs: {
      description: "Disallows importing scoped exports outside their scope",
    },
    messages: {
      exportScope: "Cannot import {{ identifier }} outside its export scope",
      invalidPath: "Invalid scope path: {{ identifier }}",
      onlyParents: "Only parent dirs are allowed for @scope and @scopeDefault",
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const services = ESLintUtils.getParserServices(context);

    const checkIsImportable = (props: Pick<Parameters<typeof _checkIsImportable>[0], "exportPath" | "exportName">) =>
      _checkIsImportable({ tsProgram: services.program, importPath: context.filename, ...props });

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

      if (!checkIsImportable({ exportPath, exportName })) {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: exportName ? `'${exportName}'` : "module" },
        });
      }
    };

    const validateJsDoc = (node: TSESTree.Program) => {
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

        if (!fullPath) return;

        if (type === "scope" || type === "scopeDefault") {
          if (!exportDir.toLowerCase().startsWith(fullPath.toLowerCase())) {
            return context.report({
              node,
              messageId: "onlyParents",
              loc: getPathLoc(context.sourceCode.text, loc),
            });
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

    return {
      ImportDeclaration: (node) => !node.specifiers.length && validateNode(node),
      ImportExpression: (node) => validateNode(node),
      ImportSpecifier: (node) => validateNode(node, node.imported.name),
      ImportDefaultSpecifier: (node) => validateNode(node, "default"),
      Program: (node) => validateJsDoc(node),
    };
  },
});
