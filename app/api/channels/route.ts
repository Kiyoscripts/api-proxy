import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureChannelMonitor } from "@/lib/channel-monitor";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { AuthError, requireAdmin } from "@/lib/auth";
import { usePostgres } from "@/lib/db/runtime";

export async function GET() {
  try {
    await requireAdmin();
    ensureChannelMonitor();
    if (usePostgres()) {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      const rows = await pgDb.select().from(pgSchema.channels);
      return NextResponse.json(rows.map(({ apiKey, ...rest }) => rest));
    }
    const rows = db.select().from(schema.channels).all();
    return NextResponse.json(rows.map(({ apiKey, ...rest }) => rest));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "请输入名称" }, { status: 400 });
  }
  if (!["claude", "openai"].includes(body.type)) {
    return NextResponse.json({ error: "无效 type" }, { status: 400 });
  }
  const row = {
    id: "c_" + nanoid(8),
    name: body.name.trim(),
    type: body.type as "claude" | "openai",
    baseUrl: body.baseUrl ?? "",
    apiKey: body.apiKey ?? "sk-" + nanoid(32),
    weight: Number(body.weight) || 1,
    maxConcurrency: Math.max(0, Number(body.maxConcurrency) || 0),
    monitorIntervalSec: Math.max(0, Number(body.monitorIntervalSec) || 0),
    testModel: typeof body.testModel === "string" ? body.testModel.trim() : "",
    models: Array.isArray(body.models) ? body.models : [],
    status: "ok" as const,
    p50Ms: 0,
    errRate: 0,
    enabled: true,
  };
    if (usePostgres()) {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      await pgDb.insert(pgSchema.channels).values(row);
      await pgDb.insert(pgSchema.activities).values({ ts: Date.now(), event: `添加渠道 ${row.name}`, actor: actor.username });
      const { apiKey, ...rest } = row;
      return NextResponse.json(rest, { status: 201 });
    }
    db.insert(schema.channels).values(row).run();
    db.insert(schema.activities).values({
      ts: Date.now(),
      event: `添加渠道 ${row.name}`,
      actor: actor.username,
    }).run();
    const { apiKey, ...rest } = row;
    return NextResponse.json(rest, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "未知错误";
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "名称已存在" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
