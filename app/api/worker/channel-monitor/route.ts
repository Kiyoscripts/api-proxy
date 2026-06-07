import { NextResponse } from "next/server";
import { ensureChannelMonitor } from "@/lib/channel-monitor";

export async function POST() {
  ensureChannelMonitor();
  return NextResponse.json({ ok: true });
}
