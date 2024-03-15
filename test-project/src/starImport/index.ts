import * as module from "./internal/module";

const pojo = { prop: "" };

void module.PRIVATE;
type IGNORE = module.PRIVATE_TYPE;
void pojo.prop;
void module.PUBLIC;
void module.PRIVATE;
