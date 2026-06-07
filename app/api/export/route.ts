import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { AuthError, isAdmin, requireUser } from "@/lib/auth";
import { requestedUserId, scopedUserId } from "@/lib/scope";
import { eq } from "drizzle-orm";
import { usePostgres } from "@/lib/db/runtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const type = req.nextUrl.searchParams.get("type") || "request_logs";
    const format = req.nextUrl.searchParams.get("format") || "json";
    if (type !== "request_logs" && !isAdmin(user)) return NextResponse.json({ error: "无权导出管理数据" }, { status: 403 });
    const userId = scopedUserId(user, requestedUserId(req.nextUrl));
    const rows = await exportRows(type, userId);
    if (format === "csv") {
      return new Response(csv(rows), { headers: { "content-type": "text/csv; charset=utf-8" } });
    }
    return NextResponse.json(rows);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

async function exportRows(type: string, userId: string) {
  if (!usePostgres()) {
    return type === "channel_test_logs"
      ? db.select().from(schema.channelTestLogs).all()
      : type === "activities"
        ? db.select().from(schema.activities).all()
        : requestLogRows(userId);
  }
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  if (type === "channel_test_logs") return pgDb.select().from(pgSchema.channelTestLogs);
  if (type === "activities") return pgDb.select().from(pgSchema.activities);
  const rows = await pgDb.select().from(pgSchema.requestLogs);
  if (!userId) return rows;
  const keys = await pgDb.select({ id: pgSchema.keys.id }).from(pgSchema.keys).where(eq(pgSchema.keys.userId, userId));
  const ids = new Set(keys.map(key => key.id));
  return rows.filter(row => ids.has(row.keyId));
}

function requestLogRows(userId: string) {
  const rows = db.select().from(schema.requestLogs).all();
  if (!userId) return rows;
  const keys = db.select({ id: schema.keys.id }).from(schema.keys).where(eq(schema.keys.userId, userId)).all();
  const ids = new Set(keys.map(key => key.id));
  return rows.filter(row => ids.has(row.keyId));
}

function csv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")];
  for (const row of rows) lines.push(keys.map(key => quote(row[key])).join(","));
  return lines.join("\n");
}

function quote(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
