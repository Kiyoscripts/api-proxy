import { acquireRedisSemaphore, isRedisSemaphoreSaturated } from "@/lib/redis-semaphore";

type QueueState = {
  active: number;
  waiters: (() => void)[];
};

declare global {
  // eslint-disable-next-line no-var
  var __channelQueues: Map<string, QueueState> | undefined;
}

const queues = globalThis.__channelQueues ?? new Map<string, QueueState>();
globalThis.__channelQueues = queues;

export async function acquireChannelSlot(channelId: string, maxConcurrency: number): Promise<() => void> {
  if (maxConcurrency <= 0) return () => {};
  const redisRelease = await acquireRedisSemaphore(`sem:channel:${channelId}`, maxConcurrency);
  if (redisRelease) return () => { void redisRelease(); };

  const state = queues.get(channelId) ?? { active: 0, waiters: [] };
  queues.set(channelId, state);

  if (state.active < maxConcurrency) {
    state.active += 1;
    return releaseFor(channelId, state, maxConcurrency);
  }

  return new Promise(resolve => {
    state.waiters.push(() => {
      state.active += 1;
      resolve(releaseFor(channelId, state, maxConcurrency));
    });
  });
}

export async function isChannelSaturated(channelId: string, maxConcurrency: number) {
  if (maxConcurrency <= 0) return false;
  const redisSaturated = await isRedisSemaphoreSaturated(`sem:channel:${channelId}`, maxConcurrency);
  if (redisSaturated) return true;
  const state = queues.get(channelId);
  return !!state && state.active >= maxConcurrency;
}

function releaseFor(channelId: string, state: QueueState, maxConcurrency: number) {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.active = Math.max(0, state.active - 1);
    while (state.active < maxConcurrency && state.waiters.length > 0) {
      const next = state.waiters.shift();
      if (next) next();
    }
    if (state.active === 0 && state.waiters.length === 0) queues.delete(channelId);
  };
}
