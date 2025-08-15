import { test } from "vitest";
import { withTempProject } from "./tempProject";

test("folder scope default", async () => {
  await withTempProject(
    {
      "src/common/.scope.ts": `export default "*";`,
      "src/common/public.ts": `export const public = "";`,
      "src/common/sub/private.ts": `export const private = "";`,
      "src/outside/consumer.ts": `import { public } from "../common/public";`,
      "src/outside/control.ts": `import { private } from "../common/sub/private";`,
    },
    async ({ expectLintErr }) => {
      await expectLintErr("src/outside/consumer.ts", []);
      await expectLintErr("src/outside/control.ts", ["private"]);
    },
  );
});

test("folder scope exceptions", async () => {
  await withTempProject(
    {
      "src/common/.scope.ts": `export default "."; export const exceptions = ["src/exception"];`,
      "src/common/private.ts": `export const private = "";`,
      "src/exception/index.ts": `import { private } from "../common/private";`,
      "src/outside/index.ts": `import { private } from "../common/private";`,
    },
    async ({ expectLintErr }) => {
      await expectLintErr("src/exception/index.ts", []);
      await expectLintErr("src/outside/index.ts", ["private"]);
    },
  );
});

test("parent .scope.default.ts", async () => {
  await withTempProject(
    {
      "src/common/.scope.default.ts": `export default "*";`,
      "src/common/public.ts": `export const public = "";`,
      "src/common/sub/inheritedPublic.ts": `export const inheritedPublic = "";`,
      "src/outside/consumer.ts": `
      import { public } from "../common/public";
      import { inheritedPublic } from "../common/sub/inheritedPublic";
      `,

      "src/common/overriden/.scope.ts": `export default ".";`,
      "src/common/overriden/private.ts": `export const private = "";`,
      "src/outside/control.ts": `import { private } from "../common/overriden/private";`,
    },
    async ({ expectLintErr }) => {
      await expectLintErr("src/outside/consumer.ts", []);
      await expectLintErr("src/outside/control.ts", ["private"]);
    },
  );
});

test("ancestor .scope.default.ts", async () => {
  await withTempProject(
    {
      ".scope.default.ts": `export default "*";`,
      "src/common/public.ts": `export const public = "";`,
      "src/common/sub/inheritedPublic.ts": `export const inheritedPublic = "";`,
      "src/outside/consumer.ts": `
      import { public } from "../common/public";
      import { inheritedPublic } from "../common/sub/inheritedPublic";
      `,

      "src/common/overriden/private.ts": `
        /** @scope . */
        export const private = "";
      `,
      "src/outside/control.ts": `import { private } from "../common/overriden/private";`,
    },
    async ({ expectLintErr }) => {
      await expectLintErr("src/outside/consumer.ts", []);
      await expectLintErr("src/outside/control.ts", ["private"]);
    },
  );
});

test("abstract class with direct export should respect @scope annotation", async () => {
  await withTempProject(
    {
      "src/private/module.ts": `
        /** @scope . */
        export abstract class AbstractClass {
          public abstract foobar: string;
        }

        /** @scope . */
        export class PrivateClass {
          public foobar = "foobar";
        }

        /** @scope * */
        export class PublicClass {
          public foobar = "foobar";
        }
      `,

      "src/outside/consumer.ts": `
        import { AbstractClass, PrivateClass, PublicClass } from "../private/module";
      `,
    },
    async ({ expectLintErr }) => {
      await expectLintErr("src/outside/consumer.ts", ["AbstractClass", "PrivateClass"]);
    },
  );
});
