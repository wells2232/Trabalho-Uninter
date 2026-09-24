import { openDatabase, migrate } from "./infrastructure/database.js";
import { PaymentGateway } from "./infrastructure/payment-gateway.js";
import { bootstrap } from "./bootstrap.js";
const db = openDatabase();
migrate(db);
const app = bootstrap(
  db,
  new PaymentGateway(
    process.env.PAYMENT_URL || "http://127.0.0.1:4001",
    Number(process.env.PAYMENT_TIMEOUT_MS || 1500),
  ),
  process.env.JWT_SECRET,
);
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`API disponível em http://localhost:${port}/docs`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
