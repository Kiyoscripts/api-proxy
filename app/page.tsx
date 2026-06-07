import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LandingNav } from "@/components/landing-nav";
import { getSettingsAsync } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettingsAsync()]);
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "进入控制台" : "申请接入";

  return (
    <div className="landing-page">
      <LandingNav />

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-kicker mono">{settings.siteName} / OpenAI gateway</div>
          <h1>一个入口，稳定使用主流 AI 模型。</h1>
          <p>
            面向产品、开发者和团队的模型访问网关。用统一 API 调用 Claude 与 OpenAI，减少接入差异，获得更稳定的响应和更清晰的用量记录。
          </p>
          <div className="landing-hero-actions">
            <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
            <Link className="btn" href="/model-square">浏览模型广场</Link>
            <Link className="btn" href="/docs">查看 API 文档</Link>
          </div>
        </div>

        <div className="landing-console landing-orbit" aria-label="模型接入面板示意">
          <div className="landing-console-head">
            <span className="dot live" />
            <span className="mono">gateway.session</span>
            <span className="landing-console-status mono">stable</span>
          </div>
          <div className="orbit-body">
            <div className="orbit-map mono">
              <div className="orbit-ring ring-a" />
              <div className="orbit-ring ring-b" />
              <div className="orbit-core">
                <span>API</span>
                <strong>one endpoint</strong>
              </div>
              <div className="orbit-chip chip-a"><span className="dot ok" />Claude</div>
              <div className="orbit-chip chip-b"><span className="dot warn" />OpenAI</div>
              <div className="orbit-chip chip-c"><span className="dot live" />Agents</div>
            </div>
            <div className="orbit-side">
              <div className="orbit-panel mono">
                <span className="dim">model</span>
                <strong>gpt-5-mini</strong>
                <em>ready</em>
              </div>
              <div className="orbit-panel mono">
                <span className="dim">tokens</span>
                <strong>18.4K</strong>
                <em>tracked</em>
              </div>
              <div className="orbit-panel mono">
                <span className="dim">latency</span>
                <strong>842ms</strong>
                <em>p50</em>
              </div>
            </div>
          </div>
          <div className="landing-code mono orbit-trace">
            <div><span className="dim">POST</span> /v1/chat/completions</div>
            <div><span className="dim">200</span> response streamed in 842ms</div>
            <div><span className="dim">usage</span> input 2.1K · output 16.3K</div>
          </div>
        </div>
      </section>

      <section id="routing" className="landing-band">
        <div className="band-copy">
          <span className="landing-kicker mono">one integration</span>
          <h2>少写适配代码，多交付产品能力。</h2>
        </div>
        <div className="landing-rail">
          <div className="rail-row"><span className="mono">统一入口</span><strong>一个 Base URL 接入多类模型</strong></div>
          <div className="rail-row"><span className="mono">兼容调用</span><strong>沿用熟悉的 OpenAI 风格接口</strong></div>
          <div className="rail-row"><span className="mono">稳定体验</span><strong>把模型访问做成团队基础设施</strong></div>
        </div>
      </section>

      <section id="control" className="landing-panels">
        <div className="landing-panel tall">
          <span className="landing-kicker mono">teams</span>
          <h3>让每个人都能安全接入。</h3>
          <p>为团队成员提供独立访问凭证，调用记录和用量清晰可见。开发、测试、上线阶段都能沿用同一套入口。</p>
        </div>
        <div className="landing-panel">
          <span className="landing-kicker mono">usage</span>
          <h3>知道模型花在哪里。</h3>
          <p>查看自己的请求、Token、延迟和成本趋势，定位消耗来源，不再靠猜。</p>
        </div>
        <div className="landing-panel">
          <span className="landing-kicker mono">ship</span>
          <h3>从原型到生产更顺。</h3>
          <p>聊天、代码助手、数据分析、Agent 工作流，都可以从同一个接口开始。</p>
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <span className="landing-kicker mono">start building</span>
          <h2>把模型能力接进你的产品。</h2>
        </div>
        <Link className="btn primary" href={primaryHref}>{primaryLabel}</Link>
      </section>
    </div>
  );
}
