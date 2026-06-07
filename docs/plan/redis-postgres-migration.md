# PostgreSQL + Redis 高并发迁移设计文档

## Background & Goals
- 当前生产形态已切换为 Next.js 单体 + PostgreSQL + Redis。
- Docker 高并发和多副本部署下，PostgreSQL 承载持久数据，Redis 承载跨实例短期状态。
- 目标是迁移到 PostgreSQL 承载持久业务数据，Redis 承载跨实例的限流、并发、短期计数和调度锁。
- 成功标准：同一套 API 在多个 app 容器副本后仍能保持用户级限制、Key 限制、渠道并发限制一致；日志和统计数据可可靠写入 PostgreSQL。

## High-Level Design
- PostgreSQL：用户、Key、渠道、日志、价格、模型、设置、审计等持久化数据。
- Redis：RPM/TPM 窗口计数、用户/Key/渠道并发信号量、健康检查锁、可选 SSE fanout。
- App 容器：无本地状态，可横向扩容。
- Docker Compose：`app`、`postgres`、`redis` 三类服务，PostgreSQL 和 Redis 使用独立 volume。

## Implementation Plan

### Stage 1: Dependency And Environment
- **Files modified**: `package.json`, `docker-compose.yml`, `.env.example`, `lib/env.ts`
- **Specific logic**: 增加 PostgreSQL 与 Redis 连接配置，如 `DATABASE_URL`、`REDIS_URL`、`APP_SECRET`。
- **Validation**: app 启动时缺少必要环境变量应 fail fast；健康检查分别验证 DB 和 Redis 可达。

### Stage 2: PostgreSQL Data Layer
- **Files modified**: `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/pg-schema.ts`, `drizzle.pg.config.ts`
- **Specific logic**: 使用 `pgTable` schema 和 PostgreSQL driver 连接池，`lib/db` 默认导出 PG-only 数据层。
- **Validation**: 创建空库后能跑迁移；所有 API 查询通过 `npx tsc --noEmit` 和基础接口 smoke test。
- **Current status**: 已移除 SQLite schema、SQLite 连接、SQLite Drizzle 配置和 `better-sqlite3` 依赖；主应用运行时为 PG-only。

### Stage 3: Data Migration
- **Files modified**: `README.md`, `package.json`
- **Specific logic**: 线上和本地均按 PG-only 新库运行，不再保留 SQLite 导入脚本。
- **Validation**: 新环境通过 `db:pg:push` 初始化 schema 后启动应用。
- **Current status**: SQLite 导入脚本和相关 package scripts 已移除。

### Stage 4: Redis Concurrency And Rate Limit
- **Files modified**: `lib/key-queue.ts`, `lib/channel-queue.ts`, `lib/proxy.ts`, `lib/rate-limit.ts`
- **Specific logic**: 用 Redis 原子操作/Lua 脚本实现：
  - 用户 RPM/TPM 计数窗口。
  - Key RPM/TPM 计数窗口（如果后续仍保留后端能力）。
  - 用户/Key/渠道最大并发信号量，带 TTL 防止请求崩溃后永久占用。
  - 渠道健康检查分布式锁。
- **Validation**: 多 app 副本下压测同一用户，实际并发不超过配置；请求完成后并发计数归零。
- **Current status**: 用户/Key/渠道最大并发已通过 Redis sorted set 信号量接入；用户/Key RPM 已通过 Redis 原子计数接入；用户/Key TPM 已在请求完成记录 token 时累加到 Redis；渠道健康检查已通过 Redis lock 避免多实例重复测试；日志 SSE 已通过 Redis pub/sub 做跨实例 fanout。未配置 `REDIS_URL` 时会回退到旧逻辑。

