import { ESLint } from "eslint";

const eslint = new ESLint({
  overrideConfigFile: "src/__tests__/project/.eslintrc.js",
  overrideConfig: {
    parserOptions: {
      project: "src/__tests__/project/tsconfig.json",
    },
  },
});

test("cannot import outside export scope", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toEqual([
    "Cannot import 'default' outside its export scope",
    "Cannot import 'helper2' outside its export scope",
    "Cannot import 'default' outside its export scope",
    "Cannot import module outside its export scope",
    "Cannot import module outside its export scope",
  ]);
});

test("cannot import exports outside their folder if `defaultProjectScope` option is specified", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/Component/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toEqual(["Cannot import 'default' outside its export scope"]);
});

test("can import within export scope and can import node_modules", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/Component/ChildComponent/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toHaveLength(0);
});
