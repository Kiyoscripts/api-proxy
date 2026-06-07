"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteName, setSiteName] = useState("api-proxy");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/site").then(r => r.json()).then(data => setSiteName(data.siteName || "api-proxy")).catch(() => null); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, displayName, email, password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "注册失败"); return; }
      if (data.needsVerification === false) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setStep("verify");
    } finally {
      setBusy(false);
    }
  }

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
    } finally {
      setBusy(false);
    }
  }

  if (step === "verify") {
    return (
      <section className="auth-page">
        <form className="auth-card" onSubmit={verify}>
          <div className="auth-kicker mono">{siteName} / verify email</div>
          <h1>验证邮箱</h1>
          <p>验证码已发送到 {email}。输入 6 位验证码，或点击邮件里的验证链接。</p>
          <div className="field"><label>验证码</label><input className="mono" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus /></div>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn primary auth-submit" disabled={busy}>{busy ? "验证中…" : "验证并登录"}</button>
          <div className="auth-switch"><button type="button" onClick={() => setStep("form")}>返回修改信息</button></div>
        </form>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-kicker mono">{siteName} / create account</div>
        <h1>注册 {siteName} 账号</h1>
        <p>欢迎加入，创建账号后即可开始使用。</p>
        <div className="field"><label>用户名</label><input value={username} onChange={e => setUsername(e.target.value)} autoFocus /></div>
        <div className="field"><label>显示名称</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="默认使用用户名" /></div>
        <div className="field"><label>邮箱</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></div>
        <div className="field"><label>密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 8 个字符" /></div>
        {error && <div className="auth-error">{error}</div>}
        <button className="btn primary auth-submit" disabled={busy}>{busy ? "注册中…" : "注册并登录"}</button>
        <div className="auth-switch">已有账号？<Link href="/login">登录</Link></div>
      </form>
    </section>
  );
}
