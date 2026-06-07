# 用户端 / 管理端隔离设计文档

## Background & Goals

- 当前系统有用户、Key 归属和用户额度，但管理端接口基本返回全局数据。
- 目标是把用户端与管理端切分：普通用户只能查看和管理自己的 Key、日志、用量；管理员可查看全部，并按用户筛选。
- Key 归属未来不可变，历史日志可通过 `request_logs.key_id -> keys.user_id` 稳定归属，不需要向 `request_logs` 冗余 `user_id`。

## High-Level Design

- 身份层：新增 `lib/auth.ts`，统一提供当前用户和角色判断。
- 作用域层：新增 `lib/scope.ts`，统一把 `currentUser + requestedUserId` 转换成查询范围。
- API 层：所有用户敏感接口先取当前用户，再按角色应用作用域。
- UI 层：用户端保留 `/dashboard`、`/keys`、`/logs`、`/account`、`/docs`；管理端迁移到 `/admin/*`。
- 数据流：日志、统计、导出均通过 Key 归属过滤；管理员可选择用户过滤。

## Implementation Plan

### Stage 1: 身份与作用域基础

- **Files modified**: `lib/auth.ts`, `lib/scope.ts`
- **Specific logic**: 当前用户优先从 `x-user-id` header 或 `userId` cookie 读取；缺省回退首个启用用户。提供 `requireUser()`、`requireAdmin()`、`isAdmin()`、`scopedUserId()`。
- **Validation**: 用不同 header/cookie 手动请求接口，确认普通用户和管理员路径返回不同范围。

### Stage 2: API Key 隔离

- **Files modified**: `app/api/keys/route.ts`, `app/api/keys/[id]/route.ts`, `components/keys/key-form.tsx`, `components/keys/keys-table.tsx`, `app/keys/page.tsx`, `app/admin/keys/page.tsx`
- **Specific logic**: 普通用户只返回自己的 Key，创建时强制绑定当前用户；管理员可看全部、按 `userId` 筛选、创建到指定用户。禁止修改 Key 归属。
- **Validation**: 普通用户不能访问/删除他人 Key；管理员可按用户筛选。

### Stage 3: 日志、SSE、导出隔离

- **Files modified**: `app/api/logs/route.ts`, `app/api/logs/stream/route.ts`, `components/logs/log-stream.tsx`, `app/logs/page.tsx`, `app/admin/logs/page.tsx`, `app/api/export/route.ts`
- **Specific logic**: 普通用户日志按 Key 归属过滤；管理员可传 `userId`。SSE 推送同样过滤，不能只过滤初始列表。
- **Validation**: 普通用户看不到其他用户请求日志；导出结果与页面列表一致。

### Stage 4: 统计与 Dashboard 拆分

- **Files modified**: `lib/stats.ts`, `app/dashboard/page.tsx`, `app/admin/dashboard/page.tsx`, `app/api/stats/route.ts`
- **Specific logic**: 统计函数支持 `{ userId?: string }`，用户端只聚合自身，管理端默认全局并支持用户筛选。
- **Validation**: 同一时间范围下用户端请求数小于等于管理端全局请求数；管理员选择用户后与用户端一致。

### Stage 5: 管理专属路由迁移

- **Files modified**: `app/admin/*`, `components/nav-tabs.tsx`
- **Specific logic**: 管理全局配置页面迁移到 `/admin/*`，旧全局页面仅保留用户端必要入口或重定向。
- **Validation**: 普通用户导航不出现管理入口；管理员可进入管理页面。

### Stage 6: 管理 API 守卫

- **Files modified**: `app/api/channels/*`, `app/api/model-mappings/*`, `app/api/model-prices/*`, `app/api/settings/route.ts`, `app/api/users/*`, `app/api/activity/route.ts`, `app/api/config/*`, `app/api/worker/*`
- **Specific logic**: 全局资源管理接口加 `requireAdmin()`；普通用户读取自己的资料走 `/api/me`。
- **Validation**: 普通用户调用管理接口返回 403；管理员正常。

## Testing Strategy

- Happy path tests: 管理员查看全局 Key/日志/统计，普通用户查看自己的 Key/日志/统计。
- Error path tests: 普通用户访问他人 Key、用户列表、渠道配置、审计日志返回 403 或过滤为空。
- Regression scope: 代理请求、用量累计、用户额度限制、日志流、配置导出。

## Risks & Mitigation

- 当前没有真实登录系统：先用可替换的 header/cookie 会话层，后续登录只替换 `lib/auth.ts`。
- SSE 容易漏过滤：和普通日志 API 共享作用域判断。
- 导出接口可能绕过 UI：导出接口独立做权限与作用域校验。
- Key 归属不可变：不提供修改 Key `userId` 的 API，避免历史日志归属变化。
