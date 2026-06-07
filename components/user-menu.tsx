"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef } from "react";

export function UserMenu({ label }: { label: string }) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const initials = (label || "--").slice(0, 2).toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    if (detailsRef.current) detailsRef.current.open = false;
    router.push("/login");
    router.refresh();
  }

  return (
    <details className="user-menu" ref={detailsRef}>
      <summary className="user">
        <span className="avatar">{initials}</span>
        <span>{label}</span>
      </summary>
      <div className="user-menu-panel">
        <Link href="/account" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}>个人信息</Link>
        <button type="button" onClick={logout}>退出登录</button>
      </div>
    </details>
  );
}
