import * as module from "./internal/module";

const pojo = { prop: "" };

void module.PRIVATE;
// type IGNORE = module.PRIVATE_TYPE; // QualifiedName
void pojo.prop;
void module.PUBLIC;
void module.PRIVATE;
