import { type server } from "typescript";
import { getCodeFixesAtPosition } from "./getCodeFixesAtPosition";
import { getCompletionsAtPosition } from "./getCompletionsAtPosition";

export function tsLanguageServicePlugin(modules: { typescript: typeof import("typescript") }) {
  const ts = modules.typescript;

  function create(info: server.PluginCreateInfo) {
    const ls = info.languageService;
    const proxy = { ...ls };

    proxy.getCompletionsAtPosition = getCompletionsAtPosition(ts, info);

    proxy.getCodeFixesAtPosition = getCodeFixesAtPosition(ts, info);

    return proxy;
  }

  return { create };
}
