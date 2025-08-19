import { promises as fsp } from "node:fs";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// Helper to robustly pick the ESLint plugin object from whatever the dist exports.
function resolvePluginObject(mod: any) {
  if (mod?.rules) return mod; // direct plugin export
  if (mod?.plugin?.rules) return mod.plugin; // { plugin } wrapper
  if (mod?.default?.rules) return mod.default; // CJS default
  if (mod?.default?.plugin?.rules) return mod.default.plugin; // CJS default with wrapper
  throw new Error("export-scope plugin object with 'rules' not found in dist export");
}

// Hard-fail if aliases are missing, per request.
import { ESLint as ESLint8 } from "eslint8";
import { ESLint as ESLint9 } from "eslint";

// Use require instead of import since the built file is CommonJS
const require = createRequire(import.meta.url);
const pluginModule = require("../dist/index.js");
const pluginObj = resolvePluginObject(pluginModule);
const tsParserPath = require.resolve("@typescript-eslint/parser");

type Tree = Record<string, string>;

// Extract file paths from the tree type for type safety
export type FileInTree<T extends Tree> = keyof T & string;

// Helper type for the context passed to test functions
export type TempProjectContext<T extends Tree> = {
  major: 8 | 9;
  root: string;
  add: (files: Tree) => Promise<void>;
  lint: (file: FileInTree<T>) => Promise<string[]>;
  expectLintErr: (file: FileInTree<T>, errors: string[]) => Promise<void>;
  expectLintFullErr: (file: FileInTree<T>, errors: string[]) => Promise<void>;
};

// Helper function to create the importError message like in test-project
const importError = (name: string) => {
  const MODULE_ERROR = "module";
  return `Cannot import ${name === MODULE_ERROR ? MODULE_ERROR : `'${name}'`} outside its export scope`;
};

// Factory function to create shared helper functions
function createHelpers<T extends Tree>(eslint: ESLint8 | ESLint9, root: string, major: 8 | 9) {
  const add = async (files: Tree) => writeTree(root, files);
  
  const lint = async (file: FileInTree<T>) => {
    const absPath = path.join(root, file);
    const results = await eslint.lintFiles([absPath]);
    return results.flatMap((r) => r.messages.map((m) => m.message));
  };
  
  const expectLintErr = async (file: FileInTree<T>, errors: string[]) => {
    const messages = await lint(file);
    const expectedMessages = errors.map(importError);
    if (JSON.stringify(messages) !== JSON.stringify(expectedMessages)) {
      const versionIndicator = `\n╔═══════════════════════════════════╗\n║  🚨 ESLint ${major} FAILURE 🚨           ║\n╚═══════════════════════════════════╝`;
      throw new Error(`${versionIndicator}\nExpected ${JSON.stringify(expectedMessages)} but got ${JSON.stringify(messages)} for file ${file}`);
    }
  };
  
  const expectLintFullErr = async (file: FileInTree<T>, errors: string[]) => {
    const messages = await lint(file);
    if (JSON.stringify(messages) !== JSON.stringify(errors)) {
      const versionIndicator = `\n╔═══════════════════════════════════╗\n║  🚨 ESLint ${major} FAILURE 🚨           ║\n╚═══════════════════════════════════╝`;
      throw new Error(`${versionIndicator}\nExpected ${JSON.stringify(errors)} but got ${JSON.stringify(messages)} for file ${file}`);
    }
  };

  return { add, lint, expectLintErr, expectLintFullErr };
}

async function writeTree(root: string, tree: Tree) {
  await Promise.all(
    Object.keys(tree).map(async (p) => {
      const abs = path.join(root, p);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, tree[p]);
    }),
  );
}

/**
 * Run the supplied test body once with ESLint 8 and once with ESLint 9.
 * Crashes if either alias (eslint8 or eslint9) is missing.
 */
export async function withTempProject<T extends Tree>(
  tree: T,
  fn: (ctx: TempProjectContext<T>) => Promise<void>,
  { keep = false }: { keep?: boolean } = {},
) {
  // helper to run once per ESLint ctor
  async function runFor(ESLintCtor: typeof ESLint8 | typeof ESLint9, major: 8 | 9) {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), `export-scope-e${major}-`));

    // Ensure cleanup happens even if an exception occurs before try block
    const cleanup = () => {
      if (!keep) {
        try {
          fs.rmSync(root, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors (directory might already be deleted)
        }
      }
    };

    // Register cleanup for process termination (best effort)
    const cleanupOnExit = () => cleanup();
    process.once("exit", cleanupOnExit);
    process.once("SIGINT", cleanupOnExit);
    process.once("SIGTERM", cleanupOnExit);

    const tsconfig = `{
      "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "baseUrl": "./src",
        "allowJs": true,
        "strict": false
      },
      "include": ["src/**/*"]
    }`;

    await writeTree(root, { "package.json": `{"type":"module"}`, "tsconfig.json": tsconfig, ...tree });

    // ESLint 9: use flat config recommended from plugin + additional config layer
    if (major === 9) {
      // Use recommended config as base, add additional layer for tsconfigRootDir
      const flat = [
        ...pluginObj.configs.flatConfigRecommended,
        {
          languageOptions: {
            parserOptions: {
              tsconfigRootDir: root,
            },
          },
        },
      ];

      const eslint = new ESLintCtor({
        cwd: root,
        overrideConfigFile: true, // This tells ESLint 9 to not look for config files
        overrideConfig: flat as any,
      } as any);

      const helpers = createHelpers<T>(eslint, root, major);

      try {
        await fn({ major, root, ...helpers });
      } finally {
        if (!keep) fs.rmSync(root, { recursive: true, force: true });
      }
      return;
    }

    // ESLint 8: use recommended legacy config with additional layer
    const eslint = new ESLintCtor({
      cwd: root,
      overrideConfigFile: null,
      plugins: { "export-scope": pluginObj },
      overrideConfig: {
        ...pluginObj.configs.recommended,
        parser: tsParserPath, // Resolve parser for temp directory
        parserOptions: {
          project: true, // Add type-aware linting
          tsconfigRootDir: root,
        },
      },
    });

    const helpers = createHelpers<T>(eslint, root, major);

    try {
      await fn({ major, root, ...helpers });
    } finally {
      // Remove process listeners and cleanup
      process.removeListener("exit", cleanupOnExit);
      process.removeListener("SIGINT", cleanupOnExit);
      process.removeListener("SIGTERM", cleanupOnExit);
      cleanup();
    }
  }

  // Run both ESLint versions using their recommended configs
  await runFor(ESLint8, 8);
  await runFor(ESLint9, 9);
}
