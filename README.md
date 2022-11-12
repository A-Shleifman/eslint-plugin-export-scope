# eslint-plugin-import-access

Disallows importing private exports outside their package.

⚠️ VSCode ESLint Server may need to be restarted when `@package` rules are updated.

## Installation

Install [ESLint](https://eslint.org/) and the ESLint plugin:

```sh
npm i -D eslint eslint-plugin-import-access
```

Add `import-access` to the plugins section of your `.eslintrc` or `.eslintrc.js` configuration file.

```json
{
  "extends": ["<other configs>", "plugin:import-access/recommended"]
}
```

Add TypeScript plugin to your `tsconfig.json`. This will hide private exports from VSCode autocomplete suggestions.

⚠ You need to tell VSCode to `Use Workspace Version` of TypeScript. Otherwise this plugin won't work.

```json
"compilerOptions": {
  "plugins": [
    {
      "name": "eslint-plugin-import-access"
    }
  ],
}
```
