import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createImportValidator } from "./importValidation";
import { basename, dirname } from "path";
import { SCOPE_FILE_NAMES } from "../constants";
import { validateScopeDeclarations, validateLiteralInScope, type ValidationError } from "./scopeValidation";

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
    const fileName = basename(context.filename);
    const isScopeFile = SCOPE_FILE_NAMES.includes(fileName);
    
    if (isScopeFile) {
      // Handle scope files for ESLint 8 compatibility (ESLint 9 uses processor)
      const exportDir = dirname(context.filename);
      
      const reportError = (error: ValidationError) => {
        context.report({
          node: context.sourceCode.ast,
          messageId: error.message.includes("Only parent dirs") ? "onlyParents" : "invalidPath",
          data: { identifier: error.message.replace(/^Invalid scope path: "(.+)"$/, "$1") },
          loc: {
            start: { line: error.line, column: error.column },
            end: { line: error.endLine, column: error.endColumn }
          }
        });
      };
      
      return {
        Literal: (node: TSESTree.Literal) => {
          validateLiteralInScope(node, exportDir, reportError);
        },
        Program: () => {
          const comments = context.sourceCode.getAllComments();
          validateScopeDeclarations(comments, exportDir, reportError);
        }
      };
    }

    let services;
    try {
      services = ESLintUtils.getParserServices(context);
    } catch {
      // No parser services available - can't validate imports
      return {};
    }

    if (!services.getSymbolAtLocation) {
      throw new Error("Please make sure you have the latest version of `@typescript-eslint/parser` installed.");
    }

    const validationContext = {
      filename: context.filename,
      program: services.program,
      report: (node: TSESTree.Node, exportName?: string) => {
        context.report({
          node,
          messageId: "exportScope",
          data: { identifier: exportName ? `'${exportName}'` : "module" },
        });
      }
    };

    const importValidator = createImportValidator(validationContext);
    
    return {
      ...importValidator,
      Program: (node: TSESTree.Program) => {
        // First run the original Program visitor for import validation
        if (importValidator.Program) {
          importValidator.Program(node);
        }
        
        // Then run JSDoc validation
        const comments = context.sourceCode.getAllComments();
        const exportDir = dirname(context.filename);
        validateScopeDeclarations(comments, exportDir, (error: ValidationError) => {
          context.report({
            node,
            messageId: error.message.includes("Only parent dirs") ? "onlyParents" : "invalidPath",
            data: { identifier: error.message.replace(/^Invalid scope path: "(.+)"$/, "$1") },
            loc: {
              start: { line: error.line, column: error.column },
              end: { line: error.endLine, column: error.endColumn }
            }
          });
        });
      }
    };
  },
});
