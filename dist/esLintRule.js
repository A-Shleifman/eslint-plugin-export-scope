"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.ruleName = void 0;
const utils_1 = require("@typescript-eslint/utils");
const common_1 = require("./common");
exports.ruleName = "no-imports-outside-export-scope";
const isImportDeclaration = (node) => node.type === "ImportDeclaration";
const createRule = utils_1.ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope/blob/main/no-imports-outside-export-scope.md");
exports.rule = createRule({
    name: exports.ruleName,
    meta: {
        type: "problem",
        docs: {
            description: "Disallows importing scoped exports outside their scope",
            recommended: false,
        },
        messages: {
            exportScope: "Cannot import {{ identifier }} outside its export scope",
        },
        schema: [
            {
                type: "object",
                properties: (0, common_1.cast)({
                    strictMode: {
                        type: "boolean",
                    },
                }),
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [(0, common_1.cast)({ strictMode: false })],
    create(context) {
        const tsProgram = utils_1.ESLintUtils.getParserServices(context).program;
        const checkIsAccessible = ({ exportPath, exportName, }) => (0, common_1.checkIsAccessible)({
            tsProgram,
            importPath: context.getFilename(),
            exportPath,
            exportName,
            strictMode: context.options[0].strictMode,
        });
        const validateImportSpecifier = (node) => {
            var _a;
            const tsNode = utils_1.ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(node);
            if (!(tsNode === null || tsNode === void 0 ? void 0 : tsNode.name))
                return;
            const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode.name);
            const exportSymbol = importSymbol && tsProgram.getTypeChecker().getImmediateAliasedSymbol(importSymbol);
            const exportPath = (_a = exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.valueDeclaration) === null || _a === void 0 ? void 0 : _a.getSourceFile().fileName;
            if (!checkIsAccessible({ exportPath, exportName: exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.name })) {
                context.report({
                    node,
                    messageId: "exportScope",
                    data: { identifier: `'${node.local.name}'` },
                });
            }
        };
        return {
            ImportDeclaration: (node) => {
                var _a;
                if (node.specifiers.length)
                    return;
                const tsNode = utils_1.ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(node.source);
                const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode);
                const exportPath = (_a = importSymbol === null || importSymbol === void 0 ? void 0 : importSymbol.valueDeclaration) === null || _a === void 0 ? void 0 : _a.getSourceFile().fileName;
                if (!checkIsAccessible({ exportPath })) {
                    context.report({
                        node,
                        messageId: "exportScope",
                        data: { identifier: "module" },
                    });
                }
            },
            ImportSpecifier: validateImportSpecifier,
            ImportDefaultSpecifier: validateImportSpecifier,
        };
    },
});
