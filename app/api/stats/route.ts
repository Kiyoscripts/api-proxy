import { NextRequest, NextResponse } from "next/server";
import { getDashboardStatsAsync } from "@/lib/stats";
import { AuthError, requireUser } from "@/lib/auth";
import { requestedUserId, scopedUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const userId = scopedUserId(user, requestedUserId(req.nextUrl));
    return NextResponse.json(await getDashboardStatsAsync("24h", { userId }));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
