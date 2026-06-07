import { PageHead } from "@/components/page-head";
import { RangeForm } from "@/components/dashboard/range-form";
import { getChannelHealthAsync } from "@/lib/stats";
import { fmtRelativeTime } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import type { DashboardRange } from "@/lib/types";

export const dynamic = "force-dynamic";

function toDateTimeLocal(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocal(v: string | undefined) {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

function rangeSince(range: DashboardRange, now: number) {
  if (range === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  return now - 24 * 60 * 60 * 1000;
}

export default async function ChannelStatusPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const now = Date.now();
  const parsedFrom = parseDateTimeLocal(sp.from);
  const parsedTo = parseDateTimeLocal(sp.to);
  const canUseCustom = sp.range === "custom" && parsedFrom !== null && parsedTo !== null && parsedTo > parsedFrom;
  const range = (canUseCustom ? "custom" : (sp.range === "today" || sp.range === "7d" || sp.range === "24h" ? sp.range : "24h")) as DashboardRange;
  const since = canUseCustom ? parsedFrom : rangeSince(range, now);
  const until = canUseCustom ? parsedTo : now;
  const health = await getChannelHealthAsync({ since, until });

  return (
    <div className="container">
      <PageHead
        title="状态"
        sub={
          <>
            <span>健康检查</span>
            <span className="sep">/</span>
            <span>{health.length} 个启用渠道</span>
          </>
        }
      />
      <RangeForm action="/admin/channel-status" from={toDateTimeLocal(since)} to={toDateTimeLocal(until)} />
      <section className="section" style={{ marginTop: 24 }}>
        <div className="channel-health-grid">
          {health.length === 0 && <div className="empty">暂无启用渠道</div>}
          {health.map(c => {
            const latencyPct = Math.min(100, c.p50Ms / 30);
            const statusText = c.status === "ok" ? "正常" : c.status === "warn" ? "限流" : "降级";
            const recentTests = c.testLogs.slice(-36);
            const availability = c.testLogs.length > 0 ? (c.testLogs.filter((log: any) => log.ok).length / c.testLogs.length) * 100 : null;
            const testSlots = Array.from({ length: 36 }, (_, i) => recentTests[i - (36 - recentTests.length)] ?? null);
            return (
              <div className={`channel-health-card ${c.status}`} key={c.id}>
                <div className="channel-health-head">
                  <div><div className="name">{c.name}</div><span className={`type-pill ${c.type}`}>{c.type}</span></div>
                  <span className={`status-badge ${c.status}`}><span className="dot" />{statusText}</span>
                </div>
                <div className="channel-health-metrics">
                  <div><span className="label">P50</span><strong className="mono">{c.p50Ms}<small>ms</small></strong></div>
                  <div className={`availability-metric ${availability !== null && availability < 99 ? "warn" : ""} ${availability !== null && availability < 95 ? "err" : ""}`}><span className="label">可用性</span><strong className="mono availability-rate">{availability === null ? "—" : <>{availability.toFixed(1)}<small>%</small></>}</strong></div>
                </div>
                <div className="channel-health-track"><i style={{ width: `${latencyPct}%` }} /></div>
                <div className={`channel-test-stripes ${recentTests.length === 0 ? "no-tests" : ""}`} title="当前时间段内测试记录">
                  {testSlots.map((log, i) => log ? <span key={log.id} className={log.ok ? "ok" : "err"} data-tip={`${log.ok ? "成功" : "失败"} · ${log.latencyMs}ms · ${fmtRelativeTime(log.ts)}`} aria-label={`${log.ok ? "成功" : "失败"}，延迟 ${log.latencyMs}ms，${fmtRelativeTime(log.ts)}`} /> : <span key={`empty-${i}`} className="empty-stripe" />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
