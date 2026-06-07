# 渠道最大并发与排队 Design Document

## Background & Goals
- 问题：当前同一渠道可以无限并发调用上游，容易触发上游限流或连接耗尽。
- 目标：每个渠道可配置最大并发量；超过最大并发量时，请求在该渠道内排队等待。
- 成功标准：渠道表单可配置并发；代理请求选中渠道后遵守该渠道并发限制；请求结束后释放槽位。

## High-Level Design
- 数据层：`channels` 增加 `max_concurrency`，默认 `0` 表示不限制。
- UI/API：渠道新增和编辑都读写该字段，列表展示当前配置。
- 代理层：新增进程内按渠道 ID 分组的 FIFO 队列；调用上游前 `acquire`，成功/失败/流结束后 `release`。

## Implementation Plan

### Stage 1: 数据字段
- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`
- **Specific logic**: 增加 `maxConcurrency` schema 字段和 PostgreSQL schema 更新。
- **Validation**: 访问页面触发迁移后检查 `PRAGMA table_info(channels)`。

### Stage 2: API 与 UI
- **Files modified**: `app/api/channels/route.ts`, `app/api/channels/[id]/route.ts`, `components/channels/channel-form.tsx`, `components/channels/channels-table.tsx`
- **Specific logic**: 新建/编辑渠道读写最大并发；列表展示 `不限` 或具体数值。
- **Validation**: `/channels` 页面 200；保存渠道后 API 返回字段正确。

### Stage 3: 代理并发控制
- **Files modified**: `lib/proxy.ts`, optionally `lib/channel-queue.ts`
- **Specific logic**: 按渠道 ID 维护 `active` 和 `queue`；`maxConcurrency <= 0` 不限制；请求结束或失败时释放。
- **Validation**: 类型检查；人工设置渠道并发为 1 后并发请求按队列等待。

## Testing Strategy
- Happy path: 未设置最大并发的渠道行为不变；设置为 1 后请求串行进入上游。
- Error path: 上游失败、客户端取消、流式结束都释放并发槽。
- Regression scope: 渠道新增/编辑、代理转发、日志记录。

## Risks & Mitigation
- 风险：进程内队列只在单实例内有效，多实例部署无法全局限流。
- 缓解：当前项目是本地/单实例内部工具；如需多实例，后续改 Redis 分布式信号量。
- 回滚：将 `max_concurrency` 设为 `0` 即恢复不限制。
