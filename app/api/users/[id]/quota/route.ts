import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { AuthError, requireAdmin } from "@/lib/auth";
import { insertDefaultUserQuota, insertDefaultUserQuotaAsync } from "@/lib/user-quota";
import { usePostgres } from "@/lib/db/runtime";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    if (usePostgres()) return NextResponse.json(await ensureQuotaAsync(id));
    return NextResponse.json(ensureQuota(id));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin();
    const { id } = await ctx.params;
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    await ensureQuotaAsync(id);
    const body = await req.json().catch(() => ({}));
    const update = {
      quotaUsd: Math.max(0, Number(body.quotaUsd) || 0),
      rateLimitRpm: Math.max(0, Number(body.rateLimitRpm) || 0),
      rateLimitTpm: Math.max(0, Number(body.rateLimitTpm) || 0),
      maxConcurrency: Math.max(0, Number(body.maxConcurrency) || 0),
      updatedAt: Date.now(),
    };
    await pgDb.update(pgSchema.userQuotas).set(update).where(eq(pgSchema.userQuotas.userId, id));
    await pgDb.insert(pgSchema.activities).values({ ts: Date.now(), event: "更新用户额度", actor: actor.username });
    return NextResponse.json(await ensureQuotaAsync(id));
  }
  ensureQuota(id);
  const body = await req.json().catch(() => ({}));
  const update = {
    quotaUsd: Math.max(0, Number(body.quotaUsd) || 0),
    rateLimitRpm: Math.max(0, Number(body.rateLimitRpm) || 0),
    rateLimitTpm: Math.max(0, Number(body.rateLimitTpm) || 0),
    maxConcurrency: Math.max(0, Number(body.maxConcurrency) || 0),
    updatedAt: Date.now(),
  };
  db.update(schema.userQuotas).set(update).where(eq(schema.userQuotas.userId, id)).run();
    db.insert(schema.activities).values({ ts: Date.now(), event: "更新用户额度", actor: actor.username }).run();
    return NextResponse.json(ensureQuota(id));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

function ensureQuota(userId: string) {
  const row = db.select().from(schema.userQuotas).where(eq(schema.userQuotas.userId, userId)).get();
  if (row) return row;
  return insertDefaultUserQuota(userId);
}

async function ensureQuotaAsync(userId: string) {
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const row = (await pgDb.select().from(pgSchema.userQuotas).where(eq(pgSchema.userQuotas.userId, userId)).limit(1))[0];
  if (row) return row;
  return insertDefaultUserQuotaAsync(userId);
}
