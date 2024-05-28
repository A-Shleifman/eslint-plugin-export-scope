import { test, describe, expect } from "vitest";
import { ESLint } from "eslint";

const eslint = new ESLint();

const MODULE_ERROR = "module";
const importError = (name: string) =>
  `Cannot import ${name === MODULE_ERROR ? MODULE_ERROR : `'${name}'`} outside its export scope`;

const lint = async (file: string) => {
  const result = await eslint.lintFiles(`src/${file}`);

  return result.flatMap((x) => x.messages.map((x) => x.message));
};

const expectLintErr = (path: string, errors: string[]) => expect(lint(path)).resolves.toEqual(errors.map(importError));

describe("folder scope default", () => {
  test("✔️", () => expectLintErr("internal/consumer.ts", []));
  test("🚫", () => expectLintErr("externalConsumer.ts", ["INTERNAL_VARIABLE"]));
});
