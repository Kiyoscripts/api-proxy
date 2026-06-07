import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { testChannel } from "@/lib/channel-health";
import { requireAdmin } from "@/lib/auth";
import { usePostgres } from "@/lib/db/runtime";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await ctx.params;
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    const row = (await pgDb.select().from(pgSchema.channels).where(eq(pgSchema.channels.id, id)).limit(1))[0];
    if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
    const r = await testChannel(row as typeof schema.channels.$inferSelect);
    await pgDb.insert(pgSchema.activities).values({ ts: Date.now(), event: `测试渠道 ${row.name}：${r.ping.ok ? "成功" : "失败"}`, actor: actor.username });
    return NextResponse.json({ channel: row.name, reachable: r.ping.ok, latencyMs: r.ping.latencyMs, error: r.ping.error ?? null });
  }
  const row = db.select().from(schema.channels).where(eq(schema.channels.id, id)).get();
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  const r = await testChannel(row);
  db.insert(schema.activities).values({
    ts: Date.now(),
    event: `测试渠道 ${row.name}：${r.ping.ok ? "成功" : "失败"}`,
    actor: actor.username,
  }).run();

  return NextResponse.json({
    channel: row.name,
    reachable: r.ping.ok,
    latencyMs: r.ping.latencyMs,
    error: r.ping.error ?? null,
  });
}
