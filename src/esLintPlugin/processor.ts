import type { Linter } from "eslint";
import { basename, dirname } from "path";
import { parse } from "@typescript-eslint/typescript-estree";
import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { SCOPE_FILE_NAMES } from "../constants";
import {
  validateExportDefault,
  validateExceptionsArray,
  type ValidationError
} from "./scopeValidation";

const RULE_ID = "export-scope/no-imports-outside-export-scope";

// Cache for storing in-memory file content during processing
const fileContentCache = new Map<string, string>();

const validateScopeFileContent = (text: string, filename: string): Linter.LintMessage[] => {
  const messages: Linter.LintMessage[] = [];
  const exportDir = dirname(filename);
  
  const createLintMessage = (error: ValidationError): Linter.LintMessage => ({
    ruleId: RULE_ID,
    message: error.message,
    line: error.line,
    column: error.column,
    endLine: error.endLine,
    endColumn: error.endColumn,
    severity: 2
  });
  
  try {
    const ast = parse(text, { loc: true, range: true });
    
    if (ast.type === AST_NODE_TYPES.Program && ast.body) {
      for (const statement of ast.body) {
        if (statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
          const declaration = statement.declaration;
          if (declaration.type === AST_NODE_TYPES.ArrayExpression || declaration.type === AST_NODE_TYPES.Literal) {
            validateExportDefault(declaration, exportDir, (error) => {
              messages.push(createLintMessage(error));
            });
          }
        }
        else if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration && statement.declaration) {
          const declaration = statement.declaration;
          if (declaration.type === AST_NODE_TYPES.VariableDeclaration) {
            for (const declarator of declaration.declarations) {
              if (declarator.id.type === AST_NODE_TYPES.Identifier && 
                  declarator.id.name === "exceptions" &&
                  declarator.init?.type === AST_NODE_TYPES.ArrayExpression) {
                validateExceptionsArray(declarator.init, exportDir, (error) => {
                  messages.push(createLintMessage(error));
                });
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    messages.push({
      ruleId: RULE_ID,
      message: `Failed to parse scope file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      line: 1,
      column: 0,
      endLine: 1,
      endColumn: 1,
      severity: 2
    });
  }
  
  return messages;
};


// Processor that bypasses ESLint rules for scope files
export const exportScopeProcessor: Linter.Processor = {
  meta: { name: "export-scope/processor", version: "1" },

  // Return [] for scope files (no ESLint rules run), [text] for others
  preprocess(text: string, filename: string) {
    if (SCOPE_FILE_NAMES.includes(basename(filename))) {
      // Cache the in-memory content for validation in postprocess
      // This ensures we validate live/unsaved editor content, not disk content
      fileContentCache.set(filename, text);
      return []; // ESLint runs no rules on this file
    }
    return [text]; // Pass through for regular files
  },

  // For scope files: validate independently; for others: pass through ESLint messages
  postprocess(blockMessageLists, filename: string) {
    if (SCOPE_FILE_NAMES.includes(basename(filename))) {
      // Scope file: get cached content and validate it
      const cachedText = fileContentCache.get(filename);
      if (cachedText !== undefined) {
        const messages = validateScopeFileContent(cachedText, filename);
        // Clean up cache immediately after use
        fileContentCache.delete(filename);
        return messages;
      }
      // Fallback to empty array if no cached content (shouldn't happen)
      return [];
    }
    // Regular file: pass through ESLint's messages
    return blockMessageLists[0] ?? [];
  },

  supportsAutofix: false, // Scope files don't support autofix
};