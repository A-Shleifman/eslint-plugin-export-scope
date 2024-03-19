import { analyze, type Variable } from "@typescript-eslint/scope-manager";
import { type TSESTree } from "@typescript-eslint/utils";
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
        if (decl.type === "VariableDeclarator" && decl.id.type === "Identifier") {
          const isAlreadyAdded = moduleNames.has(decl.id.name);
          moduleNames.add(decl.id.name);

          if (!isAlreadyAdded) {
            const variable = variableNameToVariableMap.get(decl.id.name);
            variable && iterateRefs(variable);
          }
        }
      });
    };

    iterateRefs(rootVariable);

    return moduleNames;
  };

  const scopeTree = analyze(node, { sourceType: "module" });
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

    if (parent?.type === "ImportNamespaceSpecifier") {
      lintVariable(variable, globalVariables, extractPathFromImport(parent.parent));
    }

    const extractPathFromVariableDeclarator = ({ init: node }: TSESTree.VariableDeclarator) => {
      if (node?.type === "AwaitExpression") node = node.argument;
      if (node?.type === "ImportExpression") return extractPathFromImport(node);
    };

    if (parent?.type === "VariableDeclarator") {
      const relExportPath = extractPathFromVariableDeclarator(parent);
      if (relExportPath) {
        lintVariable(variable, globalVariables, relExportPath);
      }
    }

    if (
      parent?.type === "Property" &&
      parent.parent.type === "ObjectPattern" &&
      parent.parent.parent.type === "VariableDeclarator"
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

    if (blockParent?.type !== "CallExpression") return;
    if (blockParent.callee.type !== "MemberExpression") return;
    if (blockParent.callee.object.type !== "ImportExpression") return;

    const relExportPath = extractPathFromImport(blockParent.callee.object);
    const moduleVariable = scope.variables?.[0];

    if (!moduleVariable) return;

    if (
      moduleVariable.identifiers?.[0]?.parent.type === "Property" &&
      moduleVariable.identifiers?.[0]?.parent.parent.type === "ObjectPattern"
    ) {
      const objectPattern = moduleVariable.identifiers?.[0]?.parent.parent;
      lintNode(objectPattern, relExportPath);
    } else {
      lintVariable(moduleVariable, scope.variables, relExportPath);
    }
  });
};
