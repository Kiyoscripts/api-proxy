import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, or } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { usePostgres } from "@/lib/db/runtime";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const account = typeof body.account === "string" ? body.account.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!account || !password) return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });

  const user = usePostgres()
    ? await (async () => {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      return (await pgDb.select().from(pgSchema.users).where(or(eq(pgSchema.users.username, account), eq(pgSchema.users.email, account))).limit(1))[0];
    })()
    : db.select().from(schema.users).where(or(eq(schema.users.username, account), eq(schema.users.email, account))).get();
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
  }
  if (user.status === "pending") return NextResponse.json({ error: "邮箱尚未验证" }, { status: 403 });
  if (user.status !== "active") return NextResponse.json({ error: "账号已禁用" }, { status: 403 });

  const res = NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  res.cookies.set("userId", user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return res;
}
