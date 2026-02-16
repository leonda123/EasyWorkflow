
# EasyWorkflow Backend Development Checklist

## Phase 1: Infrastructure & Foundation (基础架构)

- [ ] **Project Setup**
    - [ ] Initialize NestJS project (`nest new backend`).
    - [ ] Configure Environment Variables (`ConfigModule`).
    - [ ] Setup Docker Compose for PostgreSQL & Redis.
    - [ ] Setup ESLint & Prettier.

- [ ] **Database & ORM**
    - [ ] Initialize Prisma (`npx prisma init`).
    - [ ] Define `schema.prisma` (User, Team, Workflow, Execution, ApiKey).
    - [ ] Run migration (`npx prisma migrate dev`).
    - [ ] Create Prisma Service & Module.

- [ ] **Authentication (IAM)**
    - [ ] Implement `AuthModule` with JWT Strategy.
    - [ ] Implement `Register` & `Login` endpoints.
    - [ ] Implement `AuthGuard` (Bearer Token).
    - [ ] Implement `TeamGuard` (RBAC check).

## Phase 2: Workflow Management (工作流管理)

- [ ] **Team Module**
    - [ ] CRUD operations for Teams.
    - [ ] Member invitation & management logic.
    - [ ] API Key generation/hashing/revocation.

- [ ] **Workflow CRUD**
    - [ ] Save Workflow Definition (JSONB).
    - [ ] Load Workflow with Versions.
    - [ ] Deployment logic (Snapshotting versions).
    - [ ] Import/Export logic validation.

## Phase 3: The Execution Engine (核心引擎)

- [ ] **Queue System**
    - [ ] Setup BullMQ (`workflow.queue`, `task.queue`).
    - [ ] Implement `OrchestratorService` (Graph Traversal & Dependency Analysis).
    - [ ] Implement `DispatcherService` (Job Producer).

- [ ] **Worker Implementation (Basic)**
    - [ ] `StartNode` handler.
    - [ ] `EndNode` handler.
    - [ ] `DelayNode` handler (using BullMQ delayed jobs).
    - [ ] **Variable Substitution Engine**: Regex parsing for `{{steps.x.y}}`.

- [ ] **Worker Implementation (Advanced)**
    - [ ] **Sandbox Service**:
        - [ ] Integrate `isolated-vm`.
        - [ ] Implement safe context injection (`inputs`, `steps`).
    - [ ] `ProcessNode` handler (using Sandbox).
    - [ ] `ConditionNode` handler (evaluating JS expression in Sandbox).
    - [ ] `ApiRequestNode` handler:
        - [ ] Axios implementation.
        - [ ] **Pre-request Script** execution.
        - **Test Script** execution.
        - [ ] OAuth2 Token Refresh logic (Placeholder).

## Phase 4: Triggers & Real-time (触发器与实时)

- [ ] **Webhook System**
    - [ ] Create generic endpoint `POST /hooks/:workflowId`.
    - [ ] Validate Request & create Execution.

- [ ] **Scheduler System**
    - [ ] Implement `SchedulerService` using `@nestjs/schedule`.
    - [ ] Logic to load Active Workflows with Cron config on startup.
    - [ ] Dynamic add/remove cron jobs when Workflow is deployed/disabled.
    - [ ] Support 6-field Cron (Second-level).

- [ ] **Real-time Trace**
    - [ ] Setup `GatewayModule` (Socket.io).
    - [ ] Emit events from Workers (`node.start`, `node.complete`).
    - [ ] Frontend integration validation.

## Phase 5: Polish & Security (完善与安全)

- [ ] **Secrets Management**
    - [ ] Encryption for OAuth2 tokens and Environment Variables.
- [ ] **Logging**
    - [ ] Structured logging (Pino/Winston).
- [ ] **Testing**
    - [ ] Unit tests for Graph Traversal.
    - [ ] E2E tests for Webhook -> Execution -> DB.

## Phase 6: Frontend Integration (联调)

- [ ] Replace Mock APIs in `useAppStore` with real `fetch/axios` calls.
- [ ] Replace `useFlowStore.runWorkflow` simulation with Socket.io listeners.
