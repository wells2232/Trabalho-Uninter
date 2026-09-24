import { Repository } from "./infrastructure/repository.js";
import {
  hashPassword,
  verifyPassword,
  tokenService,
} from "./infrastructure/security.js";
import { Accounts } from "./application/accounts.js";
import { Orders } from "./application/orders.js";
import { Payments } from "./application/payments.js";
import { Catalog } from "./application/catalog.js";
import { createApp } from "./api/app.js";

export function bootstrap(db, gateway, secret) {
  const repo = new Repository(db);
  const tokens = tokenService(secret);
  const orders = new Orders(repo);
  const accounts = new Accounts(
    repo,
    { hash: hashPassword, verify: verifyPassword },
    tokens,
  );
  const payments = new Payments(repo, orders, gateway);
  const catalog = new Catalog(repo, orders);
  return createApp({ repo, accounts, orders, payments, catalog, tokens });
}
