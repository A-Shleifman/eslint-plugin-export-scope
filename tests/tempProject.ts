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

// branded, type-safe project-relative paths restricted to src/
export type InSrc<T extends string = string> = T & { readonly __inSrc: unique symbol };
export function inSrc<T extends `src/${string}`>(p: T): InSrc<T> {
  if (path.isAbsolute(p) || p.startsWith("../") || p.includes(".." + path.sep)) {
    throw new Error(`Path must be within src/: ${p}`);
  }
  if (!p.startsWith("src/")) throw new Error(`Path must start with "src/": ${p}`);
  return p as InSrc<T>;
}
export const joinSrc = (...segs: [string, ...string[]]) => inSrc(`src/${segs.join("/")}` as `src/${string}`);

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
export async function withTempProject(
  tree: Tree,
  fn: (ctx: {
    major: 8 | 9;
    root: string;
    add: (files: Tree) => Promise<void>;
    lint: (globs: InSrc<string> | InSrc<string>[]) => Promise<string[]>;
  }) => Promise<void>,
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

      const add = async (files: Tree) => writeTree(root, files);
      const lint = async (globs: InSrc<string> | InSrc<string>[]) => {
        const arr = Array.isArray(globs) ? globs : [globs];
        const absGlobs = arr.map((g) => path.join(root, g));
        const results = await eslint.lintFiles(absGlobs);
        return results.flatMap((r) => r.messages.map((m) => m.message));
      };

      try {
        await fn({ major, root, add, lint });
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

    const add = async (files: Tree) => writeTree(root, files);
    const lint = async (globs: InSrc<string> | InSrc<string>[]) => {
      const arr = Array.isArray(globs) ? globs : [globs];
      const absGlobs = arr.map((g) => path.join(root, g));
      const results = await eslint.lintFiles(absGlobs);
      return results.flatMap((r) => r.messages.map((m) => m.message));
    };

    try {
      await fn({ major, root, add, lint });
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
