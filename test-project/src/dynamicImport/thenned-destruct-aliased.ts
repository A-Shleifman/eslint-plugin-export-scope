import("./internal/privateModule").then(({ PUBLIC, PRIVATE: alias }) => alias);
import("./internal/privateModule").then(({ PUBLIC: alias, PRIVATE }) => alias);
