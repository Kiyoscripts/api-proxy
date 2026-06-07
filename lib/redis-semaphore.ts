import { getRedis } from "@/lib/redis";

const ACQUIRE_SCRIPT = `
local key = KEYS[1]
local token = ARGV[1]
local limit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - ttl)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, token)
  redis.call('PEXPIRE', key, ttl)
  return 1
end
return 0
`;

const RELEASE_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
if redis.call('ZCARD', KEYS[1]) == 0 then
  redis.call('DEL', KEYS[1])
end
return 1
`;

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const RETRY_MS = 50;

export async function acquireRedisSemaphore(key: string, limit: number, ttlMs = DEFAULT_TTL_MS): Promise<(() => Promise<void>) | null> {
  if (limit <= 0) return async () => {};
  const redis = await getRedis();
  if (!redis) return null;
  const token = crypto.randomUUID();
  while (true) {
    const acquired = await redis.eval(ACQUIRE_SCRIPT, {
      keys: [key],
      arguments: [token, String(limit), String(ttlMs), String(Date.now())],
    });
    if (acquired === 1) {
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        await redis.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
      };
    }
    await new Promise(resolve => setTimeout(resolve, RETRY_MS));
  }
}

export async function isRedisSemaphoreSaturated(key: string, limit: number, ttlMs = DEFAULT_TTL_MS) {
  if (limit <= 0) return false;
  const redis = await getRedis();
  if (!redis) return false;
  const now = Date.now();
  await redis.zRemRangeByScore(key, "-inf", now - ttlMs);
  return await redis.zCard(key) >= limit;
}
