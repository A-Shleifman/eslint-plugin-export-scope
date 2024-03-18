import { analyze, type Variable } from "@typescript-eslint/scope-manager";
import { type TSESTree } from "@typescript-eslint/utils";
import { validateJsDoc } from "./validateJsDoc";
import { type RuleContext } from "@typescript-eslint/utils/ts-eslint";
import { type MessageIdsType } from "./esLintRule";

export const validateProgram = (
  context: RuleContext<MessageIdsType, never[]>,
  node: TSESTree.Program,
  lintNode: (node: TSESTree.Node) => void,
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

  const lintVariables = (moduleVariables: Variable[], scopeVariables: Variable[]) => {
    const variableNameToVariableMap = new Map(scopeVariables.map((variable) => [variable.name, variable]));

    moduleVariables.forEach((variable) => {
      const moduleNames = getModuleNames(variable, scopeVariables);
      const variables = Array.from(moduleNames)
        .map((name) => variableNameToVariableMap.get(name))
        .filter(Boolean) as Variable[];

      variables.forEach((variable) => variable.references.forEach((ref) => lintNode(ref.identifier.parent)));
    });
  };

  // global scope variables
  lintVariables(
    globalVariables.filter((variable) => {
      const parent = variable.identifiers?.[0]?.parent;
      if (parent?.type === "ImportNamespaceSpecifier") return true;

      if (parent?.type === "VariableDeclarator") {
        const { init } = parent;
        if (init?.type === "ImportExpression") return true;
        if (init?.type === "AwaitExpression" && init.argument.type === "ImportExpression") return true;
      }
    }),
    globalVariables,
  );

  // dynamic imports
  scopeTree.scopes.filter((scope) => {
    const blockParent = scope.block.parent;

    if (blockParent?.type !== "CallExpression") return;

    if (blockParent.callee.type !== "MemberExpression") return;

    if (blockParent.callee.object.type !== "ImportExpression") return;

    const moduleVariable = scope.variables?.[0];

    if (!moduleVariable) return;

    if (
      moduleVariable.identifiers?.[0]?.parent.type === "Property" &&
      moduleVariable.identifiers?.[0]?.parent.parent.type === "ObjectPattern"
    ) {
      const objectPattern = moduleVariable.identifiers?.[0]?.parent.parent;
      lintNode(objectPattern);
    }

    lintVariables([moduleVariable], scope.variables);
  });
};
