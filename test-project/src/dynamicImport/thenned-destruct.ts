import("./internal/privateModule").then(({ PUBLIC, PRIVATE }) => PUBLIC);
import("./internal/publicModule").then(({ PUBLIC, PRIVATE }) => PUBLIC);
