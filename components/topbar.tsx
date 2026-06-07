import { NavTabs } from "./nav-tabs";
import { Clock } from "./clock";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { UserMenu } from "./user-menu";
import { getSettingsAsync } from "@/lib/settings";
import { announcementFromSettings } from "@/lib/announcement";
import { AnnouncementSurface } from "./announcement";
import Link from "next/link";
import { SiteLogo } from "./site-logo";

export async function Topbar() {
  const user = await getCurrentUser();
  const settings = await getSettingsAsync();
  const announcement = announcementFromSettings(settings);
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand" aria-label={`${settings.siteName} 首页`}>
          <SiteLogo logoUrl={settings.siteLogoUrl} alt={settings.siteName} />
          <span>{settings.siteName}</span>
        </Link>
        <NavTabs isAdmin={user ? isAdmin(user) : false} />
        <div className="topbar-right">
          <Clock />
          <UserMenu label={user?.displayName || user?.username || "未登录"} />
        </div>
      </header>
      <AnnouncementSurface announcement={announcement} scope="app" />
    </>
  );
}
