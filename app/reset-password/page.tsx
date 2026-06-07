"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [siteName, setSiteName] = useState("api-proxy");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = searchParams.get("token") ?? "";

  useEffect(() => { fetch("/api/site").then(r => r.json()).then(data => setSiteName(data.siteName || "api-proxy")).catch(() => null); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email, code, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "重置失败"); return; }
      router.push("/login");
    } finally { setBusy(false); }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-kicker mono">{siteName} / reset password</div>
        <h1>重置密码</h1>
        <p>{token ? "设置你的新密码。" : "输入邮箱、验证码和新密码。"}</p>
        {!token && <div className="field"><label>邮箱</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>}
        {!token && <div className="field"><label>验证码</label><input className="mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>}
        <div className="field"><label>新密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 8 个字符" /></div>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn primary auth-submit" disabled={busy}>{busy ? "重置中…" : "重置密码"}</button>
        <div className="auth-switch"><Link href="/forgot-password">重新发送邮件</Link><Link href="/login">返回登录</Link></div>
      </form>
    </section>
  );
}
