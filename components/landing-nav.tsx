import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AnnouncementSurface } from "@/components/announcement";
import { announcementFromSettings } from "@/lib/announcement";
import { getSettingsAsync } from "@/lib/settings";
import { SiteLogo } from "./site-logo";

export async function LandingNav() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettingsAsync()]);
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "进入控制台" : "申请接入";
  const announcement = announcementFromSettings(settings);

  return (
    <>
      <header className="landing-nav">
        <Link href="/" className="landing-brand" aria-label={settings.siteName}>
          <SiteLogo logoUrl={settings.siteLogoUrl} alt={settings.siteName} className="landing-logo" />
          <span>{settings.siteName}</span>
        </Link>
        <nav className="landing-links" aria-label="首页导航">
          <Link href="/#routing">接入</Link>
          <Link href="/model-square">模型</Link>
          <Link href="/#control">体验</Link>
          <Link href="/docs">文档</Link>
        </nav>
        <div className="landing-actions">
          {!user && <Link className="btn ghost" href="/login">登录</Link>}
          <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
        </div>
      </header>
      <AnnouncementSurface announcement={announcement} scope="landing" />
    </>
  );
}
