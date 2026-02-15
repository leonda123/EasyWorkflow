# EasyWorkflow 后端技术规格说明书 (Backend Technical Specification)

## 1. 项目概述 (Project Overview)
**EasyWorkflow** 是一个高性能、企业级低代码工作流编排引擎。后端核心职责是管理工作流元数据、处理复杂的有向无环图 (DAG) 执行逻辑、管理异步任务队列、以及提供实时运行状态反馈。

本方案基于前端 (React + Zustand + ReactFlow) 现有的数据模型反向设计，确保前后端数据结构的一致性。

---

## 2. 技术栈 (Tech Stack)

*   **Runtime**: Node.js v20+ (LTS)
*   **Framework**: **NestJS v10+** (模块化架构，强依赖注入)
*   **Language**: TypeScript 5.x
*   **Database**: **PostgreSQL 16+** (存储元数据、JSONB 图结构)
*   **ORM**: **Prisma** (Schema-first，类型安全)
*   **Queue & Cache**: **Redis 7+** + **BullMQ** (处理异步任务、延时任务、并发控制)
*   **Realtime**: **Socket.io** (用于前端 `RunTracePanel` 的实时日志推送)
*   **Sandbox**: **isolated-vm** (用于安全执行 `PROCESS` 节点的自定义 JS 代码)
*   **Validation**: **Zod** (配合 NestJS Pipes 做运行时校验)
*   **AI Integration**: **@google/genai** (用于 LLM 节点)

---

## 3. 数据库设计 (Database Schema - Prisma)

此 Schema 必须与前端 `types.ts` 中的接口保持逻辑一致。

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------
// Identity & Access Management (IAM)
// ----------------------------------------

model User {
  id            String       @id @default(uuid())
  email         String       @unique
  passwordHash  String
  name          String
  avatarUrl     String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  memberships   TeamMember[]
  ownedTeams    Team[]       @relation("TeamOwner")
  
  // 仅记录手动触发的操作者
  triggeredExecutions Execution[] 
}

model Team {
  id            String       @id @default(uuid())
  name          String
  slug          String       @unique
  avatarColor   String?      // e.g. "bg-blue-600"
  ownerId       String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  owner         User         @relation("TeamOwner", fields: [ownerId], references: [id])
  members       TeamMember[]
  workflows     Workflow[]
  apiKeys       ApiKey[]
}

enum MemberRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

model TeamMember {
  id        String     @id @default(uuid())
  userId    String
  teamId    String
  role      MemberRole @default(VIEWER)
  joinedAt  DateTime   @default(now())

  user      User       @relation(fields: [userId], references: [id])
  team      Team       @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId])
}

// ----------------------------------------
// API Keys
// ----------------------------------------

model ApiKey {
  id          String    @id @default(uuid())
  teamId      String
  workflowId  String?   // Null = Global Team Key; Not Null = Workflow Specific Key
  name        String
  maskedKey   String    // 显示用: sk_live_...xxxx
  secretHash  String    // 鉴权用: bcrypt hash
  status      String    @default("active") // active, revoked
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())

  team        Team      @relation(fields: [teamId], references: [id])
  workflow    Workflow? @relation(fields: [workflowId], references: [id])
}

// ----------------------------------------
// Workflow Definition
// ----------------------------------------

enum WorkflowStatus {
  DRAFT
  ACTIVE
  INACTIVE
}

model Workflow {
  id          String         @id @default(uuid())
  teamId      String
  name        String
  description String?
  status      WorkflowStatus @default(DRAFT)
  
  // 版本号逻辑
  version     Float          @default(0.1)
  versionStr  String         @default("0.1.0")

  // 核心图定义 (React Flow Nodes/Edges)
  // 结构: { nodes: NodeData[], edges: Edge[] }
  definition  Json           @default("{}")
  
  // 统计数据 (Denormalized for performance)
  runsCount   Int            @default(0)
  successRate Float          @default(0)
  
  // 触发器配置缓存 (用于快速查询 Cron/Webhook)
  cronConfig  String?        // Cron expression if schedule trigger exists
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  team        Team           @relation(fields: [teamId], references: [id])
  versions    WorkflowVersion[]
  executions  Execution[]
  apiKeys     ApiKey[]
}

