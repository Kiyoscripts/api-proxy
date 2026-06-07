import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { consumeVerificationAsync, verifyEmailCodeAsync, verifyEmailTokenAsync } from "@/lib/email-verification";
import { usePostgres } from "@/lib/db/runtime";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = await verifyEmailTokenAsync(token);
  if (!result.ok) return redirectError(req, result.error);
  return activate(req, result.row.id, result.row.userId, true);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !code) return NextResponse.json({ error: "请输入邮箱和验证码" }, { status: 400 });
  const result = await verifyEmailCodeAsync(email, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return activate(req, result.row.id, result.row.userId, false);
}

async function activate(req: NextRequest, verificationId: string, userId: string, redirect: boolean) {
  const user = usePostgres()
    ? await (async () => {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      return (await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.id, userId)).limit(1))[0];
    })()
    : db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return redirect ? redirectError(req, "用户不存在") : NextResponse.json({ error: "用户不存在" }, { status: 404 });
  await consumeVerificationAsync(verificationId);
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    await pgDb.update(pgSchema.users).set({ status: "active", updatedAt: Date.now() }).where(eq(pgSchema.users.id, userId));
  } else {
    db.update(schema.users).set({ status: "active", updatedAt: Date.now() }).where(eq(schema.users.id, userId)).run();
  }
  const res = redirect ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  res.cookies.set("userId", user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return res;
}

function redirectError(req: NextRequest, error: string) {
  const url = new URL("/verify-email", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}
