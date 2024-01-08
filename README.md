# eslint-plugin-export-scope

Set export scope (importability) for local utils, states, contexts, components, e.t.c. They should only be visible/accessible within their local scope.

![Before-after comparison](/readme-src/before_after.jpg "Before-after comparison")

<p align="center">

| scope | importable from                    |                               |
| ----- | ---------------------------------- | ----------------------------- |
| [^0]  | current directory and children     | default for all exports       |
| [^1]  | parent directory and children      | default for **`index`** files |
| [^2]  | two directories above and children |                               |
| [^*]  | anywhere                           |                               |

</p>

## Scoped Exports

```ts
// default[^1]
/** ☝ Applies to all exports in the file unless overriden with a local [^] */

// [^*]
export const helper1 = ""; // 👈 Available everywhere

export const helper2 = ""; // 👈 inherits scope from `default[^1]`

/** [^2] */ export default "";
```

## Scope Files

Set default folder scope with **scope files** like [^0], [^1], [^2], [^*]. These files are usually blank.

```
└── src
  └── common
    ├── [^*] 👈 this will make all exports within `common` accessible from anywhere unless a specific export is overriden on a lower level
    ├── context.ts
    └── utils.ts
```

_Hint: creating a **[^\*]** file in the root of the project will make all exports global by default if you prefer this approach_

### Exceptions

Exceptions to the default scope can be provided inside **scope files**

```
└── src
  └── generated
    ├── [^0] 👈 exports only available within this folder
    └── schema.ts
  └── scripts
    └── index.ts
```

```sh
# [^0]
../scripts  👈 but any file under `src/scripts` can import
../scripts/index.ts 👈 but `src/scripts/index.ts` can import
```

## Issues

⚠️ To re-lint imports in VSCode after updating `[^]` declarations ESLint Server needs to be restarted [(ESLint limitation)](https://github.com/microsoft/vscode-eslint/issues/1565#event-7958473201).

<p align="center">
  <img src="readme-src/restart_eslint_server.png" alt="Restart ESLint Server" width="200" />
</p>

## Installation

Install [ESLint](https://eslint.org/) and the `export-scope` package. This package includes both an ESLint plugin and a TS Language Server plugin.

```sh
npm i -D eslint eslint-plugin-export-scope
```

#### ESLint plugin will highlight imports outside the scope

```js
// .eslintrc.js
module.exports = {
  // ...
  overrides: [
    {
      files: ["*.js", "*.mjs", "*.jsx", "*.ts", "*.mts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: { project: true, tsconfigRootDir: __dirname },
      plugins: ["export-scope"],
      rules: { "export-scope/no-imports-outside-export-scope": "error" },
    },
  ],
};
```

#### TS plugin will disable autocompletion for exports outside the scope

```json
// tsconfig.json
"compilerOptions": {
  "plugins": [{ "name": "eslint-plugin-export-scope" }],
},
```

Tell VSCode to `Use Workspace Version` of TypeScript. Otherwise TS plugin won't work.

<p align="center">
  <img src="readme-src/ts_version.png" alt="Select TS version" width="600" />
</p>
