
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
*   **Sandbox**: **isolated-vm** (用于安全执行 `PROCESS` 节点的 JS 代码，以及 `API` 节点的 Pre-request/Test Scripts)
*   **Validation**: **Zod** (配合 NestJS Pipes 做运行时校验)
*   **AI Integration**: **@google/genai** (用于 LLM 节点)
*   **Scheduler**: **@nestjs/schedule** (处理 Cron 触发器)

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
  
  // OAuth2 Credentials Storage (Encrypted)
  oauthCredentials OAuthCredential[]
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
// Credentials & Secrets
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

// 用于存储 API 节点 OAuth2 配置生成的 Token 缓存
model OAuthCredential {
  id            String   @id @default(uuid())
  teamId        String
  providerName  String   // e.g. "Google", "Salesforce"
  clientId      String
  encryptedSecret String // AES-256 Encrypted
  accessToken   String?  // Encrypted
  refreshToken  String?  // Encrypted
  expiresAt     DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  team          Team     @relation(fields: [teamId], references: [id])
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
  cronConfig  String?        // 6-field Cron expression (Supports seconds)
  
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
  globals: any;       // 环境变量 (Secrets)
}
```

### 4.3 节点执行逻辑 (Worker Implementation)

#### 通用流程
1.  Worker 收到 `{ executionId, nodeId }`。
2.  从 DB 加载 Workflow Definition 和当前 Execution Context。
3.  **Variable Substitution**: 替换该节点 Config 中的变量 `{{steps...}}`。
4.  **Execute**: 根据 `nodeType` 执行特定逻辑。
5.  **Save**: 更新 `ExecutionStep`。
6.  **Next Tick**: 查找下游并调度。

#### 特定节点逻辑增强

*   **API_REQUEST (增强版)**:
    1.  **OAuth2 Refresh**: 如果配置了 `oauth2`，先检查 Token 是否过期，若过期则使用 `refreshToken` 刷新。
    2.  **Pre-request Script**: 运行 `isolated-vm` 沙箱，允许用户修改 request config (headers, body)。
    3.  **Request**: 发送 HTTP 请求 (axios)。
    4.  **Test Script**: 运行 `isolated-vm` 沙箱，允许用户断言 `response.status` 或修改输出数据 `response.data`。
    
*   **START (Schedule)**:
    *   使用 `@nestjs/schedule` 的 `CronJob`。
    *   支持 **6位 Cron 表达式** (秒级)，例如 `*/5 * * * * *`。
    *   注意：Node应用重启时需重新加载所有 Active 的 Cron Jobs。

*   **PROCESS (Sandbox)**:
    *   使用 `isolated-vm`。
    *   注入 `inputs` (trigger data) 和 `steps` (previous outputs)。
    *   *限制*: 内存 128MB，超时 3000ms。

---

## 5. API 接口定义 (API Contracts)

所有接口前缀 `/api/v1`。除了 Auth 相关，其余均需 Bearer Token (JWT)。

*   **Workflows**:
    *   `POST /workflows/:id/run`: 手动触发 (支持 `targetNodeId` 参数实现 Partial Run)。
    *   `POST /workflows/:id/import`: 处理 JSON 导入。
*   **Executions**:
    *   `GET /executions/:id`: 获取详情，包含 `steps` 和 `logs`。
*   **Secrets**:
    *   `POST /secrets`: 保存加密的环境变量/OAuth凭证。

---

## 6. 开发指南

1.  优先实现 `Orchestrator` 和 `Process` 节点的沙箱逻辑，这是最核心的难点。
2.  Cron 调度器需设计为单例服务，应用启动时从 DB 加载。
3.  前端 `RunTracePanel` 依赖 Socket.io，需在后端实现 `ExecutionGateway`。
