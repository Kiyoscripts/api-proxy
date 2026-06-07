# 渠道定时监控 Design Document

## Background & Goals
- 问题：渠道健康只能手动测试，无法持续观察状态变化。
- 目标：每个渠道可设置定时监控间隔，例如 15 秒自动测试一次；结果写入测试历史并更新渠道健康状态。
- 成功标准：渠道配置可设置监控间隔；启用渠道会按配置自动测试；总览卡片底部竖线展示自动测试结果。

## High-Level Design
- 数据层：`channels` 新增 `monitor_interval_sec`，默认 `0` 表示关闭定时监控。
- 测试逻辑：抽取真实 `HEAD` 探测函数，单测、批量测试和定时任务复用。
- 调度器：进程内 `setInterval` 每 1 秒扫描启用且配置间隔的渠道，达到间隔则执行测试。
- 启动点：通过 dashboard/channels/API 访问时初始化调度器，避免额外后台进程。

## Implementation Plan

### Stage 1: 数据字段
- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`
- **Specific logic**: 增加 `monitorIntervalSec` 字段和 PostgreSQL schema 更新。
- **Validation**: `PRAGMA table_info(channels)` 包含字段。

### Stage 2: 测试逻辑复用
- **Files modified**: `lib/channel-health.ts`, `app/api/channels/[id]/test/route.ts`, `app/api/channels/test-all/route.ts`
- **Specific logic**: 抽取 `testChannel()`，负责 ping、更新 channels、写 channel_test_logs。
- **Validation**: 手动测试和批量测试结果保持一致。

### Stage 3: 定时调度
- **Files modified**: `lib/channel-monitor.ts`
- **Specific logic**: 全局单例调度器，按每个渠道 interval 和 lastRun 控制测试频率。
- **Validation**: 设置 15 秒后能看到测试历史新增竖线。

### Stage 4: API 与 UI
- **Files modified**: `app/api/channels/route.ts`, `app/api/channels/[id]/route.ts`, `components/channels/channel-form.tsx`, `components/channels/channels-table.tsx`
- **Specific logic**: 新增/编辑渠道可配置监控间隔，列表展示关闭或秒数。
- **Validation**: `/channels` 页面保存后字段正确。

## Testing Strategy
- Happy path: 监控间隔 15 秒时自动产生测试日志。
- Error path: 上游不可达时写失败日志并更新状态为 `err`。
- Regression scope: 手动测试、批量测试、渠道健康卡片、渠道编辑表单。

## Risks & Mitigation
- 风险：进程内调度器只在单实例有效，多实例会重复测试。
- 缓解：当前内部单实例工具可接受；多实例后改为外部调度或分布式锁。
- 回滚：将 `monitor_interval_sec` 设为 `0` 即关闭。
