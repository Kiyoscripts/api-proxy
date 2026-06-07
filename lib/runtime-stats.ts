import os from "node:os";

export type RuntimeStats = {
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  uptimeSec: number;
  loadAvg1m: number;
  cpuCount: number;
};

export function getRuntimeStats(): RuntimeStats {
  const mem = process.memoryUsage();
  return {
    rssBytes: mem.rss,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    externalBytes: mem.external,
    uptimeSec: process.uptime(),
    loadAvg1m: os.loadavg()[0] ?? 0,
    cpuCount: os.cpus().length,
  };
}
