import { and, eq, type SQL } from "drizzle-orm";
import { schema } from "@/lib/db";
import { isAdmin, type AuthUser } from "@/lib/auth";

export function requestedUserId(url: URL) {
  const value = url.searchParams.get("userId")?.trim() ?? "";
  return value === "all" ? "" : value;
}

export function scopedUserId(user: AuthUser, requested = "") {
  if (!isAdmin(user)) return user.id;
  return requested;
}

export function keyOwnerWhere(user: AuthUser, requested = "") {
  const userId = scopedUserId(user, requested);
  return userId ? eq(schema.keys.userId, userId) : undefined;
}

export function logOwnerWhere(user: AuthUser, requested = "") {
  const userId = scopedUserId(user, requested);
  return userId ? eq(schema.keys.userId, userId) : undefined;
}

export function combineWhere(...parts: Array<SQL | undefined>) {
  const filtered = parts.filter((part): part is SQL => !!part);
  if (filtered.length === 0) return undefined;
  return filtered.length === 1 ? filtered[0] : and(...filtered);
}
