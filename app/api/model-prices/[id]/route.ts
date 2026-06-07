import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { usePostgres } from "@/lib/db/runtime";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await ctx.params;
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    const row = (await pgDb.select().from(pgSchema.modelPrices).where(eq(pgSchema.modelPrices.id, id)).limit(1))[0];
    if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
    await pgDb.delete(pgSchema.modelPrices).where(eq(pgSchema.modelPrices.id, id));
    await pgDb.insert(pgSchema.activities).values({ ts: Date.now(), event: `删除模型定价 ${row.provider}:${row.model}`, actor: actor.username });
    return NextResponse.json({ ok: true });
  }
  const row = db.select().from(schema.modelPrices).where(eq(schema.modelPrices.id, id)).get();
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  db.delete(schema.modelPrices).where(eq(schema.modelPrices.id, id)).run();
  db.insert(schema.activities).values({ ts: Date.now(), event: `删除模型定价 ${row.provider}:${row.model}`, actor: actor.username }).run();
  return NextResponse.json({ ok: true });
}
