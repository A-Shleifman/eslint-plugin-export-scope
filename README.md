# eslint-plugin-export-scope

Disallows importing scoped exports outside their scope.

![Before-after comparison](/readme-src/before_after.jpg "Before-after comparison")

⚠️ VSCode ESLint Server may need to be restarted when `@scope` declarations are updated to re-lint imports.

## Usage Example

```ts
// 👇 default file delaration.
// All exports in this file without a local declaration
// 👇 will only be availabe within this dir and subdirs by default
/** @scope default . */

// 👇 Available everywhere. Only useful in Strict Mode
/** @scope * */
export const helper1 = "";

// 👇 infers availability from the default scope above
export const helper2 = "";

// 👇 this export will be available starting from 2 dirs up and in all subdirs
/** @scope ../.. */
export default "";
```

Any type of comment / JSDoc can be used. Only JSDoc offers syntax highlighting in VSCode.

```ts
// @scope .
/* @scope . */
/** @scope . */
export default "";
```

## Installation

Install [ESLint](https://eslint.org/) and the ESLint/TS plugin:

```sh
npm i -D eslint eslint-plugin-export-scope
```

#### ESLint plugin:

Add `export-scope` to the plugins section of your `.eslintrc` or `.eslintrc.js` configuration file.

```json
"overrides": [{
  "files": ["*.js", "*.mjs", "*.jsx", "*.ts", "*.mts", "*.tsx"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "project": "tsconfig.json" },
  "plugins": ["export-scope"],
  "rules": {
    "export-scope/no-imports-outside-export-scope": [
      "error",
      { "strictMode": true }
    ]
  }
}]
```

#### TS plugin:

Add TypeScript plugin to your `tsconfig.json`. This will hide inaccessible exports from VSCode autocomplete suggestions.

```json
"compilerOptions": {
  "plugins": [
    { "name": "eslint-plugin-export-scope", "strictMode": false }
  ],
},
"include": ["**/*"],
```

Tell VSCode to `Use Workspace Version` of TypeScript. Otherwise TS plugin won't work.

![Select TS version](/readme-src/ts_version.png "Select TS version")

## Strict Mode

You can set `strictMode` to `true` in both `tsconfig.json` and `.eslintrc` to activate the Strict Mode.

Strict Mode restricts all exports to the export directory (and subdirectories) by default. `index` files are accessible one level above the export directory. Default behaviour can be overriden with `@scope` properties.

## Path Tags

Default export scope can also be declared by adding `@` to folder/file names:

| path                             | accessibility                                                   |
| -------------------------------- | --------------------------------------------------------------- |
| `src/@common/utils.ts`           | exports within `@common` will be global unless overriden        |
| `src/@utils.ts`                  | exports within `@utils.ts` file will be global unless overriden |
| `src/sub1/sub2/@..sub3/file.ts`  | exports within `@..sub3` will be available from `sub2`          |
| `src/sub1/sub2/@...sub3/file.ts` | exports within `@...sub3` will be available from `sub1`         |
