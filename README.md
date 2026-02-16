# EasyWorkflow

一个基于 React 和 React Flow 构建的高性能、企业级低代码工作流编排平台。

## 🚀 简介 (Overview)

EasyWorkflow 允许用户以可视化的方式设计、自动化和监控复杂的业务流程。它支持多种节点类型，包括 HTTP 请求、AI 模型 (LLM)、数据库查询和自定义 JavaScript 代码执行，所有操作都在一个流畅的拖拽界面中完成。

## ✨ 核心功能 (Key Features)

### 🎨 可视化工作流编辑器
- **拖拽操作**: 基于 React Flow v12 的直观画布。
- **丰富的节点库**:
  - **触发器 (Trigger)**: Webhook, 定时任务 (Cron), 表单, 手动触发。
  - **动作 (Action)**: HTTP 请求, 数据库查询, 延时, AI 模型 (Gemini)。
  - **逻辑 (Logic)**: 代码沙箱 (支持 Node.js 和 Python), 条件判断 (If/Else)。
- **智能工具**: 支持多选、复制/粘贴、分段执行 ("运行到此处")。

### 🤖 AI 驱动
- **AI 节点生成器**: 粘贴 cURL 命令或 API 文档，利用 Google Gemini 自动生成配置完善的 API 节点。
- **MCP Copilot**: 一个对话式助手，可以通过自然语言修改工作流图、添加节点或清空画布。

### ⚡ 执行引擎
- **客户端模拟**: 内置引擎，可直接在浏览器中测试工作流。
- **实时追踪**: 逐步显示的执行日志，包含状态、耗时详情及输出结果检查。
- **变量系统**: 节点间支持动态数据传递，使用 `{{steps.nodeId.data.key}}` 语法。

### 🏢 企业级特性
- **团队管理**: 支持工作空间切换、成员邀请及 RBAC 权限控制（拥有者、管理员、编辑者、查看者）。
- **版本管理**: 支持部署管理，查看版本历史及回滚功能。
- **仪表盘**: 提供执行历史记录、成功率统计及 API 密钥管理。

## 🛠️ 技术栈 (Tech Stack)

- **框架**: React 19
- **状态管理**: Zustand
- **流程引擎**: @xyflow/react (React Flow)
- **样式**: Tailwind CSS + clsx
- **图标**: Lucide React
- **AI SDK**: @google/genai
- **构建工具**: Vite

## 📂 项目结构 (Project Structure)

```
├── components/
│   ├── ai/            # AI Copilot & 生成器
│   ├── auth/          # 登录 & 认证
│   ├── common/        # 通用 UI 组件 (输入框等)
│   ├── dashboard/     # 仪表盘视图 (工作流, 执行记录, 设置)
│   ├── flow/          # 工作流编辑器画布 & 节点
│   ├── layout/        # 应用外壳, 头部, 侧边栏
│   └── nodes/config/  # 独立的节点配置面板
├── store/             # 全局状态 (Zustand)
│   ├── useAppStore.ts # 用户, 团队, 仪表盘状态
│   └── useFlowStore.ts# 图表, 执行状态
├── locales.ts         # 国际化翻译 (ZH/EN)
├── types.ts           # TypeScript 类型定义
├── App.tsx            # 主应用组件
└── index.tsx          # 入口文件
```

## 🚀 快速开始 (Getting Started)

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **构建生产版本**
   ```bash
   npm run build
   ```

## 🧩 节点配置 (Node Configuration)

为了便于维护，节点配置已解耦：
- **API 节点**: 支持多种认证方式 (Bearer, Basic, OAuth2)、Headers、Body 以及预请求/测试脚本。
- **处理节点**: Node.js 或 Python 风格的沙箱，用于数据转换。
- **LLM 节点**: 集成 LLM 提供商（默认通过代理/直连调用 Gemini）。

## 📝 许可证 (License)

Private / Enterprise
