import ts from "typescript";

export type ScopeFile = { scope: string; exceptions: string[] };

type Ctx = {
  decls: Map<string, ts.VariableDeclaration>;
  memo: Map<string, string | null>;
};

function scriptKind(fileName: string): ts.ScriptKind {
  return fileName.endsWith(".js") || fileName.endsWith(".jsx") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

function createCtx(sf: ts.SourceFile): Ctx {
  const decls = new Map<string, ts.VariableDeclaration>();
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const isConst = (st.declarationList.flags & ts.NodeFlags.Const) !== 0;
    if (!isConst) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name)) decls.set(d.name.text, d);
    }
  }
  return { decls, memo: new Map() };
}

function unwrap(expr: ts.Expression): ts.Expression {
  // strip parens, `as`, `satisfies`
  while (true) {
    if (ts.isParenthesizedExpression(expr)) {
      expr = expr.expression;
      continue;
    }
    if (ts.isAsExpression(expr)) {
      expr = expr.expression;
      continue;
    }
    if (ts.isSatisfiesExpression(expr)) {
      expr = expr.expression;
      continue;
    } // TS ≥ 4.9
    break;
  }
  return expr;
}

function evalString(expr: ts.Expression, ctx: Ctx): string | null {
  expr = unwrap(expr);

  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;

  if (ts.isTemplateExpression(expr)) {
    let out = expr.head.text;
    for (const span of expr.templateSpans) {
      const v = evalString(span.expression, ctx);
      if (v == null) return null;
      out += v + span.literal.text;
    }
    return out;
  }

  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = evalString(expr.left, ctx);
    const r = evalString(expr.right, ctx);
    return l != null && r != null ? l + r : null;
  }

  if (ts.isIdentifier(expr)) {
    const name = expr.text;
    if (ctx.memo.has(name)) return ctx.memo.get(name)!;
    const decl = ctx.decls.get(name);
    if (!decl?.initializer) return null;
    const v = evalString(decl.initializer, ctx);
    ctx.memo.set(name, v);
    return v;
  }

  return null; // unsupported expression
}

function evalStringArray(expr: ts.Expression, ctx: Ctx): string[] | null {
  expr = unwrap(expr);
  if (!ts.isArrayLiteralExpression(expr)) return null;
  const out: string[] = [];
  for (const el of expr.elements) {
    const v = evalString(el, ctx);
    if (v == null) return null;
    out.push(v);
  }
  return out;
}

export function parseScopeSource(text: string, fileName: string): ScopeFile {
  const sf = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    scriptKind(fileName),
  );
  const ctx = createCtx(sf);

  let scope: string | null = null;
  let exceptions: string[] | null = null;
  let localExceptions: string[] | null = null;

  // pass 1: collect local const exceptions = […]
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const isExport = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === "exceptions" && d.initializer) {
        const arr = evalStringArray(d.initializer, ctx);
        if (!arr) throw new Error("`exceptions` must be an array of string-like expressions");
        if (isExport) exceptions = arr;
        else localExceptions = arr;
      }
    }
  }

  // pass 2: exports
  for (const st of sf.statements) {
    // export default …
    if (ts.isExportAssignment(st) && !st.isExportEquals) {
      const s = evalString(st.expression, ctx);
      if (s == null) throw new Error("default export must be a string-like expression");
      scope = s;
    }

    // export { exceptions }
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      if (st.exportClause.elements.some((e) => (e.propertyName ?? e.name).text === "exceptions")) {
        if (!localExceptions) throw new Error("`export { exceptions }` requires `const exceptions = […]`");
        exceptions = localExceptions;
      }
    }
  }

  return { scope: scope ?? ".", exceptions: exceptions ?? [] };
}

export function parseScopeFile(absPath: string): ScopeFile {
  const text = ts.sys.readFile(absPath);
  if (text == null) throw new Error(`Cannot read ${absPath}`);
  return parseScopeSource(text, absPath);
}
