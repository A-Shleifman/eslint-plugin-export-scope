import type { FlatConfig, Processor } from "@typescript-eslint/utils/ts-eslint";
import { rule, ruleName } from "./esLintPlugin/esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";
import recommendedLegacy from "./configs/recommended-legacy";

import * as parserBase from "@typescript-eslint/parser";
import { exportScopeProcessor } from "./esLintPlugin/processor";

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../package.json") as typeof import("../package.json");

const parser = {
  meta: parserBase.meta,
  parseForESLint: parserBase.parseForESLint,
} satisfies FlatConfig.Parser;

const plugin = {
  meta: { name, version },
  rules: { [ruleName]: rule },
  processors: { "export-scope": exportScopeProcessor },
  configs: {
    flatConfigRecommended: [] as CompatibleConfig[],
  },
} satisfies FlatConfig.Plugin;

Object.assign(plugin.configs, { recommended: recommendedLegacy });

plugin.configs.flatConfigRecommended = [
  {
    files: ["**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}"],
    languageOptions: {
      parser,
      parserOptions: { projectService: true },
      sourceType: "module",
    },
    plugins: { "export-scope": plugin },
    rules: {
      [`export-scope/${ruleName}`]: "error",
    },
  },
  { files: ["**/*.{cjs,cts}"], languageOptions: { sourceType: "commonjs" } },

  {
    files: ["**/.scope.{ts,js}", "**/.scope.default.{ts,js}"],
    processor: "export-scope/export-scope",
  },
];

const pluginForManualConfigs = { plugin };
const combinedEslintTsPlugin = Object.assign(tsLanguageServicePlugin, plugin, pluginForManualConfigs);

// Public types keep every field of the configs and the plugin, but are written structurally
// (like typescript-eslint's own), so both ESLint's `defineConfig()` and `tseslint.config()` accept them
interface CompatibleRule extends Omit<typeof rule, "create"> {
  // `any` (as in typescript-eslint's loose rule type): its rule context and listener types don't fit ESLint's
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(context: any): any;
}

interface CompatiblePlugin {
  meta: { name: string; version: string };
  rules: { [ruleName]: CompatibleRule };
  processors: { "export-scope": Processor.LooseProcessorModule };
  configs: { flatConfigRecommended: CompatibleConfig[] };
}

interface CompatibleConfig {
  name?: string;
  files?: string[];
  languageOptions?: {
    parser?: { meta: { name: string; version?: string }; parseForESLint(text: string): { ast: unknown } };
    parserOptions?: { projectService?: boolean };
    sourceType?: "module" | "commonjs";
  };
  plugins?: Record<string, CompatiblePlugin>;
  processor?: string;
  rules?: Record<string, "error">;
}

interface ExportScopePlugin extends Omit<typeof plugin, "configs"> {
  configs: { flatConfigRecommended: CompatibleConfig[] };
  plugin: CompatiblePlugin;
  // self-reference, so `import exportScope from` also resolves without `esModuleInterop`
  default: ExportScopePlugin;
}

const exportScopePlugin = combinedEslintTsPlugin as typeof combinedEslintTsPlugin & Pick<ExportScopePlugin, "default">;
exportScopePlugin.default = exportScopePlugin;

// `export =` (not `export default`) so the typings match the CommonJS `module.exports` under NodeNext
export = exportScopePlugin as ExportScopePlugin;
