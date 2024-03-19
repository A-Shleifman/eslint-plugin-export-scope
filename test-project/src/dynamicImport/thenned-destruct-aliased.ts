import("./internal/privateModule").then(({ PUBLIC, PRIVATE: alias }) => alias);
import("./internal/publicModule").then(({ PUBLIC: alias1, PRIVATE }) => alias);
