import { analyze, type ScopeManager, type Variable } from "@typescript-eslint/scope-manager";
import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { validateJsDoc } from "./validateJsDoc";
import { type RuleContext } from "@typescript-eslint/utils/ts-eslint";
import { type MessageIdsType } from "./esLintRule";
import { extractPathFromImport } from "./esLintUtils";

export const validateProgram = (
  context: RuleContext<MessageIdsType, never[]>,
  node: TSESTree.Program,
  lintNode: (node: TSESTree.Node, elExportPath?: string) => void,
) => {
  validateJsDoc(context, node);

  const getModuleNames = (rootVariable: Variable, variables: Variable[]) => {
    const moduleNames = new Set([rootVariable.name]);

    const variableNameToVariableMap = new Map(variables.map((variable) => [variable.name, variable]));

    const iterateRefs = (variable: Variable) => {
      variable.references.forEach((ref) => {
        const decl = ref.identifier.parent;
        if (decl.type === AST_NODE_TYPES.VariableDeclarator && decl.id.type === AST_NODE_TYPES.Identifier) {
          const isAlreadyAdded = moduleNames.has(decl.id.name);
          moduleNames.add(decl.id.name);

          if (!isAlreadyAdded) {
            const variable = variableNameToVariableMap.get(decl.id.name);
            if (variable) iterateRefs(variable);
          }
        }
      });
    };

    iterateRefs(rootVariable);

    return moduleNames;
  };

  let scopeTree: ScopeManager;

  try {
    scopeTree = analyze(node, { sourceType: "module" });
  } catch {
    return;
  }

  const globalVariables = scopeTree.globalScope?.childScopes[0]?.variables;

  if (!globalVariables) return;

  const lintVariable = (variable: Variable, scopeVariables: Variable[], relExportPath?: string) => {
    const variableNameToVariableMap = new Map(scopeVariables.map((variable) => [variable.name, variable]));

    const moduleNames = getModuleNames(variable, scopeVariables);
    const variables = Array.from(moduleNames)
      .map((name) => variableNameToVariableMap.get(name))
      .filter(Boolean) as Variable[];

    variables.forEach((variable) =>
      variable.references.forEach((ref) => lintNode(ref.identifier.parent, relExportPath)),
    );
  };

  // global scope variables
  globalVariables.forEach((variable) => {
    const parent = variable.identifiers?.[0]?.parent;

    if (parent?.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
      lintVariable(variable, globalVariables, extractPathFromImport(parent.parent));
    }

    const extractPathFromVariableDeclarator = ({ init: node }: TSESTree.VariableDeclarator) => {
      if (node?.type === AST_NODE_TYPES.AwaitExpression) node = node.argument;
      if (node?.type === AST_NODE_TYPES.ImportExpression) return extractPathFromImport(node);
    };

    if (parent?.type === AST_NODE_TYPES.VariableDeclarator) {
      const relExportPath = extractPathFromVariableDeclarator(parent);
      if (relExportPath) {
        lintVariable(variable, globalVariables, relExportPath);
      }
    }

    if (
      parent?.type === AST_NODE_TYPES.Property &&
      parent.parent.type === AST_NODE_TYPES.ObjectPattern &&
      parent.parent.parent.type === AST_NODE_TYPES.VariableDeclarator
    ) {
      const relExportPath = extractPathFromVariableDeclarator(parent.parent.parent);

      if (relExportPath) {
        lintNode(parent.key, relExportPath);
      }
    }
  });

  // thenned dynamic imports
  scopeTree.scopes.forEach((scope) => {
    const blockParent = scope.block.parent;

    if (blockParent?.type !== AST_NODE_TYPES.CallExpression) return;
    if (blockParent.callee.type !== AST_NODE_TYPES.MemberExpression) return;
    if (blockParent.callee.object.type !== AST_NODE_TYPES.ImportExpression) return;

    const relExportPath = extractPathFromImport(blockParent.callee.object);
    const moduleVariable = scope.variables?.[0];

    if (!moduleVariable) return;

    if (
      moduleVariable.identifiers?.[0]?.parent.type === AST_NODE_TYPES.Property &&
      moduleVariable.identifiers?.[0]?.parent.parent.type === AST_NODE_TYPES.ObjectPattern
    ) {
      const objectPattern = moduleVariable.identifiers?.[0]?.parent.parent;
      lintNode(objectPattern, relExportPath);
    } else {
      lintVariable(moduleVariable, scope.variables, relExportPath);
    }
  });
};
