"use strict";
module.exports = {
    overrides: [
        {
            files: ["*.ts", "*.tsx", "*.mts", "*.cts", "*.js", "*.jsx", "*.mjs"],
            parser: "@typescript-eslint/parser",
            parserOptions: { project: true, tsconfigRootDir: __dirname },
            plugins: ["export-scope"],
            rules: { "export-scope/no-imports-outside-export-scope": "error" },
        },
    ],
};
//# sourceMappingURL=recommended.js.map