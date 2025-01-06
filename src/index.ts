import type { FlatConfig } from "@typescript-eslint/utils/ts-eslint";
import { rule, ruleName } from "./esLintPlugin/esLintRule";
import { tsLanguageServicePlugin } from "./tsPlugin";
import tseslint from "typescript-eslint";

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../package.json") as typeof import("../package.json");

const esLintPluginName = name.replace("eslint-plugin-", "");

const plugin: FlatConfig.Plugin = {
  meta: { name, version },
  rules: { [ruleName]: rule },
  configs: {
    get recommended() {
      return configs.recommended;
    },
    get flatConfigRecommended() {
      return configs.flatConfigRecommended;
    },
  },
};

const configs = {
  recommended: {
    plugins: [esLintPluginName] as unknown as FlatConfig.Plugins, // <-- legacy config
    rules: { [`${esLintPluginName}/${ruleName}`]: "error" },
  },
  flatConfigRecommended: {
    plugins: { [esLintPluginName]: plugin },
    rules: { [`${esLintPluginName}/${ruleName}`]: "error" },
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mts", "**/*.mjs", "**/*.cjs"],
    languageOptions: { parser: tseslint.parser, parserOptions: { projectService: true } },
  },
} satisfies FlatConfig.SharedConfigs;

const combinedEslintTsPlugin = Object.assign(tsLanguageServicePlugin, { plugin }, plugin);

export = combinedEslintTsPlugin as unknown as {
  configs: { flatConfigRecommended: FlatConfig.SharedConfigs };
};
