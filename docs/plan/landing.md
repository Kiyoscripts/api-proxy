# api-proxy 落地：Next.js + Bun 全栈设计

## 背景与目标

原 `index.html` 是 1320 行的单文件演示，仅有前端 mock 数据。本次「落地」要求把整套 UI 改造为 **Next.js 15 + Bun + PostgreSQL** 全栈项目：

- **真实数据**：key、channel、request log 写入 PostgreSQL
- **真实 API**：REST 风格的 `route.ts` 处理 CRUD
- **真实时流**：SSE 推送请求日志到浏览器
- **保留设计**：终端暗色、OKLCH token、不破坏视觉

不在范围内：鉴权（v1 假设内部工具，无登录）、多租户、可观测性。

## 架构

```
浏览器
  │  HTTP / SSE
  ▼
Next.js App Router (Node 24)
  ├─ Server Components  → 直读 PostgreSQL（Drizzle）
  ├─ Client Components  → 交互（表单、过滤、SSE 订阅）
  └─ API Route Handlers → CRUD + SSE
        │
        ▼
   PostgreSQL                     ┌─ Log Generator（单例）
        ▲                          │  - 1.1s 节奏模拟请求
        └──── Drizzle ORM ─────────┘  - 推送至 SSE 订阅者
```

## 目录结构

```
api-proxy/
├── package.json
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
├── .gitignore
├── README.md
├── lib/db/                    # PostgreSQL schema + connection
├── app/
│   ├── layout.tsx             # 根布局：Topbar + Nav
│   ├── globals.css            # 全部样式（原 index.html 内联样式迁移）
│   ├── page.tsx               # → /dashboard
│   ├── dashboard/page.tsx     # 服务端
│   ├── keys/page.tsx          # 服务端外壳 + 客户端表
│   ├── channels/page.tsx      # 服务端外壳 + 客户端表
│   ├── logs/page.tsx          # 服务端外壳 + 客户端 SSE
│   └── api/
│       ├── keys/route.ts          # GET 列表 / POST 生成
│       ├── keys/[id]/route.ts     # PATCH 启停
│       ├── channels/route.ts      # GET / POST
│       ├── channels/[id]/route.ts # PATCH / DELETE
│       ├── stats/route.ts         # Dashboard 数据聚合
│       ├── activity/route.ts      # 近期动态
│       ├── logs/route.ts          # 历史日志
│       └── logs/stream/route.ts   # SSE 实时流
├── components/
│   ├── topbar.tsx
│   ├── nav-tabs.tsx
│   ├── page-head.tsx
│   ├── stat-strip.tsx
│   ├── status-dot.tsx
│   ├── toast.tsx              # 全局 toast provider
│   ├── keys/
│   │   ├── keys-table.tsx
│   │   ├── key-form.tsx
│   │   └── key-search.tsx
│   ├── channels/
│   │   ├── channels-table.tsx
│   │   └── channel-form.tsx
│   └── logs/
│       ├── log-stream.tsx
│       └── log-filter.tsx
└── lib/
    ├── db/
    │   ├── index.ts           # 单例连接
    │   ├── schema.ts          # tables
    │   └── seed.ts            # 演示数据
    ├── types.ts
    ├── log-generator.ts       # SSE 推送源
    ├── stats.ts               # 聚合查询
    └── utils.ts               # 格式化、mask
```

## 数据模型

```ts
// lib/db/schema.ts (Drizzle)

keys
  id            text PK        // k_<rand>
  name          text           // 唯一
  prefix        text           // sk-relay-XXXX
  full_key      text           // 完整（不返回前端）
  status        text           // 'active' | 'disabled'
  quota         integer        // tokens/day, 0 = 不限
  created_at    integer (ms)
  last_used_at  integer (ms) | null
  used          real           // 累计 token (M)

channels
  id            text PK        // c_<n>
  name          text           // 唯一
  type          text           // 'claude' | 'openai'
  base_url      text
  api_key       text           // 不返回前端
  weight        integer
  models        text (JSON)    // string[]
  status        text           // 'ok' | 'warn' | 'err'
  p50_ms        integer
  err_rate      real           // 百分比
  enabled       integer (0/1)

request_logs
  id            integer PK auto
  ts            integer (ms)
  key_id        text FK
  channel_id    text FK
  model         text
  status        integer        // HTTP, 0 = 网络错误
  latency_ms    integer
  tokens_in     integer
  tokens_out    integer
  error_msg     text | null

activities
  id            integer PK auto
  ts            integer (ms)
  event         text
  actor         text
```

**Seed 策略**：首次启动（`data/api-proxy.db` 不存在时）写入演示数据；后续手动 `bun run db:reset` 重置。

## 实时日志流

```
启动时（首次访问 /logs 或 /api/logs/stream）
  ↓
启动 LogGenerator 单例（lib/log-generator.ts）
  - 1.1s tick 生成一条 mock 请求
  - 写入 request_logs
  - 通知所有 SSE 订阅者
  ↓
SSE route handler
  - 维护 Set<ReadableStreamDefaultController>
  - 接受新连接 → 推送 buffer（最近 50 条）+ 注册订阅
  - 客户端关闭 → 注销
  - 失败重试 1.5s
```

## API 约定

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/keys` | 列表，支持 `?status=&search=` |
| POST | `/api/keys` | 生成 key（返回 full_key 一次） |
| PATCH | `/api/keys/:id` | 启停、重命名 |
| GET | `/api/channels` | 列表 |
| POST | `/api/channels` | 新增 |
| PATCH | `/api/channels/:id` | 修改 weight / enabled / models |
| DELETE | `/api/channels/:id` | 删除 |
| POST | `/api/channels/:id/test` | 模拟测试 ping |
| GET | `/api/stats` | Dashboard stat 条 + 渠道流量 + 排行 |
| GET | `/api/activity` | 近期动态 |
| GET | `/api/logs?limit=&status=` | 历史日志（最多 200） |
| GET | `/api/logs/stream` | SSE 实时流 |

错误用 `{ error: string }` + 合适的状态码；前端用 toast 展示。

## UI 与原 HTML 对应关系

| 原 HTML 节点 | 落地位置 |
|---|---|
| `<header class="topbar">` | `components/topbar.tsx` + `nav-tabs.tsx` |
| Dashboard `<section>` | `app/dashboard/page.tsx` (server) + 客户端无 |
| Keys 表格 | `app/keys/page.tsx` (server fetch) → `keys-table.tsx` (client) |
| 行内表单 | `key-form.tsx` (client, `useState`) |
| Channels | 同 keys |
| Logs 实时流 | `log-stream.tsx` (EventSource client) |
| Toast | `components/toast.tsx` (context, 全局) |
| 全部 CSS | `app/globals.css`，token 与原文件一致 |

## 验证策略

1. `bun install` 成功
2. `bun run dev` 启动，`curl http://localhost:3000` 返回 200
3. 浏览器访问 /dashboard、/keys、/channels、/logs 视觉与原 HTML 接近
4. `curl http://localhost:3000/api/keys | jq` 返回 JSON
5. 打开 /logs，1.1s 节奏出现新行
6. Keys 页「生成」按钮触发 API，列表更新
7. Channels 页「测试」按钮 toast
8. 过滤 chip 切换，列表过滤

## 风险与回滚

- **风险 1**：PostgreSQL 连接或 schema 初始化失败。回滚：修正环境变量并重新执行 `db:pg:push`。
- **风险 2**：SSE 在 Next.js dev 模式偶发连接断。回滚：客户端加指数退避。
- **风险 3**：样式迁移丢失细节。回滚：保留 `index.html` 作为视觉基线对比。
