import { test, describe, expect } from "vitest";
import { withTempProject, inSrc } from "./tempProject";

test("scopes", async () => {
  await withTempProject(
    {
      "src/common/.scope.ts": `export default "*";`,
      "src/common/public.ts": `export const public = "";`,
      "src/common/sub/private.ts": `export const private = "";`,
      "src/outside/consumer.ts": `import { public } from "../common/public";`,
      "src/outside/control.ts": `import { private } from "../common/sub/private";`,
    },
    async ({ lint }) => {
      expect(await lint(inSrc("src/outside/consumer.ts"))).toEqual([]);
      expect(await lint(inSrc("src/outside/control.ts"))).toEqual(["Cannot import 'private' outside its export scope"]);
    },
  );
}, 30000);
