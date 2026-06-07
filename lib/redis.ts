import { createClient, type RedisClientType } from "redis";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: RedisClientType | undefined;
  // eslint-disable-next-line no-var
  var __redisConnecting: Promise<RedisClientType> | undefined;
}

export function redisEnabled() {
  return !!process.env.REDIS_URL;
}

export async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (globalThis.__redisClient?.isOpen) return globalThis.__redisClient;
  if (globalThis.__redisConnecting) return globalThis.__redisConnecting;

  const client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
  client.on("error", error => console.error("[redis]", error));
  globalThis.__redisConnecting = client.connect().then(() => {
    globalThis.__redisClient = client;
    globalThis.__redisConnecting = undefined;
    return client;
  }).catch(error => {
    globalThis.__redisConnecting = undefined;
    throw error;
  });
  return globalThis.__redisConnecting;
}
