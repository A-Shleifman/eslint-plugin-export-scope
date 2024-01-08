import { ESLint } from "eslint";

const DEFAULT_EXPORT_OUTSIDE_SCOPE = "Cannot import 'default' outside its export scope";
const NAMED_EXPORT_OUTSIDE_SCOPE = "Cannot import 'namedExport' outside its export scope";

const eslint = new ESLint({
  overrideConfigFile: "src/__tests__/project/.eslintrc.js",
  overrideConfig: {
    parserOptions: {
      project: true,
      tsconfigRootDir: __dirname,
    },
  },
});

const lint = async (file: string) => {
  const result = await eslint.lintFiles(`src/__tests__/project/src/${file}`);

  return result.flatMap((x) => x.messages.map((x) => x.message));
};

test("cannot import outside export scope", async () => {
  expect(await lint("index.ts")).toEqual([
    DEFAULT_EXPORT_OUTSIDE_SCOPE,
    "Cannot import 'helper2' outside its export scope",
    DEFAULT_EXPORT_OUTSIDE_SCOPE,
    "Cannot import module outside its export scope",
    "Cannot import module outside its export scope",
  ]);
});

test("cannot import exports outside their folder if `defaultProjectScope` option is specified", async () => {
  const errors = await lint("Component/index.ts");

  expect(errors).toEqual([DEFAULT_EXPORT_OUTSIDE_SCOPE]);
});

test("can import within export scope and can import node_modules", async () => {
  const errors = await lint("Component/ChildComponent/index.ts");

  expect(errors).toHaveLength(0);
});

test("[^0] and [^1] scope configs", async () => {
  const errors = await lint("Component/ChildComponent/generatedIndex.ts");

  expect(errors).toEqual([DEFAULT_EXPORT_OUTSIDE_SCOPE]);
});

test("whitelisted file in scope configs", async () => {
  expect(await lint("whitelistedFileTest.ts")).toHaveLength(0);
  expect(await lint("whitelistedFileNegativeTest.ts")).toEqual([DEFAULT_EXPORT_OUTSIDE_SCOPE]);
});

test("whitelisted folder in scope configs", async () => {
  expect(await lint("Component/utils/whitelistedFolderTest.ts")).toHaveLength(0);
  expect(await lint("Component/utils2/whitelistedFolderNegativeTest.ts")).toEqual([
    DEFAULT_EXPORT_OUTSIDE_SCOPE,
    NAMED_EXPORT_OUTSIDE_SCOPE,
  ]);
});
