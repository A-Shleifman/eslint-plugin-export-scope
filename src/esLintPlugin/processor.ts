import type { Linter } from "eslint";

const HEADER = "/* eslint-disable */ /* eslint-enable export-scope/no-imports-outside-export-scope */\n";
const HEADER_LINES = 1;
const HEADER_CHARS = HEADER.length;
const UNUSED_RULE_ID = "report-unused-disable-directive";

// Back-compat processor: works in ESLint 8 and 9
export const exportScopeProcessor: Linter.Processor = {
  meta: { name: "export-scope/processor", version: "1" },

  // Return string[] for both ESLint 8 and 9
  preprocess(text: string /*, filename: string */) {
    return [HEADER + text];
  },

  postprocess(blockMessageLists) {
    let msgs = (blockMessageLists[0] ?? []) as Linter.LintMessage[];

    // Drop “unused eslint-disable” noise for scope files
    msgs = msgs.filter((m) => m.ruleId !== UNUSED_RULE_ID);

    // Map offsets caused by the injected header
    for (const m of msgs) {
      if (typeof m.line === "number") m.line = Math.max(1, m.line - HEADER_LINES);
      if (typeof m.endLine === "number") m.endLine = Math.max(1, m.endLine - HEADER_LINES);

      if (m.fix?.range) {
        m.fix.range = [Math.max(0, m.fix.range[0] - HEADER_CHARS), Math.max(0, m.fix.range[1] - HEADER_CHARS)];
      }

      if (Array.isArray(m.suggestions)) {
        for (const s of m.suggestions) {
          const anyS = s as any;

          if (anyS.fix?.range) {
            const [a, b] = anyS.fix.range as [number, number];
            anyS.fix.range = [Math.max(0, a - HEADER_CHARS), Math.max(0, b - HEADER_CHARS)];
          }

          if (Array.isArray(anyS.fixes)) {
            for (const f of anyS.fixes) {
              if (Array.isArray(f.range)) {
                f.range = [Math.max(0, f.range[0] - HEADER_CHARS), Math.max(0, f.range[1] - HEADER_CHARS)];
              }
            }
          }
        }
      }
    }
    return msgs;
  },

  supportsAutofix: true,
};
