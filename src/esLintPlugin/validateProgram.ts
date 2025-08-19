import { analyze, type ScopeManager, type Variable } from "@typescript-eslint/scope-manager";
import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { extractPathFromImport } from "./esLintUtils";

export interface ProgramValidationContext {
  filename: string;
}

export const validateProgram = (
  context: ProgramValidationContext,
  node: TSESTree.Program,
  lintNode: (node: TSESTree.Node, elExportPath?: string) => void,
) => {
  const getModuleNames = (rootVariable: Variable, variableNameToVariableMap: Map<string, Variable>) => {
    const moduleNames = new Set([rootVariable.name]);
    const visited = new Set<Variable>();

    const iterateRefs = (variable: Variable) => {
      if (visited.has(variable)) return;
      visited.add(variable);
      
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
    console.error("🚨 Please upgrade all @typescript-eslint/* packages to the latest mojor version 🚨");
    return;
  }

  const globalVariables = scopeTree.globalScope?.childScopes[0]?.variables;
  if (!globalVariables) return;

  const globalVariableMap = new Map(globalVariables.map((variable) => [variable.name, variable]));

  const lintVariable = (variable: Variable, variableNameToVariableMap: Map<string, Variable>, relExportPath?: string) => {
    const moduleNames = getModuleNames(variable, variableNameToVariableMap);
    const variables = Array.from(moduleNames)
      .map((name) => variableNameToVariableMap.get(name))
      .filter(Boolean) as Variable[];

    variables.forEach((variable) =>
      variable.references.forEach((ref) => lintNode(ref.identifier.parent, relExportPath)),
    );
  };

  const extractPathFromVariableDeclarator = ({ init: node }: TSESTree.VariableDeclarator) => {
    if (node?.type === AST_NODE_TYPES.AwaitExpression) node = node.argument;
    if (node?.type === AST_NODE_TYPES.ImportExpression) return extractPathFromImport(node);
  };
  globalVariables.forEach((variable) => {
    const parent = variable.identifiers?.[0]?.parent;
    if (!parent) return;

    if (parent.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
      lintVariable(variable, globalVariableMap, extractPathFromImport(parent.parent));
      return;
    }

    if (parent.type === AST_NODE_TYPES.VariableDeclarator) {
      const relExportPath = extractPathFromVariableDeclarator(parent);
      if (relExportPath) {
        lintVariable(variable, globalVariableMap, relExportPath);
      }
      return;
    }

    if (
      parent.type === AST_NODE_TYPES.Property &&
      parent.parent.type === AST_NODE_TYPES.ObjectPattern &&
      parent.parent.parent.type === AST_NODE_TYPES.VariableDeclarator
    ) {
      const relExportPath = extractPathFromVariableDeclarator(parent.parent.parent);
      if (relExportPath) {
        lintNode(parent.key, relExportPath);
      }
    }
  });

  scopeTree.scopes.forEach((scope) => {
    const blockParent = scope.block.parent;

    if (!blockParent || blockParent.type !== AST_NODE_TYPES.CallExpression) return;
    if (blockParent.callee.type !== AST_NODE_TYPES.MemberExpression) return;
    if (blockParent.callee.object.type !== AST_NODE_TYPES.ImportExpression) return;

    const relExportPath = extractPathFromImport(blockParent.callee.object);
    const moduleVariable = scope.variables?.[0];
    if (!moduleVariable) return;

    const firstIdentifierParent = moduleVariable.identifiers?.[0]?.parent;
    
    if (
      firstIdentifierParent?.type === AST_NODE_TYPES.Property &&
      firstIdentifierParent.parent.type === AST_NODE_TYPES.ObjectPattern
    ) {
      lintNode(firstIdentifierParent.parent, relExportPath);
    } else {
      const scopeVariableMap = new Map(scope.variables.map((variable) => [variable.name, variable]));
      lintVariable(moduleVariable, scopeVariableMap, relExportPath);
    }
  });
};
