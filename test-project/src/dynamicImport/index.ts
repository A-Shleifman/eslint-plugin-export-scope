import "./internal/privateModule";
import("./internal/privateModule");

import "./internal/publicModule";
import("./internal/publicModule");
const res = import("./internal/privateModule");
import("./internal/privateModule").then((x) => x.PUBLIC);
import("./internal/privateModule").then((x) => x.PRIVATE);
