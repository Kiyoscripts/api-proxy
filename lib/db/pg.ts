import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as pgSchema from "./pg-schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for PostgreSQL mode");
}

export const pgClient = postgres(process.env.DATABASE_URL, {
  max: Number(process.env.DATABASE_POOL_SIZE) || 10,
});

export const pgDb = drizzle(pgClient, { schema: pgSchema });
export { pgSchema };
