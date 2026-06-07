import { NextResponse } from "next/server";
import { getSettingsAsync } from "@/lib/settings";

export async function GET() {
  const settings = await getSettingsAsync();
  return NextResponse.json({ siteName: settings.siteName, siteUrl: settings.siteUrl, siteLogoUrl: settings.siteLogoUrl });
}
