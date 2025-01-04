import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { checkIsImportable } from "../checkIsImportable";
import { validateScopeFileScopePath } from "./validateScopeFileScopePath";
import { resolveModuleName, sys as tsSys } from "typescript";
import { validateProgram } from "./validateProgram";
import { extractPathFromImport } from "./esLintUtils";

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
      relExportPath?: string,
    ) => {
      if (!relExportPath) return;

      const exportPath = resolvePath(relExportPath);

      if (!checkIsImportable({ tsProgram: services.program, importPath: context.filename, exportPath, exportName })) {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: exportName ? `'${exportName}'` : "module" },
        });
      }
    };

    const lintNode = (node: TSESTree.Node, relExportPath?: string) => {
      const isPromise = node.type === AST_NODE_TYPES.AwaitExpression && node.parent;
      node = isPromise ? node.parent! : node;
      const { type } = node;

      if (type === AST_NODE_TYPES.Identifier) {
        checkNode(node, node.name, relExportPath);
      }

      if (type === AST_NODE_TYPES.MemberExpression && node.property.type === AST_NODE_TYPES.Identifier) {
        checkNode(node.property, node.property.name, relExportPath);
      }

      const lintObjectPattern = (node: TSESTree.ObjectPattern) => {
        node.properties.forEach((property) => {
          if (property.type === AST_NODE_TYPES.Property && property.key.type === AST_NODE_TYPES.Identifier) {
            checkNode(property.key, property.key.name, relExportPath);
          }
        });
      };

      if (type === AST_NODE_TYPES.VariableDeclarator && node.id.type === AST_NODE_TYPES.ObjectPattern) {
        lintObjectPattern(node.id);
      }

      if (type === AST_NODE_TYPES.ObjectPattern) {
        lintObjectPattern(node);
      }

      if (type === AST_NODE_TYPES.TSQualifiedName) {
        checkNode(node.right, node.right.name, relExportPath);
      }
    };

    return {
      ImportSpecifier: (node) =>
        "name" in node.imported && checkNode(node, node.imported.name, extractPathFromImport(node.parent)),
      ImportDefaultSpecifier: (node) => checkNode(node, "default", extractPathFromImport(node.parent)),
      ImportDeclaration: (node) => !node.specifiers.length && checkNode(node, undefined, extractPathFromImport(node)),
      // 👇 dynamic import of the whole module without accessing exports
      ImportExpression: (node) => {
        const relExportPath = extractPathFromImport(node);
        const parent = node.parent;
        if (
          parent.parent?.type === AST_NODE_TYPES.Program ||
          (parent?.type === AST_NODE_TYPES.AwaitExpression && parent.parent.parent?.type === AST_NODE_TYPES.Program)
        ) {
          return checkNode(node, undefined, relExportPath);
        }
      },
      Program: (node) => validateProgram(context, node, lintNode),
      Literal: (node) => validateScopeFileScopePath(context, node),
    };
  },
});