model WorkflowVersion {
  id          String   @id @default(uuid())
  workflowId  String
  versionStr  String   // e.g. "1.2.0"
  definition  Json     // Snapshot of graph
  description String?  // Release notes
  authorName  String
  createdAt   DateTime @default(now())

  workflow    Workflow @relation(fields: [workflowId], references: [id])
}

// ----------------------------------------
// Execution Engine (Logs)
// ----------------------------------------

enum ExecutionStatus {
  RUNNING
  SUCCESS
  FAILED
}

enum TriggerType {
  MANUAL
  WEBHOOK
  SCHEDULE
  PARTIAL
}

model Execution {
  id            String          @id @default(uuid())
  workflowId    String
  teamId        String          // 冗余，方便查询
  triggerUserId String?
  
  status        ExecutionStatus @default(RUNNING)
  triggerType   TriggerType
  
  startTime     DateTime        @default(now())
  endTime       DateTime?
  duration      Int?            // ms
  
  // 初始输入 (Context Root)
  inputData     Json?           // { body: ..., query: ..., headers: ... }

  workflow      Workflow        @relation(fields: [workflowId], references: [id])
  user          User?           @relation(fields: [triggerUserId], references: [id])
  steps         ExecutionStep[]
}

model ExecutionStep {
  id            String    @id @default(uuid())
  executionId   String
  
  nodeId        String    // React Flow Node ID
  nodeLabel     String
  nodeType      String    // NodeType enum string
  
  status        String    // success, failed, running, skipped
  startTime     DateTime  @default(now())
  endTime       DateTime?
  duration      Int?      // ms
  
  // 关键：步骤输出，用于被后续节点引用 {{steps.nodeId.data}}
  outputData    Json?     
  
  // 日志与错误
  logs          String[]  
  errorMessage  String?

  execution     Execution @relation(fields: [executionId], references: [id])
}
```

---

## 4. 核心执行引擎逻辑 (The Engine)

这是后端最复杂的部分。引擎必须是**异步**、**基于队列**的。

### 4.1 架构组件
1.  **Orchestrator (编排器)**: 接收触发请求，创建 `Execution`，分析 DAG (有向无环图)，找出入口节点。
2.  **Dispatcher (调度器)**: 将准备就绪的节点任务推入 `BullMQ`。
3.  **Worker (执行者)**: 从 `BullMQ` 消费任务，执行具体业务逻辑，更新数据库。

### 4.2 数据流转 (Workflow Context)
每个工作流执行维护一个 `Context` 对象。
```typescript
interface WorkflowContext {
  trigger: {
    body: any;
    headers: any;
    query: any;
  };
  steps: {
    [nodeId: string]: {
      data: any;      // 节点输出
      status: string; // 节点状态
    }
  };
  globals: any;       // 环境变量
}
```

### 4.3 变量替换算法 (Variable Substitution)
在执行任何节点配置前（如 API URL, SQL Query），必须解析 `{{...}}`。
*   **输入**: `https://api.com/users/{{steps.node_1.data.id}}`
*   **逻辑**: 使用 Regex 或 AST 遍历字符串，从 Redis/Memory 中的 `WorkflowContext` 查找对应路径的值并替换。

### 4.4 节点执行逻辑 (Worker Implementation)

#### 通用流程
1.  Worker 收到 `{ executionId, nodeId }`。
2.  从 DB 加载 Workflow Definition 和当前 Execution Context。
3.  **Variable Substitution**: 替换该节点 Config 中的变量。
4.  **Execute**: 根据 `nodeType` 执行特定逻辑（见下文）。
5.  **Save**: 更新 `ExecutionStep` (status, outputData, logs)。
6.  **Next Tick**: 查找所有出边 (Outgoing Edges)。
    *   如果是 `CONDITION` 节点，根据结果选择 True 或 False 的路径。
    *   检查下游节点的所有前置依赖 (In-degree) 是否都已完成 (SUCCESS)。
    *   如果依赖满足 -> `Dispatcher.addJob(downstreamNodeId)`.

#### 特定节点逻辑
*   **API_REQUEST**: 使用 `axios` 发起 HTTP 请求。捕获 Status, Body, Headers。
*   **PROCESS (Sandbox)**:
    *   使用 `isolated-vm` 创建安全沙箱。
    *   注入 `inputs` (trigger data) 和 `steps` (previous outputs)。
    *   执行用户代码 `code`。
    *   获取返回值作为 `outputData`。
    *   *限制*: 内存限制 128MB，超时 3000ms。
