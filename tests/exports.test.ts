import { expect, test } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("CommonJS export is the plugin itself, with a `default` self-reference", async () => {
  const plugin = require("../dist/index.js");
  const esm = await import("../dist/index.js");

  expect(typeof plugin).toBe("function"); // TS Language Service plugin factory
  expect(plugin.default).toBe(plugin);
  expect(esm.default).toBe(plugin);
  expect(Object.keys(plugin.rules)).toEqual(["no-imports-outside-export-scope"]);
  expect(plugin.configs.flatConfigRecommended).toHaveLength(3);
  expect(plugin.configs.recommended.plugins).toEqual(["export-scope"]);
  expect(plugin.plugin.rules).toBe(plugin.rules);
});
