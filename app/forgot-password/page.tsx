"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [siteName, setSiteName] = useState("api-proxy");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/site").then(r => r.json()).then(data => setSiteName(data.siteName || "api-proxy")).catch(() => null); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "发送失败"); return; }
      setMessage("如果该邮箱存在，重置邮件已经发送。");
    } finally { setBusy(false); }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-kicker mono">{siteName} / password recovery</div>
        <h1>找回密码</h1>
        <p>输入注册邮箱，系统会发送验证码和重置链接。</p>
        <div className="field"><label>邮箱</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>
        {message && <div className="auth-debug">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        <button className="btn primary auth-submit" disabled={busy}>{busy ? "发送中…" : "发送重置邮件"}</button>
        <div className="auth-switch"><Link href="/reset-password">已有验证码？重置密码</Link><Link href="/login">返回登录</Link></div>
      </form>
    </section>
  );
}
