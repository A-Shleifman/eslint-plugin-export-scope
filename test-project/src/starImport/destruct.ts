import * as module from "./internal/module";

const alias1 = module;
const alias2 = alias1;

const { PRIVATE } = module;
const { PRIVATE: PRIVATE_ALIAS } = alias2;
