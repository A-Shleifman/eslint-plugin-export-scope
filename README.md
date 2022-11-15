# eslint-plugin-import-access

Disallows importing private exports outside their package.

⚠️ VSCode ESLint Server may need to be restarted when `@package` rules are updated.

## Usage Example

```ts
// 👇 all exports in this file will only be availabe within this dir and subdirs by default
/** @package default . */

// 👇 this export will be available starting from 2 dirs up and all subdirs
/** @package ../.. */
export const helper1 = "";

// 👇 In standard mode - anywhere. In Strict Mode - only in this dir and subdirs
export const helper2 = "";

// 👇 same as "@package ."
/** @package */
export default "";
```

## Installation

Install [ESLint](https://eslint.org/) and the ESLint plugin:

```sh
npm i -D eslint eslint-plugin-import-access
```

Add `import-access` to the plugins section of your `.eslintrc` or `.eslintrc.js` configuration file.

⚠ `parserOptions.project` is required for this plugin. If linting doesn't work, try adding `"include": ["**/*"]` to `tscofig.json` and `.eslintrc*` to `.eslintignore`

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "project": "./tsconfig.json" },
  "plugins": ["import-access"],
  "rules": {
    "import-access/no-imports-outside-package": ["error", { "strictMode": false }]
  }
}
```

Add TypeScript plugin to your `tsconfig.json`. This will hide private exports from VSCode autocomplete suggestions.

⚠ You need to tell VSCode to `Use Workspace Version` of TypeScript. Otherwise this plugin won't work.

```json
"compilerOptions": {
  "plugins": [
    { "name": "eslint-plugin-import-access", "strictMode": false }
  ],
}
```

## Strict Mode

You can set `strictMode` to `true` in both `tsconfig.json` and `.eslintrc` to activate the Strict Mode.

Strict Mode restricts all exports to the export directory (and subdirectories) by default. `index` files are accessible one level above the export directory. Default behaviour can be overriden with `@package` properties.
