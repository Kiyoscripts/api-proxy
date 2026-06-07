import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { usePostgres } from "@/lib/db/runtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50));
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    const rows = await pgDb.select().from(pgSchema.channelTestLogs).where(eq(pgSchema.channelTestLogs.channelId, id)).orderBy(desc(pgSchema.channelTestLogs.ts)).limit(limit);
    return NextResponse.json(rows);
  }
  const rows = db
    .select()
    .from(schema.channelTestLogs)
    .where(eq(schema.channelTestLogs.channelId, id))
    .orderBy(desc(schema.channelTestLogs.ts))
    .limit(limit)
    .all();
  return NextResponse.json(rows);
}
