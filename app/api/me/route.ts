import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/password";
import { usePostgres } from "@/lib/db/runtime";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(publicUser(user));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const update: Partial<typeof schema.users.$inferInsert> = { updatedAt: Date.now() };
    if (typeof body.displayName === "string" && body.displayName.trim()) update.displayName = body.displayName.trim();
    if (typeof body.email === "string") {
      const email = body.email.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
      update.email = email;
    }
    const next = usePostgres()
      ? await (async () => {
        const { pgDb, pgSchema } = await import("@/lib/db/pg");
        await pgDb.update(pgSchema.users).set(update).where(eq(pgSchema.users.id, user.id));
        return (await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.id, user.id)).limit(1))[0];
      })()
      : (() => {
        db.update(schema.users).set(update).where(eq(schema.users.id, user.id)).run();
        return db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
      })();
    return NextResponse.json(publicUser(next ?? user));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (!verifyPassword(currentPassword, user.passwordHash)) return NextResponse.json({ error: "当前密码错误" }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: "新密码至少 8 个字符" }, { status: 400 });
    if (newPassword !== confirmPassword) return NextResponse.json({ error: "两次输入的新密码不一致" }, { status: 400 });
    if (usePostgres()) {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      await pgDb.update(pgSchema.users).set({ passwordHash: hashPassword(newPassword), updatedAt: Date.now() }).where(eq(pgSchema.users.id, user.id));
    } else {
      db.update(schema.users).set({ passwordHash: hashPassword(newPassword), updatedAt: Date.now() }).where(eq(schema.users.id, user.id)).run();
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

function publicUser(user: { id: string; username: string; displayName: string; email: string; role: string; status: string }) {
  return { id: user.id, username: user.username, displayName: user.displayName, email: user.email, role: user.role, status: user.status };
}
