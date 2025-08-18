import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { checkIsImportable } from "../checkIsImportable";
import { resolveModuleName, sys as tsSys, type Program } from "typescript";
import { extractPathFromImport } from "./esLintUtils";
import { validateProgram } from "./validateProgram";

export interface ImportValidationContext {
  filename: string;
  program: Program;
  report: (node: TSESTree.Node, exportName?: string, relExportPath?: string) => void;
}

export const createImportValidator = (context: ImportValidationContext) => {
  const compilerOptions = context.program.getCompilerOptions();
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

    if (!checkIsImportable({ 
      tsProgram: context.program, 
      importPath: context.filename, 
      exportPath, 
      exportName 
    })) {
      context.report(node, exportName, relExportPath);
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
    ImportSpecifier: (node: TSESTree.ImportSpecifier) =>
      "name" in node.imported && checkNode(node, node.imported.name, extractPathFromImport(node.parent)),
    ImportDefaultSpecifier: (node: TSESTree.ImportDefaultSpecifier) => 
      checkNode(node, "default", extractPathFromImport(node.parent)),
    ImportDeclaration: (node: TSESTree.ImportDeclaration) => 
      !node.specifiers.length && checkNode(node, undefined, extractPathFromImport(node)),
    ImportExpression: (node: TSESTree.ImportExpression) => {
      const relExportPath = extractPathFromImport(node);
      const parent = node.parent;
      if (
        parent.parent?.type === AST_NODE_TYPES.Program ||
        (parent?.type === AST_NODE_TYPES.AwaitExpression && parent.parent.parent?.type === AST_NODE_TYPES.Program)
      ) {
        return checkNode(node, undefined, relExportPath);
      }
    },
    Program: (node: TSESTree.Program) => validateProgram(context, node, lintNode),
  };
};