import { ESLint } from "eslint";

const eslint = new ESLint({
  overrideConfigFile: "src/__tests__/project/.eslintrc.js",
  overrideConfig: {
    parserOptions: {
      project: "src/__tests__/project/tsconfig.json",
    },
  },
});

test("cannot import private exports outside their package", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toEqual([
    "Cannot import a private export 'fruits' outside its package",
    "Cannot import a private export 'apple' outside its package",
    "Cannot import a private export 'vegetables' outside its package",
  ]);
});

test("can import private exports within their package", async () => {
  const result = await eslint.lintFiles("src/__tests__/project/src/sub/index.ts");

  const errors = result.flatMap((x) => x.messages.map((x) => x.message));

  expect(errors).toHaveLength(0);
});
