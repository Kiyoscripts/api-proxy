import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetailAsync } from "@/lib/user-stats";
import { statusLabel } from "@/lib/utils";
import { UserTokenChart } from "@/components/users/user-token-chart";
import { RangeForm } from "@/components/dashboard/range-form";
import type { DashboardRange } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";

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

export default async function UserDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const now = Date.now();
  const parsedFrom = parseDateTimeLocal(sp.from);
  const parsedTo = parseDateTimeLocal(sp.to);
  const canUseCustom = sp.range === "custom" && parsedFrom !== null && parsedTo !== null && parsedTo > parsedFrom;
  const range = (canUseCustom ? "custom" : (sp.range === "today" || sp.range === "7d" || sp.range === "24h" ? sp.range : "24h")) as DashboardRange;
  const since = canUseCustom ? parsedFrom : rangeSince(range, now);
  const until = canUseCustom ? parsedTo : now;
  const data = await getUserDetailAsync(id, { since, until });
  if (!data) notFound();
  const { user, quota, keys, stats } = data;
  return (
    <section>
      <div className="section-title">
        <h1>{user.displayName}</h1>
        <p className="mono">{user.username} · {user.email || "无邮箱"}</p>
      </div>
      <div className="page-actions"><Link className="btn" href="/users">返回用户列表</Link></div>
      <RangeForm action={`/users/${id}`} from={toDateTimeLocal(since)} to={toDateTimeLocal(until)} />

      <div className="stat-strip">
        <Stat label="请求量" value={stats.requests.toLocaleString()} />
        <Stat label="成功率" value={`${stats.successRate.toFixed(1)}%`} />
        <Stat label="消费" value={`$${stats.cost.toFixed(4)}`} />
        <Stat label="额度" value={`$${(quota?.quotaUsd ?? 0).toFixed(2)}`} extra={`已用 $${(quota?.usedUsd ?? 0).toFixed(4)}`} />
        <Stat label="Token" value={(stats.tokensIn + stats.tokensOut + stats.cacheReadTokens + stats.cacheCreationTokens).toLocaleString()} />
      </div>

      <section className="section">
        <h2>Token 消耗趋势</h2>
        <UserTokenChart data={stats.tokenSeries} />
      </section>

      <section className="section">
        <h2>绑定 API Key</h2>
        <table className="table"><thead><tr><th>名称</th><th>前缀</th><th>状态</th><th>区间请求</th><th>区间 Token</th><th>区间消费</th></tr></thead><tbody>{keys.length === 0 && <tr><td colSpan={6} className="empty">暂无绑定 Key</td></tr>}{keys.map(k => <tr key={k.id}><td>{k.name}</td><td className="mono">{k.prefix}</td><td>{k.status}</td><td className="mono">{k.periodStats.requests}</td><td className="mono">{k.periodStats.tokens.toLocaleString()}</td><td className="mono">${k.periodStats.cost.toFixed(4)}</td></tr>)}</tbody></table>
      </section>

      <section className="section">
        <h2>模型统计</h2>
        <table className="table"><thead><tr><th>模型</th><th>请求</th><th>Token</th><th>消费</th></tr></thead><tbody>{stats.models.length === 0 && <tr><td colSpan={4} className="empty">暂无模型数据</td></tr>}{stats.models.map(m => <tr key={m.model}><td className="mono">{m.model}</td><td className="mono">{m.requests}</td><td className="mono">{m.tokens.toLocaleString()}</td><td className="mono">${m.cost.toFixed(4)}</td></tr>)}</tbody></table>
      </section>

      <section className="section">
        <h2>最近请求</h2>
        <table className="table"><thead><tr><th>时间</th><th>模型</th><th>状态</th><th>Token</th></tr></thead><tbody>{stats.recentLogs.length === 0 && <tr><td colSpan={4} className="empty">暂无请求</td></tr>}{stats.recentLogs.map(log => <tr key={log.id}><td className="mono dim">{new Date(log.ts).toLocaleString()}</td><td className="mono">{log.model}</td><td>{statusLabel(log.status)}</td><td className="mono">{(log.tokensIn + log.tokensOut + log.cacheReadTokens + log.cacheCreationTokens).toLocaleString()}</td></tr>)}</tbody></table>
      </section>
    </section>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return <div className="stat"><div className="label">{label}</div><div className="value">{value}</div>{extra && <div className="extra">{extra}</div>}</div>;
}
