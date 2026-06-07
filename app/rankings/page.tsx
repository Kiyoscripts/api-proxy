import { PageHead } from "@/components/page-head";
import { RankingsTabs } from "@/components/rankings/rankings-tabs";
import { getDashboardStatsAsync } from "@/lib/stats";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "models" ? "models" : "keys";
  const stats = await getDashboardStatsAsync("24h");

  return (
    <div className="container">
      <PageHead
        title="排行榜"
        sub={
          <>
            <span>最近 24 小时</span>
            <span className="sep">/</span>
            <span>API Key 与模型消耗</span>
          </>
        }
      />

      <RankingsTabs tab={tab} topKeys={stats.topKeys} modelStats={stats.modelStats} />
    </div>
  );
}
