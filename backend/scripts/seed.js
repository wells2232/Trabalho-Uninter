import { openDatabase, migrate } from "../src/infrastructure/database.js";
import { seed } from "../src/infrastructure/seed.js";
const db = openDatabase();
migrate(db);
seed(db, process.env.SEED_PASSWORD);
db.close();
console.log("Seed aplicado; contas de demonstração disponíveis no README.");
