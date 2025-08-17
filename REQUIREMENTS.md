# Export Scope Plugin Requirements

## Purpose

Prevent LOCAL utilities, components, contexts, and states from leaking into global scope by enforcing export visibility rules through ESLint validation and TypeScript autocompletion restrictions.

## Core Functionality

### Scope Enforcement

- **Default scope**: `.` (current directory and children)
- **Parent access**: `..`, `../..` (ancestor directories and their children)
- **Directory scope**: `src/components` (specific directory and children)
- **File scope**: `src/components/index.ts` (specific file only)
- **Global scope**: `*` (accessible everywhere)

### JSDoc Directives

- `@scope <path>`: Set export scope for individual exports
- `@scopeDefault <path>`: Set default scope for all exports in file
- `@scopeException <path>`: Grant additional access to specific paths

### Scope Files (.scope.ts)

- `export default '<path>'`: Set default scope for directory
- `export const exceptions = ['<path>']`: Grant exceptions to specific paths

### Validation Rules

- **Ancestor-only paths**: `@scope`, `@scopeDefault`, `export default` in .scope.ts only allow ancestor directories
- **Any-path exceptions**: `@scopeException` and `exceptions` array allow any project path
- **Path existence**: All paths must exist in filesystem
- **Precise error highlighting**: ESLint errors highlight exact invalid path text, not entire JSDoc blocks

### Autocompletion Support

- **Path autocompletion**: Relative paths (`../`, `../../`) and absolute paths (`src/components`)
- **Context-aware**: Different completion rules for scope vs exception contexts
- **File system integration**: Suggests real directories and files

### Integration Requirements

- **ESLint plugin**: Validates import scope violations with precise error locations
- **TypeScript plugin**: Filters autocompletion to respect scope rules
- **No TypeScript program dependency when parsing `.scope` files**: Parsed without TS parser
- **Multi-line comment support**: Handles JSDoc spanning multiple lines
- **Legacy config support**: Works with both flat config (ESLint 9) and legacy config (ESLint 8)
