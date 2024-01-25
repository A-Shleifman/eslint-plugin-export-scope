# eslint-plugin-export-scope

Don't leak **LOCAL** utils, states, contexts, components into the global scope.

![Basics](/readme-src/basics.jpg "Basics")

## Demo

![Demo](/readme-src/demo.gif "Demo")

## Scopes

<p align="center">

| scope           | importable from                         |                               |
| --------------- | --------------------------------------- | ----------------------------- |
| .               | current directory and children          | default for all exports       |
| ..              | parent directory and children           | default for **`index`** files |
| ../..           | two directories above and children      |                               |
| src/consumer    | within specified directory and children |                               |
| src/consumer.ts | within specified file                   |                               |
| \*              | anywhere                                |                               |

</p>

## Scoped Exports

```ts
/** @scopeDefault ../.. */
/** ☝ Applies to all exports in the file unless overriden with a local `@scope` */

/** @scope * */
export const helper1 = ""; // 👈 Available everywhere

export const helper2 = ""; // 👈 inherits scope `../..` from `@scopeDefault`

/** @scope src/components */
export default "";
```

## Default folder scope with `.scope.ts` files

<p align="center">
<img src="./readme-src/scope_file.png" width="500" title="Scope File example">
</p>

```ts
└── src
  └── `common`
    ├── utils.ts
    ├── context.ts
    └── `.scope.ts`
             │
             │
  ╭────────────────────╮
  │ export default '*' │
  ╰────────────────────╯
// ⬆ this will make all exports within `common`
// importable from anywhere unless a
// specific export is overriden on a lower level

```

### Exceptions

#### Export scope exceptions

```ts
// schema.ts
/**
 * @scope ..
 * @scopeException src/schemaConsumer 👈 whole folder has access
 * @scopeException src/schemaConsumer/index.ts 👈 whole file has access
 */
export default "";
```

#### Folder scope exceptions in `.scope.ts` files

```ts
└── src
  └── `generated`
    ├── schema.ts
    └── `.scope.ts`
             │
             │
  ╭──────────────────────────────────╮
  │ export default '.';              │
  │                                  │
  │ export const exceptions = [      │
  │   'src/schemaConsumer',          │
  │   'src/scripts/schemaParser.ts', │
  │ ]                                │
  ╰──────────────────────────────────╯
// ⬆ by default exports are only importable
// within `generated` folder, but
// folders/files in `exceptions` are exempt.

```

## Installation

Install [ESLint](https://eslint.org/) and the `export-scope` package. This package includes both an `ESLint` plugin and a `TS Language Server` plugin.

```sh
npm i -D eslint @typescript-eslint/parser eslint-plugin-export-scope
                    # ⬆ v6 or above
```

#### ESLint plugin will highlight imports outside the scope

```js
// .eslintrc.js
module.exports = {
  // ...
  extends: ["plugin:eslint-plugin-export-scope/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { project: true, tsconfigRootDir: __dirname },
  ignorePatterns: ["!.scope.ts"],
};
```

<details>
  <summary>Manual ESLint configuration</summary>

```js
// .eslintrc.js
module.exports = {
  // ...
  e̶x̶t̶e̶n̶d̶s̶:̶ ̶[̶"̶p̶l̶u̶g̶i̶n̶:̶e̶s̶l̶i̶n̶t̶-̶p̶l̶u̶g̶i̶n̶-̶e̶x̶p̶o̶r̶t̶-̶s̶c̶o̶p̶e̶/̶r̶e̶c̶o̶m̶m̶e̶n̶d̶e̶d̶"̶]̶,̶
  plugins: ["export-scope"],
  rules: { "export-scope/no-imports-outside-export-scope": "error" },
};
```

</details>

#### TS plugin will disable autocompletion for exports outside the scope

```js
// tsconfig.json
"compilerOptions": {
  "plugins": [{ "name": "eslint-plugin-export-scope" }],
},
"include": ["**/*", "**/.scope.ts"]
//                  "../../**/.scope.ts" for monorepos
```

Tell VSCode to `Use Workspace Version` of TypeScript. Otherwise TS plugin won't work.

<p align="center">
  <img src="readme-src/ts_version.png" alt="Select TS version" width="600" />
</p>

<details>
  <summary>Configuration for JS projects</summary>

- `tsconfig.json` file is still required for the plugin to work
- replace `.scope.ts` in both configs with `.scope.js`
- set `compilerOptions.allowJs`to `true` in `tsconfig.json`
</details>

## Upgrading from v1 to v2

- Replace all `//` comments with jsDocs `/** */`
- Replace `@scope default` with `@scopeDefault`
- Relace `@..` file/folder prefixes with `.scope.ts` files.
- Make sure `.eslintrc.js` and `tsconfig.json` configs are updated

## Hints

- Type `@` above exports for automatic jsDoc generation.
- Use autocompletion provided within jsDocs and `.scope.ts` files.
- Creating an `export default '*'` `.scope.ts` file in the root of the project will make all exports global by default if you prefer a less strict approach.
- When dynamically importing a module `@scopeDefault` must be specified, as individual `@scope` declarations are not respected at the moment for dynamic imports.

## Issues

⚠️ To re-lint an import in VSCode after updating a `scope` declaration either `touch` this import or restart the ESLint Server [(ESLint limitation)](https://github.com/microsoft/vscode-eslint/issues/1565#event-7958473201).

<p align="center">
  <img src="readme-src/restart_eslint_server.png" alt="Restart ESLint Server" width="200" />
</p>
