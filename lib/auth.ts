import { cookies, headers } from "next/headers";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { usePostgres } from "@/lib/db/runtime";

export type AuthUser = typeof schema.users.$inferSelect;

export function isAdmin(user: Pick<AuthUser, "role">) {
  return user.role === "super_admin" || user.role === "admin";
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const requestedId = hdrs.get("x-user-id") ?? cookieStore.get("userId")?.value ?? "";
  if (usePostgres() && requestedId) {
    const { pgDb, pgSchema } = await import("@/lib/db/pg");
    const byId = (await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.id, requestedId)).limit(1))[0] as AuthUser | undefined;
    if (!byId || byId.status !== "active") return null;
    return byId;
  }
  const byId = requestedId
    ? db.select().from(schema.users).where(eq(schema.users.id, requestedId)).get()
    : null;
  const user = byId ?? null;
  if (!user || user.status !== "active") return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "请先登录");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) throw new AuthError(403, "无权访问管理端资源");
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}
