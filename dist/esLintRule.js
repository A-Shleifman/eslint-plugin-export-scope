"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.ruleName = void 0;
const utils_1 = require("@typescript-eslint/utils");
const common_1 = require("./common");
exports.ruleName = "no-imports-outside-export-scope";
const createRule = utils_1.ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope");
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
        const validateNode = (node, exportName) => {
            var _a;
            const parseNode = "source" in node ? node.source : node.parent && "source" in node.parent ? node.parent.source : node;
            if (!parseNode)
                return;
            const tsNode = utils_1.ESLintUtils.getParserServices(context).esTreeNodeToTSNodeMap.get(parseNode);
            const importSymbol = tsProgram.getTypeChecker().getSymbolAtLocation(tsNode);
            const exportPath = (_a = importSymbol === null || importSymbol === void 0 ? void 0 : importSymbol.valueDeclaration) === null || _a === void 0 ? void 0 : _a.getSourceFile().fileName;
            if (!checkIsAccessible({ exportPath, exportName })) {
                context.report({
                    node,
                    messageId: "exportScope",
                    data: { identifier: exportName ? `'${exportName}'` : "module" },
                });
            }
        };
        return {
            ImportDeclaration: (node) => !node.specifiers.length && validateNode(node),
            ImportExpression: (node) => validateNode(node),
            ImportSpecifier: (node) => validateNode(node, node.imported.name),
            ImportDefaultSpecifier: (node) => validateNode(node, "default"),
        };
    },
});
