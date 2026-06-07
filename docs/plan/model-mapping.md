# 模型映射 Design Document

## Background & Goals
- 问题：调用方使用的入站模型名不一定和上游渠道模型名一致，需要在代理层做映射。
- 目标：提供独立页面维护 `provider + 入站模型 -> 上游模型`，代理调用时自动替换上游模型。
- 成功标准：可创建/删除模型映射；代理按接口类型应用映射；未配置映射时保持原模型名。

## High-Level Design
- 数据层：新增 `model_mappings` 表。
- API：提供列表、创建、删除接口。
- 代理层：解析入站 `model` 后，按 `type + inboundModel` 查映射，命中则使用 `upstreamModel` 做渠道选择和上游请求。
- UI：新增 `/mappings` 页面，以表格形式展示映射并通过弹窗创建。

## Implementation Plan

### Stage 1: 数据字段
- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`
- **Specific logic**: 增加 `modelMappings` schema 和建表 SQL。
- **Validation**: 访问页面后检查表存在。

### Stage 2: API
- **Files modified**: `app/api/model-mappings/route.ts`, `app/api/model-mappings/[id]/route.ts`
- **Specific logic**: GET 列表、POST 创建、DELETE 删除。
- **Validation**: curl 创建/查询/删除。

### Stage 3: 代理应用映射
- **Files modified**: `lib/proxy.ts`
- **Specific logic**: 入站模型用于日志/请求语义；上游模型用于选择渠道和请求上游。
- **Validation**: 创建映射后调用入站模型，日志显示映射后上游请求成功。

### Stage 4: UI
- **Files modified**: `app/mappings/page.tsx`, `components/mappings/mappings-table.tsx`, `components/nav-tabs.tsx`
- **Specific logic**: 独立页面、创建弹窗、删除确认。
- **Validation**: `/mappings` 200，创建/删除生效。

## Testing Strategy
- Happy path: 创建 Claude 映射后 Claude 请求使用上游模型。
- Error path: 重复映射返回 409；缺字段返回 400。
- Regression scope: 原无映射请求不变，渠道模型匹配仍正常。

## Risks & Mitigation
- 风险：日志只显示一个模型名可能让排查混淆。
- 缓解：先记录上游模型名；后续如需要可增加入站模型字段。
- 回滚：删除映射即可恢复原模型名。
