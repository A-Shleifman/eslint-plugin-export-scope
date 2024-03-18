import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { checkIsImportable } from "../checkIsImportable";
import { validateScopeFileScopePath } from "./validateScopeFileScopePath";
import { resolveModuleName, sys as tsSys } from "typescript";
import { validateProgram } from "./validateProgram";

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

    const compilerOptions = services.program.getCompilerOptions();
    const resolvePath = (relativePath: string) =>
      resolveModuleName(relativePath, context.filename, compilerOptions, tsSys).resolvedModule?.resolvedFileName;

    const checkNode = (
      node:
        | TSESTree.Identifier
        | TSESTree.ImportDeclaration
        | TSESTree.ImportExpression
        | TSESTree.ImportSpecifier
        | TSESTree.ImportDefaultSpecifier
        | TSESTree.MemberExpression
        | TSESTree.TSQualifiedName,
      exportName?: string,
    ) => {
      const parseNode =
        "source" in node ? node.source : node.parent && "source" in node.parent ? node.parent.source : node;

      if (!parseNode) return;

      const getExportPath = () => {
        if (node.type === "ImportDeclaration" && node.source.type === "Literal") {
          return resolvePath(node.source.value);
        }

        const importSymbol = services.getSymbolAtLocation(parseNode);
        return importSymbol?.declarations?.[0]?.getSourceFile().fileName;
      };

      const exportPath = getExportPath();

      if (!checkIsImportable({ tsProgram: services.program, importPath: context.filename, exportPath, exportName })) {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: exportName ? `'${exportName}'` : "module" },
        });
      }
    };

    const lintNode = (node: TSESTree.Node) => {
      const isPromise = node.type === "AwaitExpression" && node.parent;
      node = isPromise ? node.parent! : node;
      const { type } = node;

      if (type === "MemberExpression" && node.property.type === "Identifier") {
        checkNode(node.property, node.property.name);
      }

      const lintObjectPattern = (node: TSESTree.ObjectPattern) => {
        node.properties.forEach((property) => {
          if (property.type === "Property" && property.key.type === "Identifier") {
            checkNode(property.key, property.key.name);
          }
        });
      };

      if (type === "VariableDeclarator" && node.id.type === "ObjectPattern") {
        lintObjectPattern(node.id);
      }

      if (type === "ObjectPattern") {
        lintObjectPattern(node);
      }

      if (type === "TSQualifiedName") {
        checkNode(node.right, node.right.name);
      }
    };

    return {
      ImportSpecifier: (node) => checkNode(node, node.imported.name),
      ImportDefaultSpecifier: (node) => checkNode(node, "default"),
      ImportDeclaration: (node) => !node.specifiers.length && checkNode(node),
      // 👇 dynamic import of the whole module without accessing exports
      ImportExpression: (node) => {
        const parent = node.parent;
        if (parent.parent?.type === "Program") {
          return checkNode(node);
        }
        if (parent?.type === "AwaitExpression" && parent.parent.parent?.type === "Program") {
          return checkNode(node);
        }

        lintNode(parent);
      },
      Program: (node) => validateProgram(context, node, lintNode),
      Literal: (node) => validateScopeFileScopePath(context, node),
    };
  },
});
