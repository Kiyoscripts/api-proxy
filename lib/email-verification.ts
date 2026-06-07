import { createHmac, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { and, eq, gte, isNull } from "drizzle-orm";
import { usePostgres } from "@/lib/db/runtime";

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const HOURLY_LIMIT = 5;
type Purpose = "register" | "reset_password";

function secret() {
  return process.env.EMAIL_VERIFY_SECRET || "dev-email-verify-secret";
}

export function hashVerifyValue(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function assertCanSendVerification(email: string, purpose: Purpose = "register") {
  const now = Date.now();
  const recent = db.select().from(schema.emailVerifications).where(and(eq(schema.emailVerifications.email, email), eq(schema.emailVerifications.purpose, purpose), gte(schema.emailVerifications.createdAt, now - RESEND_COOLDOWN_MS))).all();
  if (recent.length > 0) return { ok: false as const, error: "请 60 秒后再重新发送验证码" };
  const hourly = db.select().from(schema.emailVerifications).where(and(eq(schema.emailVerifications.email, email), eq(schema.emailVerifications.purpose, purpose), gte(schema.emailVerifications.createdAt, now - 60 * 60 * 1000))).all();
  if (hourly.length >= HOURLY_LIMIT) return { ok: false as const, error: "验证码发送次数过多，请稍后再试" };
  return { ok: true as const };
}

export async function assertCanSendVerificationAsync(email: string, purpose: Purpose = "register") {
  if (!usePostgres()) return assertCanSendVerification(email, purpose);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const now = Date.now();
  const recent = await pgDb.select().from(pgSchema.emailVerifications).where(and(eq(pgSchema.emailVerifications.email, email), eq(pgSchema.emailVerifications.purpose, purpose), gte(pgSchema.emailVerifications.createdAt, now - RESEND_COOLDOWN_MS)));
  if (recent.length > 0) return { ok: false as const, error: "请 60 秒后再重新发送验证码" };
  const hourly = await pgDb.select().from(pgSchema.emailVerifications).where(and(eq(pgSchema.emailVerifications.email, email), eq(pgSchema.emailVerifications.purpose, purpose), gte(pgSchema.emailVerifications.createdAt, now - 60 * 60 * 1000)));
  if (hourly.length >= HOURLY_LIMIT) return { ok: false as const, error: "验证码发送次数过多，请稍后再试" };
  return { ok: true as const };
}

export function createEmailVerification(userId: string, email: string, purpose: Purpose = "register") {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const row = {
    id: "ev_" + nanoid(8),
    userId,
    email,
    codeHash: hashVerifyValue(`${userId}:${email}:${code}`),
    tokenHash: hashVerifyValue(token),
    purpose,
    expiresAt: now + TTL_MS,
    usedAt: null,
    attempts: 0,
    createdAt: now,
  };
  db.insert(schema.emailVerifications).values(row).run();
  return { row, code, token };
}

export async function createEmailVerificationAsync(userId: string, email: string, purpose: Purpose = "register") {
  if (!usePostgres()) return createEmailVerification(userId, email, purpose);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const row = {
    id: "ev_" + nanoid(8),
    userId,
    email,
    codeHash: hashVerifyValue(`${userId}:${email}:${code}`),
    tokenHash: hashVerifyValue(token),
    purpose,
    expiresAt: now + TTL_MS,
    usedAt: null,
    attempts: 0,
    createdAt: now,
  };
  await pgDb.insert(pgSchema.emailVerifications).values(row);
  return { row, code, token };
}

export function verifyEmailCode(email: string, code: string, purpose: Purpose = "register") {
  const row = db.select().from(schema.emailVerifications).where(and(eq(schema.emailVerifications.email, email), eq(schema.emailVerifications.purpose, purpose), isNull(schema.emailVerifications.usedAt), gte(schema.emailVerifications.expiresAt, Date.now()))).all().at(-1);
  if (!row) return { ok: false as const, error: "验证码不存在或已过期" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "验证码尝试次数过多，请重新发送" };
  const expected = hashVerifyValue(`${row.userId}:${row.email}:${code}`);
  if (expected !== row.codeHash) {
    db.update(schema.emailVerifications).set({ attempts: row.attempts + 1 }).where(eq(schema.emailVerifications.id, row.id)).run();
    return { ok: false as const, error: "验证码错误" };
  }
  return { ok: true as const, row };
}

export async function verifyEmailCodeAsync(email: string, code: string, purpose: Purpose = "register") {
  if (!usePostgres()) return verifyEmailCode(email, code, purpose);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const rows = await pgDb.select().from(pgSchema.emailVerifications).where(and(eq(pgSchema.emailVerifications.email, email), eq(pgSchema.emailVerifications.purpose, purpose), isNull(pgSchema.emailVerifications.usedAt), gte(pgSchema.emailVerifications.expiresAt, Date.now())));
  const row = rows.at(-1);
  if (!row) return { ok: false as const, error: "验证码不存在或已过期" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "验证码尝试次数过多，请重新发送" };
  const expected = hashVerifyValue(`${row.userId}:${row.email}:${code}`);
  if (expected !== row.codeHash) {
    await pgDb.update(pgSchema.emailVerifications).set({ attempts: row.attempts + 1 }).where(eq(pgSchema.emailVerifications.id, row.id));
    return { ok: false as const, error: "验证码错误" };
  }
  return { ok: true as const, row };
}

export function verifyEmailToken(token: string, purpose: Purpose = "register") {
  const tokenHash = hashVerifyValue(token);
  const row = db.select().from(schema.emailVerifications).where(and(eq(schema.emailVerifications.tokenHash, tokenHash), eq(schema.emailVerifications.purpose, purpose), isNull(schema.emailVerifications.usedAt), gte(schema.emailVerifications.expiresAt, Date.now()))).get();
  if (!row) return { ok: false as const, error: "验证链接不存在或已过期" };
  return { ok: true as const, row };
}

export async function verifyEmailTokenAsync(token: string, purpose: Purpose = "register") {
  if (!usePostgres()) return verifyEmailToken(token, purpose);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  const tokenHash = hashVerifyValue(token);
  const row = (await pgDb.select().from(pgSchema.emailVerifications).where(and(eq(pgSchema.emailVerifications.tokenHash, tokenHash), eq(pgSchema.emailVerifications.purpose, purpose), isNull(pgSchema.emailVerifications.usedAt), gte(pgSchema.emailVerifications.expiresAt, Date.now()))).limit(1))[0];
  if (!row) return { ok: false as const, error: "验证链接不存在或已过期" };
  return { ok: true as const, row };
}

export function consumeVerification(id: string) {
  db.update(schema.emailVerifications).set({ usedAt: Date.now() }).where(eq(schema.emailVerifications.id, id)).run();
}

export async function consumeVerificationAsync(id: string) {
  if (!usePostgres()) return consumeVerification(id);
  const { pgDb, pgSchema } = await import("@/lib/db/pg");
  await pgDb.update(pgSchema.emailVerifications).set({ usedAt: Date.now() }).where(eq(pgSchema.emailVerifications.id, id));
}
