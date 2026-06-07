"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PublicModel } from "@/lib/model-catalog";

type Props = {
  models: PublicModel[];
};

const API_KEY = "sk-relay-XXXX-xxxxxxxxxxxxxxxx";

function fmtPrice(value: number | null) {
  return value === null ? "未定价" : `$${value}/M`;
}

function hasPrice(model: PublicModel) {
  return model.inputPricePerMTok !== null || model.outputPricePerMTok !== null || model.cacheReadPricePerMTok !== null || model.cacheCreationPricePerMTok !== null;
}

export function ModelSquareList({ models }: Props) {
  const [selected, setSelected] = useState<PublicModel | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!selected) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  async function copy(label: string, value: string) {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1300);
  }

  return (
    <>
      <div className="model-square-grid">
        {models.map(model => (
          <button className={`model-square-card ${model.provider}`} key={model.id} onClick={() => setSelected(model)} type="button">
            <div className="model-square-card-top">
              <span className={`type-pill ${model.provider}`}>{model.provider}</span>
              <span className="model-square-status mono"><span />ready</span>
            </div>
            <div className="model-square-card-body">
              <h3>{model.displayName}</h3>
              <div className="model-square-id mono" aria-label={`模型 ${model.model}`}>
                {model.model.split("-").map((part, index) => (
                  <span key={`${model.id}-${index}`}>{part}</span>
                ))}
              </div>
            </div>
            <div className="model-square-card-foot mono">
              <span>public</span>
              <span>{model.upstreamModel !== model.model ? "mapped upstream" : "direct upstream"}</span>
            </div>
            <div className="model-square-price mono">
              <div><span>输入</span><strong>{fmtPrice(model.inputPricePerMTok)}</strong></div>
              <div><span>输出</span><strong>{fmtPrice(model.outputPricePerMTok)}</strong></div>
            </div>
            <div className="model-square-meta mono">
              <span>upstream</span>
              <strong>{model.upstreamModel}</strong>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="model-detail-backdrop" onClick={() => setSelected(null)}>
          <section className={`model-detail-panel ${selected.provider}`} onClick={event => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="model-detail-title">
            <div className="model-detail-head">
              <div>
                <span className={`type-pill ${selected.provider}`}>{selected.provider}</span>
                <h2 id="model-detail-title">{selected.displayName}</h2>
              </div>
              <button className="model-detail-close" onClick={() => setSelected(null)} type="button" aria-label="关闭模型详情">×</button>
            </div>

            <div className="model-detail-copyline mono">
              <span>{selected.model}</span>
              <button type="button" onClick={() => copy("模型 ID", selected.model)}>{copied === "模型 ID" ? "已复制" : "复制模型 ID"}</button>
            </div>

            <div className="model-detail-facts mono">
              <div><span>Base URL</span><strong>{selected.provider === "openai" ? `${baseUrl}/v1` : baseUrl}</strong></div>
              <div><span>Endpoint</span><strong>{selected.provider === "openai" ? "/v1/chat/completions" : "/v1/messages"}</strong></div>
              <div><span>Upstream</span><strong>{selected.upstreamModel}</strong></div>
              <div><span>输入单价</span><strong>{fmtPrice(selected.inputPricePerMTok)}</strong></div>
              <div><span>输出单价</span><strong>{fmtPrice(selected.outputPricePerMTok)}</strong></div>
              {hasPrice(selected) && <div><span>缓存</span><strong>读 {fmtPrice(selected.cacheReadPricePerMTok)} · 写 {fmtPrice(selected.cacheCreationPricePerMTok)}</strong></div>}
            </div>

            <ModelSnippet model={selected} baseUrl={baseUrl} copied={copied} onCopy={copy} />

            <div className="model-detail-actions">
              <button className="btn ghost" type="button" onClick={() => copy("Base URL", selected.provider === "openai" ? `${baseUrl}/v1` : baseUrl)}>
                {copied === "Base URL" ? "已复制 Base URL" : "复制 Base URL"}
              </button>
              <Link className="btn primary" href="/docs">查看完整文档</Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ModelSnippet({ model, baseUrl, copied, onCopy }: { model: PublicModel; baseUrl: string; copied: string; onCopy: (label: string, value: string) => void }) {
  const snippet = useMemo(() => model.provider === "openai"
    ? `curl -X POST ${baseUrl}/v1/chat/completions \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer ${API_KEY}" \\
  -d '{
    "model": "${model.model}",
    "messages": [{ "role": "user", "content": "hello" }]
  }'`
    : `curl -X POST ${baseUrl}/v1/messages \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer ${API_KEY}" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "${model.model}",
    "max_tokens": 512,
    "messages": [{ "role": "user", "content": "hello" }]
  }'`, [baseUrl, model]);

  return (
    <div className="model-detail-snippet">
      <div className="model-detail-snippet-head">
        <span className="mono">curl</span>
        <button type="button" onClick={() => onCopy("调用示例", snippet)}>{copied === "调用示例" ? "已复制" : "复制调用示例"}</button>
      </div>
      <pre className="mono"><code>{snippet}</code></pre>
    </div>
  );
}
