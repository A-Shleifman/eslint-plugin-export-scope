"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rule = exports.ruleName = void 0;
const utils_1 = require("@typescript-eslint/utils");
const importabilityChecker_1 = require("../importabilityChecker");
const utils_2 = require("../utils");
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const esLintUtils_1 = require("./esLintUtils");
exports.ruleName = "no-imports-outside-export-scope";
const createRule = utils_1.ESLintUtils.RuleCreator(() => "https://github.com/A-Shleifman/eslint-plugin-export-scope");
let cachedScopeDeclarations = [];
exports.rule = createRule({
    name: exports.ruleName,
    meta: {
        type: "problem",
        docs: {
            description: "Disallows importing scoped exports outside their scope",
        },
        messages: {
            exportScope: "Cannot import {{ identifier }} outside its export scope",
            invalidPath: `Invalid scope path: "{{ identifier }}"`,
            onlyParents: "Only parent dirs are allowed for @scope and @scopeDefault",
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const services = utils_1.ESLintUtils.getParserServices(context);
        if (!services.getSymbolAtLocation) {
            throw new Error("Please make sure you have the latest version of `@typescript-eslint/parser` installed.");
        }
        const checkIsImportable = (props) => (0, importabilityChecker_1.checkIsImportable)(Object.assign({ tsProgram: services.program, importPath: context.filename }, props));
        const validateNode = (node, exportName) => {
            var _a, _b;
            const parseNode = "source" in node ? node.source : node.parent && "source" in node.parent ? node.parent.source : node;
            if (!parseNode)
                return;
            const importSymbol = services.getSymbolAtLocation(parseNode);
            const exportPath = (_b = (_a = importSymbol === null || importSymbol === void 0 ? void 0 : importSymbol.declarations) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.getSourceFile().fileName;
            if (!checkIsImportable({ exportPath, exportName })) {
                context.report({
                    node,
                    messageId: "exportScope",
                    data: { identifier: exportName ? `'${exportName}'` : "module" },
                });
            }
        };
        const validateJsDoc = (node) => {
            const scopeDeclarations = (0, esLintUtils_1.getScopeDeclarations)(context.sourceCode.getAllComments());
            if (scopeDeclarations.length === cachedScopeDeclarations.length &&
                scopeDeclarations.every(({ path, type }, i) => {
                    const cached = cachedScopeDeclarations[i];
                    return cached.path === path && cached.type === type;
                })) {
                return;
            }
            cachedScopeDeclarations = scopeDeclarations;
            const exportDir = (0, path_1.dirname)(context.filename);
            scopeDeclarations.forEach(({ type, path, loc }) => {
                const fullPath = (0, utils_2.getFullScopePath)(exportDir, path);
                if (!fullPath || path === "*")
                    return;
                if (type === "scope" || type === "scopeDefault") {
                    if (!exportDir.toLowerCase().startsWith(fullPath.toLowerCase())) {
                        return context.report({ node, messageId: "onlyParents", loc: (0, esLintUtils_1.getPathLoc)(context.sourceCode.text, loc) });
                    }
                }
                if (!fs_1.default.existsSync(fullPath)) {
                    context.report({
                        node,
                        messageId: "invalidPath",
                        data: { identifier: fullPath },
                        loc: (0, esLintUtils_1.getPathLoc)(context.sourceCode.text, loc),
                    });
                }
            });
        };
        const validateImportString = (node) => {
            if (![importabilityChecker_1.SCOPE_TS_FILE_NAME, importabilityChecker_1.SCOPE_JS_FILE_NAME].includes((0, path_1.basename)(context.filename)))
                return;
            const exportDir = (0, path_1.dirname)(context.filename);
            node.loc.start.column += 1;
            node.loc.end.column -= 1;
            if (typeof node.value !== "string") {
                return;
            }
            const fullPath = (0, utils_2.getFullScopePath)(exportDir, node.value);
            if (!fullPath || node.value === "*")
                return;
            if (node.parent.type === "ExportDefaultDeclaration") {
                if (!exportDir.toLowerCase().startsWith(fullPath.toLowerCase())) {
                    return context.report({ node, messageId: "onlyParents", loc: node.loc });
                }
            }
            if (["ArrayExpression", "ExportDefaultDeclaration"].includes(node.parent.type)) {
                if (!fs_1.default.existsSync(fullPath)) {
                    context.report({ node, messageId: "invalidPath", data: { identifier: fullPath }, loc: node.loc });
                }
            }
        };
        return {
            ImportDeclaration: (node) => !node.specifiers.length && validateNode(node),
            ImportExpression: (node) => validateNode(node),
            ImportSpecifier: (node) => validateNode(node, node.imported.name),
            ImportDefaultSpecifier: (node) => validateNode(node, "default"),
            Program: (node) => validateJsDoc(node),
            Literal: (node) => validateImportString(node),
        };
    },
});
//# sourceMappingURL=esLintRule.js.map