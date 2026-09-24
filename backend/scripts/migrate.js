import { openDatabase, migrate } from "../src/infrastructure/database.js";
const db = openDatabase();
migrate(db);
db.close();
console.log("Migrations aplicadas.");
