import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { testChannel } from "@/lib/channel-health";
import { requireAdmin } from "@/lib/auth";
import { usePostgres } from "@/lib/db/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 并发探测所有启用的渠道；平滑更新 p50/errRate/status。
 * POST /api/channels/test-all
 */
export async function POST() {
  const actor = await requireAdmin();
  const channels = usePostgres()
    ? await (async () => {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      return pgDb.select().from(pgSchema.channels).where(eq(pgSchema.channels.enabled, true));
    })()
    : db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.enabled, true))
    .all();

  if (channels.length === 0) {
    return NextResponse.json({ ok: true, tested: 0, results: [], summary: { reached: 0, failed: 0, avgLatencyMs: 0 } });
  }

  const results = await Promise.all(
    channels.map(async c => {
      const r = await testChannel(c as typeof schema.channels.$inferSelect);
      return { c, ...r };
    })
  );

  const reached = results.filter(r => r.ping.ok).length;
  const failed = results.length - reached;
  const avg = Math.round(
    results.reduce((s, r) => s + r.ping.latencyMs, 0) / Math.max(1, results.length)
  );

  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    await pgDb.insert(pgSchema.activities).values({ ts: Date.now(), event: `批量测试 ${reached}/${results.length} 个渠道可达`, actor: actor.username });
  } else {
    db.insert(schema.activities).values({ ts: Date.now(), event: `批量测试 ${reached}/${results.length} 个渠道可达`, actor: actor.username }).run();
  }

  return NextResponse.json({
    ok: true,
    tested: results.length,
    summary: { reached, failed, avgLatencyMs: avg },
    results: results.map(r => ({
      id: r.c.id, name: r.c.name, baseUrl: r.c.baseUrl,
      reachable: r.ping.ok, latencyMs: r.ping.latencyMs, error: r.ping.error,
      p50Ms: r.p50, errRate: r.err, status: r.status,
    })),
  });
}
