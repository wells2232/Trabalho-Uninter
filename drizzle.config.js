import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "sqlite",
  schema: "./backend/src/infrastructure/schema.js",
  out: "./backend/migrations",
  dbCredentials: { url: process.env.DATABASE_PATH || "./data/raizes.sqlite" },
});
