import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSettingsAsync } from "@/lib/settings";
import { assertCanSendVerificationAsync, createEmailVerificationAsync } from "@/lib/email-verification";
import { sendMail } from "@/lib/mailer";
import { resetPasswordMail } from "@/lib/mail-templates";
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
  if (!user || user.status === "disabled") return NextResponse.json({ ok: true });
  const sendLimit = await assertCanSendVerificationAsync(email, "reset_password");
  if (!sendLimit.ok) return NextResponse.json({ error: sendLimit.error }, { status: 429 });
  const settings = await getSettingsAsync();
  const verification = await createEmailVerificationAsync(user.id, email, "reset_password");
  const resetUrl = `${settings.siteUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(verification.token)}`;
  if (settings.smtpEnabled) {
    await sendMail(settings, {
      to: email,
      ...resetPasswordMail({ siteName: settings.siteName, code: verification.code, resetUrl }),
    });
  }
  return NextResponse.json({ ok: true });
}
