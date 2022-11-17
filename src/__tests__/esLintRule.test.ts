import { ESLint } from "eslint";

const eslint = new ESLint({
  overrideConfigFile: "src/__tests__/project/.eslintrc.js",
  overrideConfig: {
    parserOptions: {
      project: "src/__tests__/project/tsconfig.json",
    },
  },
});

test("cannot import private exports outside their export scope", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toEqual([
    "Cannot import a private export 'context' outside its export scope",
    "Cannot import a private export 'helper2' outside its export scope",
    "Cannot import a private export 'ChildComponent' outside its export scope",
  ]);
});

test("cannot import exports outside their folder if `defaultProjectScope` option is specified", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/Component/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toEqual(["Cannot import a private export 'state' outside its export scope"]);
});

test("can import private exports within their export scope and can import node_modules", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/Component/ChildComponent/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toHaveLength(0);
});
