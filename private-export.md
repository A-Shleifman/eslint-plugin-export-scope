# Disallows importing private exports outside their export scope (private-export)

### Supported params

`@private default` has to be declared at the top of the file.

```ts
/** @private default */
/** @private default . */
/** @private default ../.. */
```

`@private` has to be declared direcly above an export.

```ts
/** @private */
/** @private . */
/** @private ../.. */
```

## Rule Details

Exported from `sub/sub/index.ts`

```ts
/** @private default .. */

/** @private ../.. */
export const banana = "";

export const apple = "";

/** @private */
export default "";
```

Examples of **incorrect** code for this rule:

```ts
// index.ts

// only accessible in sub/sub/**
import sub from "./sub/sub";

// only accessible in sub/** (inferred from `@private default`)
import { apple } from "./sub/sub";
```

Examples of **correct** code for this rule:

```ts
// index.ts

import { banana } from "./sub/sub";
```
