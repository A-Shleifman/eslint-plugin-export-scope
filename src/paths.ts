import path from "path";

const isWin = process.platform === "win32";
const fold = (s: string) => (isWin ? s.toLowerCase() : s);

/** child is same as base or inside base (logical tree only). */
export const sameOrSubPath = (base: string, child: string) => {
  const a = fold(path.resolve(base));
  const b = fold(path.resolve(child));
  if (a === b) return true;
  const rel = path.relative(a, b);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

// Export only if you’re about to use it; otherwise remove.
export const toPosix = (p: string) => p.split(path.sep).join("/");