### Stage 4.5: PostgreSQL Async Refactor Prerequisite
- **Files modified**: `lib/db/*`, all API routes and data helpers using Drizzle sync methods
- **Specific logic**: PostgreSQL driver 为 async，运行时路径使用 `await db...`；历史同步 fallback 不再作为部署路径。
- **Validation**: 每个页面/API 分组迁移后运行 `npx tsc --noEmit`，并做对应接口 smoke test。
- **Current status**: `settings` 已新增 async 双运行时版本，`GET/PATCH /api/settings`、站点信息、邮件发送、Topbar、LandingNav、proxy 入口和 `/v1/models` 调试开关已迁移到 async settings。深层日志 detail 仍保留 legacy sync settings，待 log-generator/proxy 全链路 PG 化时处理。
- **Auth/users status**: 登录、注册、邮箱验证、重发验证码、找回/重置密码、当前用户资料、用户管理 API 和用户额度 API 已支持 PG mode。
- **Keys status**: Key 管理 API、Key 页面计数、代理鉴权和 `/api/v1/usage/[key]` 已支持 PG mode。
- **Proxy/log status**: 代理 Key 鉴权、用户额度/限流 fallback、用户最大并发、渠道选择、模型映射、模型目录开关和请求详情设置读取已支持 PG mode；`logHub.recordAsync/updateAsync` 已支持 PG 写入 request logs，并同步更新 PG 中的 Key 用量和用户额度用量；成本价格查询已支持 PG mode。日志列表、SSE 用户作用域、导出、Dashboard/排行榜、用户详情统计、活动和渠道状态已支持 PG mode。
- **Channels status**: 管理端渠道 CRUD、渠道测试、测试历史、批量测试、模型拉取、健康检查写入和渠道页面计数已支持 PG mode。
- **Models/mappings/pricing status**: 模型目录 API、模型映射 API、模型定价 API 和 `/v1/models` 模型列表已支持 PG mode。模型页/映射页/定价页通过 API 读写，因此管理端配置与代理读取已在 PG mode 下闭环。
- **Config/health/worker status**: 配置导入导出、健康检查和渠道监控定时器已支持 PG mode。

### Stage 5: Logging And Statistics
- **Files modified**: `lib/log-generator.ts`, `lib/stats.ts`, `lib/user-stats.ts`, `app/api/logs/*`
- **Specific logic**: 高频日志写 PostgreSQL；为 `request_logs.ts`、`key_id`、`channel_id`、`model` 建索引；必要时分批聚合统计。
- **Validation**: 10k+ 日志下 Dashboard、日志页、用户详情页查询仍在可接受延迟内。
- **Current status**: 请求日志写入、日志列表、日志 SSE 用户过滤、日志/活动/渠道测试导出、Dashboard、排行榜、用户详情统计、活动日志和渠道状态页已接入 async PG mode；高数据量索引、分页和聚合性能仍待真实数据压测。

### Stage 6: Docker Multi-Replica Deployment
- **Files modified**: `Dockerfile`, `docker-compose.yml`, `README.md`
- **Specific logic**: Compose 增加 `postgres` 和 `redis`，app 可通过 `--scale api-proxy=2` 横向扩容。
- **Validation**: 两个 app 副本后请求轮询到不同实例，限流、并发和日志仍一致。
- **Current status**: Compose 已加入 Redis 和 PostgreSQL 服务；主要运行时路径已支持 PG mode，但 scale 前仍需要真实 Docker PG/Redis smoke test、迁移数据校验和并发压测。

## Testing Strategy
- Happy path tests：登录、创建用户、创建 Key、配置渠道、调用 OpenAI/Claude、查看日志和统计。
- Error path tests：Redis 不可用、PostgreSQL 不可用、并发超限、RPM/TPM 超限、渠道超并发。
- Regression scope：认证、邮箱、设置、导入导出、日志 SSE、模型列表、模型映射、成本统计。

## Risks & Mitigation
- PostgreSQL 字段类型或索引设计不合理可能影响高数据量查询。缓解：真实数据压测后补索引/分区。
- Redis 信号量若没有 TTL，异常中断会造成并发泄漏。缓解：所有占位都带 TTL，请求结束显式释放。
- 流式请求持续时间长，并发 slot 需要覆盖整个流生命周期。缓解：代理层统一在 response close/finally 释放。
- PostgreSQL 日志表增长快。缓解：索引设计、归档策略、按时间清理或分区作为后续阶段。
- 多副本 SSE 日志流可能只看到当前实例事件。缓解：短期通过轮询数据库；长期用 Redis pub/sub fanout。

## Rollback Plan
- 发布前保留 PostgreSQL 备份。
- Docker 镜像和 Compose 环境变量可回滚到上一版本镜像。
