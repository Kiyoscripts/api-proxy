import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { consumeVerificationAsync, verifyEmailCodeAsync, verifyEmailTokenAsync } from "@/lib/email-verification";
import { usePostgres } from "@/lib/db/runtime";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return NextResponse.json({ error: "密码至少 8 个字符" }, { status: 400 });
  const result = token ? await verifyEmailTokenAsync(token, "reset_password") : await verifyEmailCodeAsync(email, code, "reset_password");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const user = usePostgres()
    ? await (async () => {
      const { pgDb, pgSchema } = await import("@/lib/db/pg");
      return (await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.id, result.row.userId)).limit(1))[0];
    })()
    : db.select().from(schema.users).where(eq(schema.users.id, result.row.userId)).get();
  if (!user || user.status === "disabled") return NextResponse.json({ error: "账号不可用" }, { status: 403 });
  await consumeVerificationAsync(result.row.id);
  if (usePostgres()) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    await pgDb.update(pgSchema.users).set({ passwordHash: hashPassword(password), updatedAt: Date.now() }).where(eq(pgSchema.users.id, user.id));
  } else {
    db.update(schema.users).set({ passwordHash: hashPassword(password), updatedAt: Date.now() }).where(eq(schema.users.id, user.id)).run();
  }
  return NextResponse.json({ ok: true });
}
