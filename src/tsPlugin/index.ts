import type * as ts from "typescript/lib/tsserverlibrary";
import { getCodeFixesAtPosition } from "./getCodeFixesAtPosition";
import { getCompletionsAtPosition } from "./getCompletionsAtPosition";

const exts = [".ts", ".tsx", ".js", ".jsx"];
const excludes = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"];
const includes = ["**/.scope.*", "**/.scope.default.*"];

export function tsLanguageServicePlugin(module: { typescript: typeof ts }): ts.server.PluginModule {
  let root = "";
  let files: string[] = [];

  const scan = (sys: ts.System) => {
    files = sys.readDirectory(root, exts, excludes, includes);
  };

  const getExternalFiles = () => files;

  function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    // ------ track and register .scope files ------
    root = info.project.getCurrentDirectory();
    scan(info.serverHost);
    info.serverHost.watchDirectory(root, () => scan(info.serverHost), true);

    const ls = info.languageService;
    const proxy = { ...ls };

    proxy.getCompletionsAtPosition = getCompletionsAtPosition(module.typescript, info);
    proxy.getCodeFixesAtPosition = getCodeFixesAtPosition(module.typescript, info);

    return proxy;
  }

  return { create, getExternalFiles };
}
