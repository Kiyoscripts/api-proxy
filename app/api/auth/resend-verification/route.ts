import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSettingsAsync } from "@/lib/settings";
import { assertCanSendVerificationAsync, createEmailVerificationAsync } from "@/lib/email-verification";
import { sendMail } from "@/lib/mailer";
import { verificationMail } from "@/lib/mail-templates";
import { usePostgres } from "@/lib/db/runtime";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  const user = usePostgres()
    ? await (async () => {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      return (await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.email, email)).limit(1))[0];
    })()
    : db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  if (!user || user.status !== "pending") return NextResponse.json({ error: "未找到待验证账号" }, { status: 404 });
  const sendLimit = await assertCanSendVerificationAsync(email);
  if (!sendLimit.ok) return NextResponse.json({ error: sendLimit.error }, { status: 429 });
  const settings = await getSettingsAsync();
  const verification = await createEmailVerificationAsync(user.id, email);
  const siteName = settings.siteName || "api-proxy";
  const verifyUrl = `${settings.siteUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(verification.token)}`;
  if (settings.smtpEnabled) {
    await sendMail(settings, {
      to: email,
      ...verificationMail({ siteName, code: verification.code, verifyUrl }),
    });
  }
  return NextResponse.json({ ok: true });
}
