"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.ruleName = void 0;
const utils_1 = require("@typescript-eslint/utils");
const common_1 = require("./common");
exports.ruleName = "private-export";
const createRule = utils_1.ESLintUtils.RuleCreator(() => "");
exports.rule = createRule({
    name: exports.ruleName,
    meta: {
        type: "problem",
        docs: {
            description: "Disallows importing private exports outside their export scope",
            recommended: false,
        },
        messages: {
            privateExport: "Cannot import a private export '{{ identifier }}' outside its export scope",
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
    defaultOptions: [{}],
    create(context) {
        const tsProgram = utils_1.ESLintUtils.getParserServices(context).program;
        const validateNode = (node) => {
            var _a, _b;
            if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) !== "ImportDeclaration")
                return;
            const tsNode = utils_1.ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(node);
            if (!(tsNode === null || tsNode === void 0 ? void 0 : tsNode.name))
                return;
            const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode.name);
            const exportSymbol = importSymbol && tsProgram.getTypeChecker().getImmediateAliasedSymbol(importSymbol);
            const exportPath = (_b = exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.declarations) === null || _b === void 0 ? void 0 : _b[0].getSourceFile().fileName;
            const isAccessible = (0, common_1.checkIsAccessible)({
                tsProgram,
                importPath: context.getFilename(),
                exportPath,
                exportName: exportSymbol === null || exportSymbol === void 0 ? void 0 : exportSymbol.name,
                strictMode: context.options[0].strictMode,
            });
            if (!isAccessible) {
                context.report({
                    node,
                    messageId: "privateExport",
                    data: { identifier: node.local.name },
                });
            }
        };
        return {
            ImportSpecifier: validateNode,
            ImportDefaultSpecifier: validateNode,
        };
    },
});
