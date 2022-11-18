# Disallows importing scoped exports outside their scope (no-imports-outside-export-scope)

### Supported params

`@scope default .` has to be declared at the top of the file.

```ts
/** @scope default . */
/** @scope default ../.. */
```

`@scope` has to be declared direcly above an export.

```ts
/** @scope . */
/** @scope ../.. */
```

## Rule Details

Exported from `sub/sub/index.ts`

```ts
/** @scope default .. */

/** @scope ../.. */
export const banana = "";

export const apple = "";

/** @scope . */
export default "";
```

Examples of **incorrect** code for this rule:

```ts
// index.ts

// only accessible in sub/sub/**
import sub from "./sub/sub";

// only accessible in sub/** (inferred from `@scope default`)
import { apple } from "./sub/sub";
```

Examples of **correct** code for this rule:

```ts
// index.ts

import { banana } from "./sub/sub";
```
