"use client";

import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/announcement";

export function AnnouncementSurface({ announcement, scope = "app" }: { announcement: Announcement | null; scope?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!announcement || announcement.mode !== "modal") return;
    const key = `announcement:${scope}:${announcement.id}:closed`;
    if (sessionStorage.getItem(key)) return;
    setOpen(true);
  }, [announcement]);

  if (!announcement) return null;

  if (announcement.mode === "marquee") {
    return (
      <div className="announcement-bar" role="status">
        <div className="announcement-bar-label">{announcement.title}</div>
        <div className="announcement-marquee">
          <div className="announcement-marquee-track" dangerouslySetInnerHTML={{ __html: announcement.html }} />
        </div>
      </div>
    );
  }

  function close() {
    if (announcement) sessionStorage.setItem(`announcement:${scope}:${announcement.id}:closed`, "1");
    setOpen(false);
  }

  return open ? (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal announcement-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{announcement.title}</h2>
          <button className="modal-close" type="button" onClick={close} aria-label="关闭">×</button>
        </div>
        <div className="modal-body announcement-html" dangerouslySetInnerHTML={{ __html: announcement.html }} />
        <div className="modal-foot">
          <button className="btn primary" type="button" onClick={close}>知道了</button>
        </div>
      </div>
    </div>
  ) : null;
}
