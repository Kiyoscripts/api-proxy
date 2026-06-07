import { NextRequest, NextResponse } from "next/server";
import { getRecentLogsAsync } from "@/lib/stats";
import { AuthError, requireUser } from "@/lib/auth";
import { requestedUserId, scopedUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Math.min(500, Number(req.nextUrl.searchParams.get("limit")) || 200);
    const status = req.nextUrl.searchParams.get("status") ?? "all";
    const userId = scopedUserId(user, requestedUserId(req.nextUrl));
    return NextResponse.json(await getRecentLogsAsync(limit, status, { userId }));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
