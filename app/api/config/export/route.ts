import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { usePostgres } from "@/lib/db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    const keys = (await pgDb.select().from(pgSchema.keys)).map(k => ({ ...k, fullKey: "" }));
    const channels = (await pgDb.select().from(pgSchema.channels)).map(c => ({ ...c, apiKey: "" }));
    const modelMappings = await pgDb.select().from(pgSchema.modelMappings);
    const modelCatalog = await pgDb.select().from(pgSchema.modelCatalog);
    const modelPrices = await pgDb.select().from(pgSchema.modelPrices);
    const settings = await pgDb.select().from(pgSchema.settings);
    return NextResponse.json({ version: 1, exportedAt: Date.now(), keys, channels, modelMappings, modelCatalog, modelPrices, settings });
  }
  const keys = db.select().from(schema.keys).all().map(k => ({ ...k, fullKey: "" }));
  const channels = db.select().from(schema.channels).all().map(c => ({ ...c, apiKey: "" }));
  const modelMappings = db.select().from(schema.modelMappings).all();
  const modelCatalog = db.select().from(schema.modelCatalog).all();
  const modelPrices = db.select().from(schema.modelPrices).all();
  const settings = db.select().from(schema.settings).all();
  return NextResponse.json({ version: 1, exportedAt: Date.now(), keys, channels, modelMappings, modelCatalog, modelPrices, settings });
}
