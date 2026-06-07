import { getRedis } from "@/lib/redis";

const CHECK_AND_INCR_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return 0
end
current = redis.call('INCR', key)
redis.call('PEXPIRE', key, ttl)
if current > limit then
  return 0
end
return 1
`;

const WINDOW_MS = 60_000;

type Scope = "key" | "user";

export async function consumeRpm(scope: Scope, id: string, limit: number) {
  if (limit <= 0) return null;
  const redis = await getRedis();
  if (!redis) return null;
  const ok = await redis.eval(CHECK_AND_INCR_SCRIPT, {
    keys: [windowKey(scope, id, "rpm")],
    arguments: [String(limit), String(WINDOW_MS)],
  });
  return ok === 1;
}

export async function checkTpm(scope: Scope, id: string, limit: number) {
  if (limit <= 0) return null;
  const redis = await getRedis();
  if (!redis) return null;
  const current = Number(await redis.get(windowKey(scope, id, "tpm")) ?? 0);
  return current < limit;
}

export async function addTpm(scope: Scope, id: string, tokens: number) {
  if (tokens <= 0) return;
  const redis = await getRedis();
  if (!redis) return;
  const key = windowKey(scope, id, "tpm");
  await redis.multi().incrBy(key, Math.max(0, Math.round(tokens))).pExpire(key, WINDOW_MS).exec();
}

function windowKey(scope: Scope, id: string, metric: "rpm" | "tpm") {
  return `rl:${scope}:${id}:${metric}:${Math.floor(Date.now() / WINDOW_MS)}`;
}
