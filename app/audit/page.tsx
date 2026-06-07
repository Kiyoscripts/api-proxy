import { PageHead } from "@/components/page-head";
import { getRecentActivityAsync } from "@/lib/stats";
import { fmtRelativeTime } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const activity = await getRecentActivityAsync(100);

  return (
    <div className="container">
      <PageHead
        title="审计日志"
        sub={
          <>
            <span>管理操作记录</span>
            <span className="sep">/</span>
            <span>{activity.length.toLocaleString()} 条</span>
          </>
        }
      />

      <table className="table">
        <thead>
          <tr>
            <th>时间</th>
            <th>事件</th>
            <th>操作人</th>
          </tr>
        </thead>
        <tbody>
          {activity.length === 0 && (
            <tr><td colSpan={3} className="empty">暂无审计日志</td></tr>
          )}
          {activity.map(a => (
            <tr key={a.id}>
              <td className="mono dim">{fmtRelativeTime(a.ts)}</td>
              <td>{a.event}</td>
              <td className="mono dim">{a.actor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
