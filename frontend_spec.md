# EasyWorkflow 前端技术规格说明书 (Frontend Technical Specification)

## 1. 项目概览 (Project Overview)
**EasyWorkflow** 是一个基于 React 的企业级低代码工作流编排平台。它允许用户通过可视化拖拽的方式构建复杂的自动化流程，支持 HTTP 请求、逻辑判断、数据处理、AI 模型调用等多种节点。前端集成了完整的编辑器、仪表盘、团队管理及模拟执行引擎。

---

## 2. 技术架构 (Technical Architecture)

### 2.1 核心技术栈
*   **Core Framework**: React 19
*   **State Management**: Zustand (分离为 `useFlowStore` 和 `useAppStore`)
*   **Flow Engine**: @xyflow/react (React Flow) v12
*   **Styling**: Tailwind CSS + clsx
*   **Icons**: Lucide React
*   **AI Integration**: @google/genai (Google Gemini SDK)
*   **Build Tool**: Vite (Implied by current structure, likely ESM via CDN in current prototype)

### 2.2 目录结构规范
*   `components/flow`: 画布、节点、上下文菜单、运行追踪面板。
*   `components/dashboard`: 仪表盘、列表视图、设置、模态框。
*   `components/layout`: 头部、侧边栏、整体布局、发布弹窗。
*   `components/ai`: AI 生成器、Copilot 助手。
*   `store`: Zustand 状态定义 (`useFlowStore`, `useAppStore`)。
*   `types.ts`: 全局 TypeScript 类型定义。
*   `locales.ts`: 国际化资源文件 (ZH/EN)。

---

## 3. 功能模块详解 (Functional Modules)

### 3.1 工作流编辑器 (Workflow Editor)

#### 3.1.1 画布交互 (Canvas)
*   **拖拽生成**: 支持从侧边栏拖拽基础组件或收藏组件到画布生成新节点。
*   **节点操作**:
    *   支持多选 (SelectionMode.Partial)。
    *   支持快捷键删除 (`Backspace`/`Delete`)。
    *   支持连线 (SmoothStep Edge 样式，自动吸附)。
*   **右键菜单 (Context Menu)**:
    *   **节点右键**: 复制 (Copy)、删除 (Delete)。
    *   **画布右键**: 粘贴 (Paste)。
*   **剪贴板逻辑**:
    *   跨节点复制/粘贴。
    *   粘贴时自动计算位置偏移 (鼠标位置或中心偏移)。
    *   粘贴时自动重生成节点 ID 和配置 ID，防止冲突。
    *   快捷键支持 (`Ctrl/Cmd + C`, `Ctrl/Cmd + V`)。

#### 3.1.2 节点类型与配置 (Node Configuration)
所有节点配置均在右侧属性面板 (`PropertiesPanel`) 进行，支持实时保存。

1.  **开始节点 (Start / Trigger)**
    *   **Webhook**: 显示生成的 Webhook URL，支持 cURL 复制，配置 Method (GET/POST/PUT)。
    *   **定时 (Schedule)**: 配置 Cron 表达式，提供常用预设 (每分钟/每小时/每天)。
    *   **表单 (Form)**: 可视化表单构建器，支持添加字段 (Text, Number, Email, Boolean, Select, File)，设置必填项。
    *   **手动 (Manual)**: 仅用于测试或子流程。

2.  **API 请求 (API Request)**
    *   **基础**: Method 选择，URL 输入 (支持变量插入)。
    *   **导入**: 支持粘贴 cURL 命令或 OpenAPI JSON 自动填充配置。
    *   **参数 (Params)**: Key-Value 编辑器。
    *   **认证 (Auth)**: None, Bearer Token, Basic Auth, OAuth 2.0 (Client Credentials/Auth Code)。
    *   **Headers**: Key-Value 编辑器。
    *   **Body**: JSON 编辑器。
    *   **脚本 (Scripts)**:
        *   *Pre-request*: 请求前运行的 JS 代码。
        *   *Test*: 响应后运行的断言/处理代码。

