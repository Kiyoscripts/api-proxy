import { PricingTable } from "@/components/pricing/pricing-table";
import { requireAdmin } from "@/lib/auth";

export default async function PricingPage() {
  await requireAdmin();
  return (
    <section>
      <div className="section-title">
        <h1>模型定价</h1>
        <p>按服务商和模型配置输入/输出 Token 单价，Dashboard 与排行榜会按这里计算成本。</p>
      </div>
      <PricingTable />
    </section>
  );
}
