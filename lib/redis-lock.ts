import { getRedis } from "@/lib/redis";

export async function claimRedisLock(key: string, ttlMs: number) {
  const redis = await getRedis();
  if (!redis) return null;
  const token = crypto.randomUUID();
  const ok = await redis.set(key, token, { PX: ttlMs, NX: true });
  if (ok !== "OK") return false;
  return true;
}
