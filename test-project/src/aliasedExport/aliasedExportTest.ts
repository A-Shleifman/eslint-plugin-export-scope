import { privateSecret, publicSecret } from "./internal/module";
import aliasedDefaultExport from "./internal/module"; // should read the scope of the default export, not the aliased export

void privateSecret, publicSecret, aliasedDefaultExport;
