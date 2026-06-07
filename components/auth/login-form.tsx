"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [siteName, setSiteName] = useState("api-proxy");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/site").then(r => r.json()).then(data => setSiteName(data.siteName || "api-proxy")).catch(() => null); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "登录失败"); return; }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-kicker mono">{siteName} / sign in</div>
        <h1>登录 {siteName}</h1>
        <p>欢迎回来，登录后继续管理你的账号与服务。</p>
        <div className="field"><label>用户名或邮箱</label><input value={account} onChange={e => setAccount(e.target.value)} autoFocus /></div>
        <div className="field"><label>密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn primary auth-submit" disabled={busy}>{busy ? "登录中…" : "登录"}</button>
        <div className="auth-switch"><Link href="/forgot-password">忘记密码</Link><span>还没有账号？</span><Link href="/register">注册</Link></div>
      </form>
    </section>
  );
}
