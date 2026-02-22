![EasyWorkflow](https://gitee.com/leonda/EasyWorkflow/raw/main/doc/easyworkflow_new.png)

# EasyWorkflow

[English](README.md) | [中文](README_CN.md)

一个基于 React 和 React Flow 构建的高性能、企业级低代码工作流编排平台。

## 📸 项目截图

![demo1](https://gitee.com/leonda/EasyWorkflow/raw/main/doc/demo1.gif)
![demo2](https://gitee.com/leonda/EasyWorkflow/raw/main/doc/demo2.gif)
![demo3](https://gitee.com/leonda/EasyWorkflow/raw/main/doc/demo3.gif)
![demo4](https://gitee.com/leonda/EasyWorkflow/raw/main/doc/demo4.gif)
![demo5](https://gitee.com/leonda/EasyWorkflow/raw/main/doc/demo5.gif)

---

## 🎯 为什么选择 EasyWorkflow？

在快速发展的 AI 工作流自动化领域，**Dify**、**Coze**、**n8n** 等平台为低代码/无代码领域做出了重要贡献。然而，在**企业级工作流编排**场景下，这些平台可能存在一些局限性：

| 挑战 | 常见平台 | EasyWorkflow |
|------|----------|--------------|
| **大模型配置** | 配置复杂，厂商锁定 | 简单配置，多提供商支持 |
| **私有化部署** | 自托管选项有限 | 完全控制，开箱即用 |
| **调度灵活性** | 固定模式 | 可自定义调度策略 |
| **企业集成** | 基础 API 支持 | 完善的 API 和 Webhook 生态 |
| **执行控制** | 可见性有限 | 完整执行追踪与分析 |

### 🏢 为企业而生

EasyWorkflow 从设计之初就充分考虑了**企业级需求**：

- **🔒 私有化部署**：完全掌控您的数据和基础设施
- **⚡ 高性能**：针对高吞吐量工作流执行进行优化
- **🔌 轻松集成**：简单的大模型配置，无厂商锁定
- **📊 全链路可观测**：完整的执行追踪和性能分析
- **🎛️ 灵活调度**：可自定义调度策略，适应业务需求

---

## ✨ 核心特性

### 🚀 消息队列支持
- RabbitMQ 集成，支持异步任务处理
- 可靠的消息传递与重试机制
- 队列监控与管理
- **企业级可靠性**，保障关键业务流程

### 🤖 大模型 API 调度
- 支持多种 LLM 提供商（OpenAI、Gemini、Azure、本地模型等）
- **完美适配私有化部署场景** - 连接您自己的 LLM 服务器
- 可配置的速率限制和并发控制
- **简单配置** - 只需添加 API 端点和密钥
- 支持自定义模型端点（Ollama、vLLM 等）

### 📦 发布管理
- 版本控制与部署历史记录
- 一键回滚到历史版本
- 工作流版本对比
- **生产级部署流程**

### 📊 执行统计
- 实时执行监控
- 成功率分析与性能指标
- 详细的执行日志，逐步追踪
- **完整可见性**，洞察工作流性能

### 🔑 API 密钥管理
- **全局 API Key**：系统集成访问
- **专属 API Key**：精细化的访问控制
- 安全的密钥生成与撤销
- **企业级安全标准**

### ✨ AI 节点自动生成
- 自动将 API 文档/URL 转换为 HTTP 请求节点
- cURL 命令解析与节点创建
- 智能参数检测与配置
- **加速开发**，智能自动化

### 💬 EasyBot 智能助手
- 内置 AI 聊天助手
- 自然语言辅助工作流设计
- 智能建议与自动化
- **降低学习门槛**

### 🌐 国际化支持
- 中英文语言切换
- 可扩展的 i18n 框架
- 本地化的日期时间格式
- **全球团队协作**

### 🔧 丰富的节点库

| 分类 | 节点类型 |
|------|----------|
| **触发器** | Webhook、定时任务、表单、手动触发 |
| **动作** | HTTP 请求、数据库查询、延时、LLM |
| **逻辑** | 代码沙箱（Node.js/Python）、条件判断、分支 |

---

## 🎨 可视化工作流编辑器

- **拖拽操作**：基于 React Flow v12 的直观画布
- **智能工具**：多选、复制/粘贴、分段执行
- **实时预览**：实时执行追踪与日志展示
- **变量系统**：使用 `{{steps.nodeId.data.key}}` 语法动态传递数据

---

## 🛠️ 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| Zustand | 状态管理 |
| @xyflow/react | 流程引擎 |
| Tailwind CSS | 样式框架 |
| Vite | 构建工具 |

### 后端
| 技术 | 用途 |
|------|------|
| NestJS 11 | API 框架 |
| Prisma 5 | ORM |
| MySQL 8.0 | 数据库 |
| RabbitMQ | 消息队列 |
| Socket.io | 实时通信 |

---

## 🚀 快速开始

### 方式一：本地开发

#### 前端启动
```bash
npm install
npm run dev
```

#### 后端启动
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev
```

访问地址：http://localhost:3000

### 方式二：Docker 一键部署（推荐）

```bash
git clone <repository-url>
cd EasyWorkflow
docker-compose up -d
```

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost |
| 后端 API | http://localhost:3001/api/v1 |
| RabbitMQ 管理 | http://localhost:15673 |

**默认账号：** `admin@easyworkflow.com` / `admin123`

---

## 📂 项目结构

```
├── components/          # React 组件
│   ├── ai/             # AI 助手
│   ├── flow/           # 工作流编辑器
│   └── nodes/config/   # 节点配置
├── store/              # Zustand 状态存储
├── backend/            # NestJS 后端
│   ├── src/            # 源代码
│   └── prisma/         # 数据库模型
├── docker/             # Docker 配置
└── locales.ts          # 国际化翻译
```

---

## 📦 Docker 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 重新构建并启动
docker-compose up -d --build

# 停止服务
docker-compose down
```

---

## 📄 开源协议

本项目采用 MIT 协议开源 - 详见 [LICENSE](LICENSE) 文件。

---

## 📧 联系方式

如有问题或建议，请联系：**dadajiu45@gmail.com**
QQ：176942734

---

## 🙏 致谢

- [React Flow](https://reactflow.dev/) - 优秀的流程图库
- [NestJS](https://nestjs.com/) - 渐进式 Node.js 框架
- [Prisma](https://www.prisma.io/) - 下一代 ORM
