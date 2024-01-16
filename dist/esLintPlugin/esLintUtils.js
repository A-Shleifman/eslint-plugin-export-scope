"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPathLoc = exports.getScopeDeclarations = void 0;
const getScopeDeclarations = (comments) => {
    return comments.reduce((acc, { type, value, loc }) => {
        var _a;
        if (type !== "Block")
            return acc;
        const [, prefix, scopeType, path] = (_a = value.match(/(\s*\*\s*@)(scope|scopeDefault|scopeException)\s+([^\s]+)/)) !== null && _a !== void 0 ? _a : [];
        if (prefix && scopeType && path) {
            // loc.start.column = loc.start.column + prefix.length + scopeType.length + 1;
            acc.push({ type: scopeType, path, loc });
        }
        return acc;
    }, []);
};
exports.getScopeDeclarations = getScopeDeclarations;
const getPathLoc = (text, loc) => {
    var _a;
    const commentLine = text.split("\n")[loc.start.line - 1];
    const [, prefix, tag, postfix, path] = (_a = commentLine.match(/^([^]*@)(scope|scopeDefault|scopeException)(\s+)([^\s]+)/)) !== null && _a !== void 0 ? _a : [];
    if (prefix && tag && postfix && path) {
        return {
            start: { line: loc.start.line, column: loc.start.column + prefix.length + tag.length + postfix.length },
            end: {
                line: loc.start.line,
                column: loc.start.column + prefix.length + tag.length + postfix.length + path.length,
            },
        };
    }
    return loc;
};
exports.getPathLoc = getPathLoc;
//# sourceMappingURL=esLintUtils.js.map