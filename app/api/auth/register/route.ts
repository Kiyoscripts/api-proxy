import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "@/lib/password";
import { getSettingsAsync } from "@/lib/settings";
import { sendMail } from "@/lib/mailer";
import { assertCanSendVerificationAsync, createEmailVerificationAsync } from "@/lib/email-verification";
import { verificationMail } from "@/lib/mail-templates";
import { insertDefaultUserQuotaAsync } from "@/lib/user-quota";
import { usePostgres } from "@/lib/db/runtime";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : username;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username) return NextResponse.json({ error: "请输入用户名" }, { status: 400 });
  if (username.length < 3) return NextResponse.json({ error: "用户名至少 3 个字符" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "密码至少 8 个字符" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });

  const pg = usePostgres() ? await import("@/lib/db/pg") : null;
  const exists = pg
    ? (await pg.pgDb.select({ id: pg.pgSchema.users.id }).from(pg.pgSchema.users).where(eq(pg.pgSchema.users.username, username)).limit(1))[0]
    : db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, username)).get();
  if (exists) return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  const emailExists = pg
    ? (await pg.pgDb.select({ id: pg.pgSchema.users.id }).from(pg.pgSchema.users).where(eq(pg.pgSchema.users.email, email)).limit(1))[0]
    : db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).get();
  if (emailExists) return NextResponse.json({ error: "邮箱已被注册" }, { status: 409 });
  const firstUser = pg
    ? (await pg.pgDb.select({ id: pg.pgSchema.users.id }).from(pg.pgSchema.users).limit(1)).length === 0
    : db.select({ id: schema.users.id }).from(schema.users).limit(1).get() === undefined;
  const settings = await getSettingsAsync();
  if (!firstUser) {
    const sendLimit = await assertCanSendVerificationAsync(email);
    if (!sendLimit.ok) return NextResponse.json({ error: sendLimit.error }, { status: 429 });
  }
  const now = Date.now();
  const user = {
    id: "u_" + nanoid(8),
    username,
    displayName,
    email,
    passwordHash: hashPassword(password),
    role: firstUser ? "super_admin" as const : "user" as const,
    status: firstUser ? "active" as const : "pending" as const,
    createdAt: now,
    updatedAt: now,
  };
  if (pg) {
    await pg.pgDb.insert(pg.pgSchema.users).values(user);
    await pg.pgDb.insert(pg.pgSchema.activities).values({ ts: now, event: `注册用户 ${username}`, actor: username });
  } else {
    db.insert(schema.users).values(user).run();
    db.insert(schema.activities).values({ ts: now, event: `注册用户 ${username}`, actor: username }).run();
  }
  await insertDefaultUserQuotaAsync(user.id, now);
  if (firstUser) {
    const res = NextResponse.json({ ok: true, needsVerification: false, email }, { status: 201 });
    res.cookies.set("userId", user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
    return res;
  }

  const verification = await createEmailVerificationAsync(user.id, email);
  const siteName = settings.siteName || "api-proxy";
  const verifyUrl = `${settings.siteUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(verification.token)}`;
  if (settings.smtpEnabled) {
    await sendMail(settings, {
      to: email,
      ...verificationMail({ siteName, code: verification.code, verifyUrl }),
    });
  }

  return NextResponse.json({ ok: true, needsVerification: true, email }, { status: 201 });
}
