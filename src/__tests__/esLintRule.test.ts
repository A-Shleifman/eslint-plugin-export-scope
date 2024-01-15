import { ESLint } from "eslint";

const importError = (name: string) => `Cannot import '${name}' outside its export scope`;
const NAMED_ERROR = importError("namedExport");
const DEFAULT_ERROR = importError("default");

const eslint = new ESLint({ overrideConfigFile: "src/__tests__/project/.eslintrc.js" });

const lint = async (file: string) => {
  const result = await eslint.lintFiles(`src/__tests__/project/src/${file}`);

  return result.flatMap((x) => x.messages.map((x) => x.message));
};

const expectLintErr = (path: string) => expect(lint(path)).resolves;

test("can import from node_modules", () => {
  return expectLintErr("nodeModulesTest.ts").toHaveLength(0);
});

test("schemaParser", () => {
  return expectLintErr("common/schemaParser.ts").toEqual([importError("subSchema")]);
});