3.  **大模型 (LLM)**
    *   **提供商**: OpenAI, Azure, Custom。
    *   **配置**: Base URL, API Key, Model Name, Temperature (滑块)。
    *   **Prompt**: System Prompt, User Prompt (支持变量)。
    *   **输出**: 格式选择 (Text / JSON Object)。

4.  **条件判断 (Condition)**
    *   **表达式**: JavaScript 表达式编辑器 (e.g., `inputs.value > 10`)。
    *   **逻辑**: 根据 true/false 决定后续路径 (模拟执行时支持)。

5.  **数据处理 (Process)**
    *   **沙箱**: NodeJS 风格代码编辑器。
    *   **功能**: 访问 `inputs`, `steps`，返回处理后的对象。

6.  **数据库 (DB Query)**
    *   **类型**: PostgreSQL, MySQL, SQL Server。
    *   **连接**: Connection String 输入。
    *   **SQL**: SQL 语句编辑器 (支持变量注入)。

7.  **延时 (Delay)**
    *   配置时长和单位 (ms, seconds, minutes)。

8.  **结束 (End)**
    *   配置 HTTP 状态码。
    *   配置响应 Body (JSON 模板)。

#### 3.1.3 变量系统 (Variable System)
*   **语法**: `{{steps.nodeId.data.field}}`。
*   **插入菜单**: 在所有支持变量的输入框 (Input/Textarea) 右侧提供 `{}` 按钮。
    *   自动列出上游节点。
    *   根据节点类型预设输出 Schema (如 API 节点显示 status/data，DB 节点显示 rows)。

---

### 3.2 模拟执行引擎 (Simulation Engine)
前端内置了一个轻量级的执行引擎 (`useFlowStore.ts -> runWorkflow`)，用于“试运行”和调试。

*   **拓扑分析**: 自动计算 DAG 依赖关系，确定执行顺序。
*   **分段运行 (Partial Run)**:
    *   支持“运行到此节点” (Run to here)。
    *   自动回溯所有上游依赖节点并仅执行相关路径。
*   **节点模拟**:
    *   *LLM*: 模拟 API 调用延迟，返回 Mock 数据。
    *   *API*: 模拟网络请求过程，执行 Pre/Test 脚本逻辑。
    *   *Delay*: 真实 `setTimeout` 等待。
    *   *Process*: 简单模拟成功/失败。
*   **日志记录**:
    *   生成详细的 `ExecutionStepLog`。
    *   实时更新节点状态 (Running -> Success/Error) 和动画。
    *   底部 **实时运行追踪面板 (RunTracePanel)** 显示每一步的时间戳、耗时和状态。

---

### 3.3 AI 辅助能力 (AI Copilot)

#### 3.3.1 智能生成节点 (AiGeneratorModal)
*   **输入**: 自然语言描述、API 文档 URL 或 cURL 命令。
*   **处理**: 调用 Google Gemini 模型解析输入。
*   **输出**: 自动生成一个配置完整的 `API_REQUEST` 节点并添加到画布。

#### 3.3.2 MCP Copilot (Floating Chat)
*   **上下文感知**: AI 能够读取当前画布的 Nodes 和 Edges 数据。
*   **自然语言操作**:
    *   "添加一个数据库节点并连接到开始节点"
    *   "清空画布"
    *   "在所有 API 节点后增加延时"
*   **协议**: 基于 MCP (Model Context Protocol) 思想，AI 返回 JSON 指令直接修改 React Flow 状态。

---

### 3.4 仪表盘与管理 (Dashboard)

#### 3.4.1 工作流管理
*   **列表视图**: 卡片式展示，包含状态 (Draft/Active)、成功率、运行次数、节点数。
*   **操作**: 新建、导入 (JSON)、导出 (JSON)、删除、搜索。
*   **导入逻辑**: 校验 JSON 结构完整性 (`meta`, `nodes`, `edges`)。

#### 3.4.2 执行记录 (Executions)
*   **列表**: 状态、工作流名称、触发方式、时间、耗时。
*   **详情弹窗**:
    *   时间轴展示每一步的执行状态。
    *   查看每一步的详细 Console Logs。
    *   JSON 格式查看输入输出。

