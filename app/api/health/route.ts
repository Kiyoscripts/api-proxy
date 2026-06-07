import { NextResponse } from "next/server";
import { pgDb, pgSchema } from "@/lib/db/pg";
import { getRedis, redisEnabled } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pgDb.select({ key: pgSchema.settings.key }).from(pgSchema.settings).limit(1);
    if (redisEnabled()) {
      const redis = await getRedis();
      await redis?.ping();
    }
    return NextResponse.json({ ok: true, db: "postgres", redis: redisEnabled(), ts: Date.now() });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }
}
