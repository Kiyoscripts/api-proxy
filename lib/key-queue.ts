import { acquireRedisSemaphore } from "@/lib/redis-semaphore";

type QueueState = {
  active: number;
  waiters: (() => void)[];
};

declare global {
  // eslint-disable-next-line no-var
  var __keyQueues: Map<string, QueueState> | undefined;
}

const queues = globalThis.__keyQueues ?? new Map<string, QueueState>();
globalThis.__keyQueues = queues;

export async function acquireKeySlot(keyId: string, maxConcurrency: number): Promise<() => void> {
  if (maxConcurrency <= 0) return () => {};
  const redisRelease = await acquireRedisSemaphore(`sem:key:${keyId}`, maxConcurrency);
  if (redisRelease) return () => { void redisRelease(); };
  const state = queues.get(keyId) ?? { active: 0, waiters: [] };
  queues.set(keyId, state);
  if (state.active < maxConcurrency) {
    state.active += 1;
    return releaseFor(keyId, state, maxConcurrency);
  }
  return new Promise(resolve => {
    state.waiters.push(() => {
      state.active += 1;
      resolve(releaseFor(keyId, state, maxConcurrency));
    });
  });
}

function releaseFor(keyId: string, state: QueueState, maxConcurrency: number) {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.active = Math.max(0, state.active - 1);
    while (state.active < maxConcurrency && state.waiters.length > 0) {
      const next = state.waiters.shift();
      if (next) next();
    }
    if (state.active === 0 && state.waiters.length === 0) queues.delete(keyId);
  };
}