*   **CONDITION**:
    *   在沙箱中执行 `return !!(expression)`。
    *   根据 true/false 决定只调度哪一条分支的下游节点。
*   **DELAY**:
    *   计算延时毫秒数。
    *   使用 BullMQ 的 `delay` 属性将后续调度任务推入延时队列。
*   **LLM**:
    *   调用 `@google/genai`。
    *   处理 Prompt 中的变量替换。
*   **DB_QUERY**:
    *   使用 `typeorm` 或 `knex` 创建临时的只读连接（需严格限制权限，防止 SQL 注入风险，或者仅允许参数化查询）。

---

## 5. API 接口定义 (API Contracts)

所有接口前缀 `/api/v1`。除了 Auth 相关，其余均需 Bearer Token (JWT)。

### 5.1 Auth & User
*   `POST /auth/login`: `{email, password}` -> `{accessToken, user}`
*   `GET /auth/me`: 获取当前用户信息。

### 5.2 Teams
*   `GET /teams`: 列出所属团队。
*   `POST /teams`: 创建团队。
*   `POST /teams/:id/switch`: 切换当前上下文。
*   `GET /teams/:id/members`: 成员列表。

### 5.3 Workflows (Editor)
*   `GET /workflows`: 列出当前团队的工作流（支持搜索、分页）。
*   `GET /workflows/:id`: 获取详情 + **JSON Definition**。
*   `POST /workflows`: 创建空工作流。
*   `PUT /workflows/:id`: 保存画布。
    *   Body: `{ definition: { nodes: [...], edges: [...] }, name?: string }`
*   `DELETE /workflows/:id`: 删除。
*   `POST /workflows/:id/deploy`: 发布版本。
    *   Body: `{ version: string, description: string }`

### 5.4 Execution (Runtime)
*   `POST /workflows/:id/run`: **手动触发**。
    *   Body: `{ input: any, targetNodeId?: string }` (支持 Partial Run)
    *   Response: `{ executionId: string }` (异步)
*   `GET /executions`: 列表查询 (Query: workflowId)。
*   `GET /executions/:id`: 获取单次执行详情。
    *   Response: `Execution & { steps: ExecutionStep[] }`

### 5.5 Triggers (Public/Protected)
*   `POST /hooks/:workflowId`: **Webhook 入口**。
    *   Headers: `X-API-Key: sk_...` (可选，取决于配置)
    *   Body: Arbitrary JSON.

### 5.6 API Keys
*   `GET /api-keys`: 列出 Key。
*   `POST /api-keys`: 创建 Key (Global)。
*   `POST /workflows/:id/api-key`: 生成 Workflow 专属 Key。
*   `DELETE /api-keys/:id`: 吊销。

---

## 6. 实时通信 (Socket.io)

Namespace: `/workflow`

*   **Client -> Server**:
    *   `join_room`: `{ executionId }`
*   **Server -> Client**:
    *   `node_start`: `{ nodeId }`
    *   `node_finish`: `{ nodeId, status, duration, logs, output }`
    *   `execution_finish`: `{ status, duration }`

---

## 7. 开发指南 (Implementation Plan)

### Phase 1: 基础骨架
1.  初始化 NestJS 项目。
2.  配置 Docker Compose (Postgres + Redis)。
3.  Prisma Schema 定义与 Migration。
4.  实现 Auth Module (JWT Strategy) 和 Team Module。

### Phase 2: 工作流 CRUD
1.  实现 Workflow Controller。
2.  确保前端保存的 JSON 能完整存入 `definition` 字段并在读取时还原。

### Phase 3: 核心引擎 (MVP)
1.  配置 BullMQ (`workflow-queue`, `node-queue`)。
2.  实现 `Orchestrator`: 解析 Graph，寻找 Start Node。
3.  实现 `API_REQUEST` Worker: 处理最简单的 HTTP 请求。
4.  实现变量替换逻辑。

### Phase 4: 高级节点与沙箱
1.  集成 `isolated-vm` 实现 `PROCESS` 节点。
2.  实现 `CONDITION` 逻辑分支处理。
3.  集成 `Socket.io` 实现前端 `RunTracePanel` 联动。

### Phase 5: 生产级特性
1.  API Key 鉴权中间件。
2.  Webhook 触发器端点。
3.  Cron 任务调度 (使用 `@nestjs/schedule` 动态注册任务)。
