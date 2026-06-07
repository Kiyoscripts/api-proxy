# 功能增强路线图设计文档

## Background & Goals

- 当前系统已具备 API Key、渠道、真实中转、日志、统计、模型列表、模型映射、健康检查和并发限制等核心能力。
- 后续目标是逐步增强稳定性、可观测性、映射管理、限额控制、运维能力和部署能力。
- 成功标准：每个增强项都能独立交付、可验证、可回滚，不影响现有 Claude/OpenAI 中转主链路。

## High-Level Design

- 管理体验增强：围绕映射、渠道、日志、导出和审计补齐 UI 与 API。
- 转发稳定性增强：围绕路由选择、重试、限额、限速、熔断提升线上稳定性。
- 运维部署增强：围绕多实例、后台任务、鉴权、隐私策略提升部署边界。
- 协议能力增强：最后考虑 OpenAI 与 Claude 跨协议转换，独立设计，不混入基础代理逻辑。

## Implementation Plan

### Stage 1: 模型映射可观测性

- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`, `lib/proxy.ts`, `lib/log-generator.ts`, `components/logs/log-stream.tsx`, `components/mappings/mappings-table.tsx`
- **Specific logic**: 请求日志记录 `inbound_model`、`upstream_model`、`mapping_id`、`mapped_channel_ids`；映射表显示绑定渠道名称而不是数量。
- **Validation**: 创建映射后请求 `/v1/messages` 或 `/v1/chat/completions`，确认日志展示入站模型和上游模型差异；映射表显示渠道名。

### Stage 2: 模型映射管理增强

- **Files modified**: `app/api/model-mappings/route.ts`, `app/api/model-mappings/[id]/route.ts`, `components/mappings/mappings-table.tsx`, `app/globals.css`
- **Specific logic**: 支持编辑映射；批量创建失败时展示具体失败模型和原因；绑定渠道为空表示全部渠道，非空时校验渠道服务商一致。
- **Validation**: 编辑映射后代理使用新上游模型；重复入站模型批量创建时 UI 展示失败详情。

### Stage 3: `/v1/models` 调试日志环境变量化

- **Files modified**: `app/v1/models/route.ts`
- **Specific logic**: 默认关闭 `[models] request/response` 日志，仅当 `DEBUG_MODELS=1` 时输出，不打印完整密钥。
- **Validation**: 未设置环境变量时无调试日志；设置后输出脱敏日志。

### Stage 4: 渠道路由与重试策略优化

- **Files modified**: `lib/proxy.ts`, `lib/channel-queue.ts`, `lib/db/schema.ts`, `lib/db/index.ts`, `components/channels/channel-form.tsx`
- **Specific logic**: 渠道并发满时优先尝试其他未满候选；新增可配置重试策略，包括最大重试次数、可重试状态码、429/5xx/超时策略。
- **Validation**: 构造多个渠道，一个满载时请求落到其他未满渠道；上游 5xx 或超时按配置 fallback。

### Stage 5: 渠道测试历史

- **Files modified**: `app/api/channels/[id]/test-logs/route.ts`, `components/channels/channels-table.tsx`, `app/globals.css`
- **Specific logic**: 渠道页增加测试历史弹窗，展示测试时间、成功/失败、延迟、测试模型、错误摘要。
- **Validation**: 手动测试和定时测试后，历史弹窗能看到最新记录。

### Stage 6: API Key 配额、限速与并发限制

- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`, `lib/proxy.ts`, `components/keys/key-form.tsx`, `components/keys/keys-table.tsx`
- **Specific logic**: 配额超额返回 429；支持 RPM、TPM、并发数；按 Claude/OpenAI 可扩展为独立限制。
- **Validation**: 构造低配额 key 请求，超额后返回 429；并发超过阈值时排队或拒绝。

### Stage 7: 成本统计

- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`, `lib/stats.ts`, `app/dashboard/page.tsx`, `app/rankings/page.tsx`
- **Specific logic**: 模型单价配置；按 token 统计 API Key、渠道、模型成本；可选展示毛利。
- **Validation**: 写入带 token 的请求日志后，Dashboard 和排行榜显示成本数据。

### Stage 8: 渠道自动熔断

- **Files modified**: `lib/channel-monitor.ts`, `lib/channel-health.ts`, `lib/proxy.ts`, `lib/db/schema.ts`, `components/channels/channels-table.tsx`
- **Specific logic**: 连续失败 N 次自动熔断；连续成功 N 次自动恢复；熔断渠道不参与转发。
- **Validation**: 模拟连续失败后渠道状态变为熔断；恢复成功后重新参与路由。

### Stage 9: 导入导出与审计补全

- **Files modified**: `app/api/export/route.ts`, `app/api/import/route.ts`, `app/api/audit/route.ts`, key/channel/mapping write APIs`
- **Specific logic**: 支持配置导入导出，密钥默认脱敏；所有关键写操作写审计日志；请求日志、渠道测试、审计日志支持 CSV/JSON 导出。
- **Validation**: 导出后重新导入到空库可恢复配置；关键操作均出现在审计页。

### Stage 10: 运维部署增强

- **Files modified**: `lib/channel-monitor.ts`, `lib/channel-queue.ts`, deployment config files`
- **Specific logic**: 多实例使用 Redis 或 DB 锁；渠道监控拆成后台 worker；SSE 日志广播支持多实例。
- **Validation**: 启动两个实例时不重复执行监控；并发限制在实例间一致。

### Stage 11: 管理端鉴权与隐私策略

- **Files modified**: `middleware.ts`, `app/login/page.tsx`, `lib/auth.ts`, `lib/proxy.ts`, `components/logs/log-stream.tsx`
- **Specific logic**: 增加登录、Session、CSRF、IP allowlist；请求体 preview 可配置开关、长度、敏感字段脱敏。
- **Validation**: 未登录访问管理页跳转登录；关闭 body preview 后失败日志不记录请求体摘要。

### Stage 12: OpenAI/Claude 协议转换

- **Files modified**: `lib/protocol/openai-to-claude.ts`, `lib/protocol/claude-to-openai.ts`, `lib/proxy.ts`, route handlers`
- **Specific logic**: 支持 OpenAI 入站转 Claude 上游、Claude 入站转 OpenAI 上游；处理消息、工具调用、流式事件和 usage 映射。
- **Validation**: 用 OpenAI SDK 请求 Claude 渠道、Claude SDK 请求 OpenAI 渠道均能返回符合调用方协议的响应。

## Testing Strategy

- Happy path tests: 每个阶段至少覆盖一个 UI 操作、一个 API 调用、一个代理链路验证。
- Error path tests: 重复映射、无渠道、超额、限速、上游 5xx、超时、熔断、未登录访问。
- Regression scope: `/v1/messages`、`/v1/chat/completions`、`/v1/models`、Dashboard、日志页、渠道页、密钥页、映射页。

## Risks & Mitigation

- 功能范围较大：按阶段实施，每阶段独立验证，不跨阶段批量改动。
- 数据结构演进较多：每个新字段都通过 PostgreSQL schema migration/push 保留默认值。
- 限速/熔断可能误伤请求：先只做可配置且默认关闭，再逐步启用。
- 多实例改造复杂：独立阶段处理，不影响单实例默认部署。
- 协议转换复杂度高：最后实施，先保持同协议中转稳定。
