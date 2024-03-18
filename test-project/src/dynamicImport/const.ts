// @ts-nocheck
const res = import("./internal/privateModule");
(await res).PRIVATE;
const { PRIVATE: alias1 } = await res;

const awaitedModule = await import("./internal/privateModule");
void awaitedModule.PRIVATE;
