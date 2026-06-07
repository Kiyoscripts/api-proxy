"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const AUTH_PATHS = new Set(["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"]);

export function AppShell({ children, topbar }: { children: ReactNode; topbar: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.has(pathname);
  const isLandingPage = pathname === "/";
  const isPublicDocsPage = pathname === "/docs";
  const isModelSquarePage = pathname === "/model-square";

  return (
    <div className="app">
      {!isAuthPage && !isLandingPage && !isPublicDocsPage && !isModelSquarePage && topbar}
      <main className={isAuthPage ? "auth-main" : isLandingPage || isPublicDocsPage || isModelSquarePage ? "landing-main" : undefined}>{children}</main>
    </div>
  );
}
