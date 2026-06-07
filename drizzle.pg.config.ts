import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/pg-schema.ts",
  out: "./lib/db/pg-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://api_proxy:api_proxy@localhost:5432/api_proxy",
  },
});
