import type { AppSettings } from "./settings";

export type Announcement = {
  id: string;
  mode: "marquee" | "modal";
  title: string;
  html: string;
};

export function announcementFromSettings(settings: Pick<AppSettings, "announcementEnabled" | "announcementMode" | "announcementTitle" | "announcementHtml">): Announcement | null {
  const html = sanitizeAnnouncementHtml(settings.announcementHtml).trim();
  if (!settings.announcementEnabled || !html) return null;
  const title = settings.announcementTitle.trim() || "公告";
  return {
    id: hashText(`${settings.announcementMode}:${title}:${html}`),
    mode: settings.announcementMode,
    title,
    html,
  };
}

function sanitizeAnnouncementHtml(input: string) {
  return input
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi, "");
}

function hashText(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  return `ann_${(hash >>> 0).toString(36)}`;
}
