# 礼品卡 Design Document

## Background & Goals
- 管理员需要生成一次性礼品卡，用于给用户账户增加美元额度。
- 用户需要在控制台输入礼品卡码并核销，核销成功后增加自己的 `quotaUsd`。
- 成功标准：礼品卡只能核销一次；管理员能看到生成和核销状态；PostgreSQL runtime 可用。

## High-Level Design
- 新增 `gift_cards` 表保存卡号哈希、显示前缀/后缀、金额、状态、创建人、核销人和时间。
- 管理端页面 `/gift-cards` 生成和查看礼品卡。
- 用户端页面 `/gift-cards/redeem` 核销礼品卡。
- 核销时在同一请求中校验卡状态并增加用户 `user_quotas.quotaUsd`。

## Implementation Plan

### Stage 1: Data Model
- **Files modified**: `lib/db/schema.ts`, `lib/db/pg-schema.ts`, `lib/db/index.ts`
- **Specific logic**: 新增 `gift_cards` 表，字段包括 `id`、`codeHash`、`codePrefix`、`codeSuffix`、`amountUsd`、`status`、`createdBy`、`redeemedBy`、`redeemedAt`、`createdAt`。
- **Validation**: PG `db:pg:push` 可同步 schema。
- **Current status**: 已完成，`gift_cards` 表已加入 PG schema，本地 PG schema 已 push。

### Stage 2: APIs
- **Files modified**: `app/api/gift-cards/route.ts`, `app/api/gift-cards/redeem/route.ts`
- **Specific logic**: 管理员生成/列表；用户核销并增加 `quotaUsd`。
- **Validation**: 未登录返回 401，普通用户不能生成，重复核销返回 409。
- **Current status**: 已完成，`GET/POST /api/gift-cards` 和 `POST /api/gift-cards/redeem` 已实现。

### Stage 3: UI
- **Files modified**: `app/gift-cards/page.tsx`, `app/gift-cards/redeem/page.tsx`, `components/nav-tabs.tsx`, `app/globals.css`
- **Specific logic**: 管理员生成卡并展示明文一次；用户输入卡号核销。
- **Validation**: 生成后列表出现未核销卡；用户核销后额度增加。
- **Current status**: 已完成，新增 `/gift-cards` 管理页和 `/gift-cards/redeem` 用户核销页。

## Testing Strategy
- Happy path：管理员生成 10 美元卡，用户核销，用户额度增加 10。
- Error path：空卡号、金额非法、重复核销、普通用户访问管理 API。
- Regression scope：用户额度页、Dashboard 额度展示、审计日志。

## Risks & Mitigation
- 明文卡号不能长期保存。缓解：数据库只保存哈希，生成响应只返回一次明文。
- 并发重复核销可能导致重复加额。缓解：按状态更新并二次检查；PG 后续可加事务/行锁增强。
- 高并发重复核销。缓解：后续使用 PG transaction/row lock 强化一次性语义。
