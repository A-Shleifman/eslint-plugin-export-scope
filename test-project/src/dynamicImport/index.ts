import "./internal/privateModule";
import("./internal/privateModule");

import "./internal/publicModule";
import("./internal/publicModule");
const res = import("./internal/privateModule");
// @ts-expect-error: top-level await
(await res).PRIVATE;
import("./internal/privateModule").then((x) => x.PUBLIC);
import("./internal/privateModule").then((x) => x.PRIVATE);
