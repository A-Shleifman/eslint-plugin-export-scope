import * as module from "./internal/module";

const pojo = { prop: "" };

void module.PRIVATE;
void pojo.prop;
void module.PUBLIC;
void module.PRIVATE;
