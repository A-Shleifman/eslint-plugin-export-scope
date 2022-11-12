# Disallows importing private exports outside their package (no-imports-outside-package)

### Supported params

`@package default` has to be declared at the top of the file.

```ts
/** @package default */
/** @package default . */
/** @package default ../.. */
```

`@package` has to be declared direcly above an export.

```ts
/** @package */
/** @package . */
/** @package ../.. */
```

## Rule Details

Exported from `sub/sub/index.ts`

```ts
/** @package default .. */

/** @package ../.. */
export const banana = "";

export const apple = "";

/** @package */
export default "";
```

Examples of **incorrect** code for this rule:

```ts
// index.ts

// only accessible in sub/sub/**
import sub from "./sub/sub";

// only accessible in sub/** (inferred from `@package default`)
import { apple } from "./sub/sub";
```

Examples of **correct** code for this rule:

```ts
// index.ts

import { banana } from "./sub/sub";
```