#### 3.4.3 团队管理
*   **多团队切换**: 下拉菜单切换当前上下文。
*   **创建团队**: 设置名称和 Slug (自动生成)。
*   **成员管理**:
    *   邀请成员 (Email + Role)。
    *   角色: Owner, Admin, Editor, Viewer。
    *   移除成员。

#### 3.4.4 系统设置
*   **个人资料**: 头像、用户名、邮箱。
*   **API Key 管理**:
    *   **Global Key**: 生成/吊销全局密钥 (sk_live_...)。
    *   **Workflow Key**: 在编辑器头部生成工作流专属密钥。
*   **国际化**: 中/英切换。

---

### 3.5 组件库与收藏 (Sidebar & Library)
*   **基础组件**: 预置的 8 种核心节点。
*   **收藏夹 (Saved Nodes)**:
    *   用户可将配置好的节点“保存为模板”。
    *   支持自定义名称和标签 (Tags)。
    *   支持搜索、编辑标签、删除收藏。
    *   拖拽收藏节点到画布时，自动还原完整配置 (Deep Clone)。

---

### 3.6 顶部导航栏 (Header)
*   **状态展示**: 名字、版本号、发布状态。
*   **操作栏**:
    *   **导入/导出**: JSON 文件处理。
    *   **历史版本**: 查看版本列表 (Mock)，支持回滚操作。
    *   **API 文档**: 自动生成当前工作流的调用代码 (cURL)，展示 Auth Token。
    *   **试运行**: 触发模拟引擎。
    *   **发布 (Deploy)**: 填写版本号 (SemVer) 和描述，生成快照。

---

## 4. 数据结构规范 (Data Structures)

### 4.1 节点数据 (`NodeData`)
```typescript
interface NodeData {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error';
  type: NodeType;
  config: {
    // 聚合所有节点的配置字段，按需使用
    url?: string;
    method?: string;
    headers?: KeyValuePair[];
    body?: string;
    code?: string; // Process Node
    dbConfig?: { ... };
    llmConfig?: { ... };
    // ... 其他特定配置
  };
  logs?: string[]; // 运行时日志
  duration?: number;
}
```

### 4.2 存储模型 (Zustand Stores)
1.  **useFlowStore**: 专注于编辑器状态。
    *   `nodes`, `edges`: React Flow 核心数据。
    *   `copiedNodes`: 剪贴板。
    *   `traceLogs`: 底部面板日志。
    *   `runWorkflow()`: 核心执行逻辑。

2.  **useAppStore**: 专注于业务数据。
    *   `currentUser`, `currentTeam`.
    *   `workflows`: 工作流元数据列表。
    *   `apiKeys`: 全局密钥列表。
    *   `savedNodes`: 收藏的节点模板。
    *   `executions`: 历史运行记录。

---

## 5. UI/UX 规范
*   **字体**: Inter / sans-serif。
*   **主色调**: Black (Primary Actions), Gray-50/100 (Backgrounds), Blue-600 (Accents/Links)。
*   **状态色**: Green (Success), Red (Error), Blue (Running), Yellow (Draft/Warning)。
*   **动画**:
    *   使用 `tailwindcss-animate`。
    *   所有模态框、下拉菜单、面板切换均有 `fade-in`, `zoom-in`, `slide-in` 动画。
    *   运行中的节点有呼吸灯效果 (`node-running` keyframe)。
*   **反馈**:
    *   重要操作 (删除、发布) 需二次确认。
    *   异步操作 (AI 生成、登录) 需显示 Loading 状态。

---

## 6. 待集成点 (Integration Points)
当前前端大量使用了 Mock 数据和模拟逻辑，对接后端时需注意：
1.  **Auth**: 替换 `login` 为真实的 JWT 获取和存储。
2.  **API Keys**: 对接真实的 Key 生成接口，不再在前端生成 Mock Key。
3.  **Run**: 将 `runWorkflow` 替换为后端触发 (`POST /workflows/:id/run`)，并改为通过 WebSocket/SSE 接收 `traceLogs`。
4.  **AI**: 将 GenAI 调用移至后端 Proxy，防止 API Key 泄露。
