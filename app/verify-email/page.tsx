"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailForm /></Suspense>;
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [siteName, setSiteName] = useState("api-proxy");
  const [code, setCode] = useState("");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) window.location.href = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  }, [searchParams]);
  useEffect(() => { fetch("/api/site").then(r => r.json()).then(data => setSiteName(data.siteName || "api-proxy")).catch(() => null); }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "验证失败"); return; }
      router.push("/dashboard");
      router.refresh();
    } finally { setBusy(false); }
  }

  async function resend() {
    if (!email) { setError("请输入邮箱"); return; }
    const res = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "发送失败"); return; }
    setError("");
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={verify}>
        <div className="auth-kicker mono">{siteName} / verify email</div>
        <h1>验证邮箱</h1>
        <p>输入注册邮箱和验证码完成验证。邮件中的验证链接也可以直接激活账号。</p>
        <div className="field"><label>邮箱</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label>验证码</label><input className="mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn primary auth-submit" disabled={busy}>{busy ? "验证中…" : "验证并登录"}</button>
        <div className="auth-switch"><button type="button" onClick={resend}>重新发送验证码</button><Link href="/login">返回登录</Link></div>
      </form>
    </section>
  );
}
