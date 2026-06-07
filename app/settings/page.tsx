import { SettingsForm } from "@/components/settings/settings-form";
import { requireAdmin } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAdmin();
  return (
    <section>
      <div className="section-title">
        <h1>系统设置</h1>
        <p>集中管理调试、重试等运行配置。</p>
      </div>
      <SettingsForm />
    </section>
  );
}
