import { AdminGiftCards } from "@/components/gift-cards/admin-gift-cards";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GiftCardsPage() {
  await requireAdmin();
  return (
    <section>
      <div className="section-title">
        <h1>礼品卡</h1>
        <p>生成一次性礼品卡，用户核销后可增加账户额度。</p>
      </div>
      <AdminGiftCards />
    </section>
  );
}
