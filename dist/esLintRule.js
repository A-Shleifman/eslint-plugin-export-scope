"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.ruleName = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("@typescript-eslint/utils");
const common_1 = require("./common");
exports.ruleName = "no-imports-outside-package";
const createRule = utils_1.ESLintUtils.RuleCreator(() => "");
exports.rule = createRule({
    name: exports.ruleName,
    meta: {
        type: "problem",
        docs: {
            description: "Disallows importing private exports outside their package",
            recommended: false,
        },
        messages: {
            packagePrivate: "Cannot import a private export '{{ identifier }}' outside its package",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const tsProgram = utils_1.ESLintUtils.getParserServices(context).program;
        if (!tsProgram) {
            console.error("Could not get parser services");
            return {};
        }
        const validateNode = (node, exportNameOverride) => {
            var _a;
            if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) !== "ImportDeclaration")
                return;
            const relativeExportPath = node.parent.source.value;
            // TODO: find the extension programmatically
            const absoluteExportPath = path_1.default.resolve(path_1.default.dirname(context.getFilename()), relativeExportPath) + ".ts";
            const isAccessible = (0, common_1.checkIsAccessible)({
                tsProgram,
                importPath: context.getFilename(),
                exportPath: absoluteExportPath,
                exportName: exportNameOverride !== null && exportNameOverride !== void 0 ? exportNameOverride : node.local.name,
            });
            if (!isAccessible) {
                context.report({
                    node,
                    messageId: "packagePrivate",
                    data: { identifier: node.local.name },
                });
            }
        };
        return {
            ImportSpecifier: validateNode,
            ImportDefaultSpecifier: (node) => validateNode(node, "default"),
        };
    },
});
