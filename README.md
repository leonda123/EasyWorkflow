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

### 前端
- **框架**: React 19
- **状态管理**: Zustand
- **流程引擎**: @xyflow/react (React Flow)
- **样式**: Tailwind CSS + clsx
- **图标**: Lucide React
- **AI SDK**: @google/genai
- **构建工具**: Vite

### 后端
- **框架**: NestJS 11
- **ORM**: Prisma 5
- **数据库**: MySQL 8.0
- **消息队列**: RabbitMQ
- **认证**: JWT + Passport
- **实时通信**: Socket.io

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
├── backend/           # 后端服务 (NestJS)
│   ├── src/           # 源代码
│   └── prisma/        # 数据库模型
├── docker/            # Docker 配置文件
│   ├── frontend/      # 前端 Dockerfile & Nginx 配置
│   ├── backend/       # 后端 Dockerfile
│   └── mysql/         # MySQL 初始化脚本
├── locales.ts         # 国际化翻译 (ZH/EN)
├── types.ts           # TypeScript 类型定义
├── App.tsx            # 主应用组件
└── index.tsx          # 入口文件
```

---

## 🚀 快速开始 (Getting Started)

### 方式一：本地开发环境

#### 1. 前端启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

#### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run start:dev

# 或构建后启动
npm run build
node dist/main.js
```

#### 3. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:3001/api/v1

---

### 方式二：Docker 一键部署（推荐）

#### 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

#### 一键部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd EasyWorkflow

# 2. 启动所有服务（一键部署，无需配置）
docker-compose up -d

# 3. 查看启动日志
docker-compose logs -f
```

首次启动会自动完成：
- 创建数据库和表结构
- 初始化默认超级管理员账号

#### 访问地址

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost |
| 后端 API | http://localhost:3001/api/v1 |
| RabbitMQ 管理 | http://localhost:15673 |

#### 默认账号

| 账号类型 | 邮箱 | 密码 |
|----------|------|------|
| 超级管理员 | admin@easyworkflow.com | admin123 |

> ⚠️ **安全提示**: 生产环境请登录后立即修改默认密码！

#### 服务架构

```
┌─────────────────────────────────────┐
│           Docker Network            │
│                                     │
│  ┌─────────┐      ┌─────────────┐   │
│  │ Frontend│─────►│   Backend   │   │
│  │ (Nginx) │ :3001│  (NestJS)   │   │
│  └─────────┘      └──────┬──────┘   │
│                          │          │
│              ┌───────────┼──────────┐│
│              ▼           ▼          ││
│       ┌──────────┐ ┌───────────┐    ││
│       │  MySQL   │ │ RabbitMQ  │    ││
│       │  :3306   │ │ :5672     │    ││
│       └──────────┘ └───────────┘    ││
│                                     │
└─────────────────────────────────────┘
```

#### 端口映射

| 服务 | 容器端口 | 主机端口 |
|------|----------|----------|
| 前端 (Nginx) | 80 | 80 |
| 后端 (NestJS) | 3001 | 3001 |
| MySQL | 3306 | 3307 |
| RabbitMQ AMQP | 5672 | 5673 |
| RabbitMQ 管理 | 15672 | 15673 |

---

## 📦 Docker 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]
```

### 构建和更新

```bash
# 重新构建镜像
docker-compose build

# 重新构建并启动
docker-compose up -d --build

# 拉取最新基础镜像
docker-compose pull
```

### 数据库操作

```bash
# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -p

# 备份数据库
docker-compose exec mysql mysqldump -u root -p easy_workflow > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p easy_workflow < backup.sql

# 运行 Prisma 迁移
docker-compose exec backend npx prisma migrate deploy
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 3. 运行数据库迁移（如有）
docker-compose exec backend npx prisma migrate deploy

# 4. 查看日志确认启动成功
docker-compose logs -f
```

---

## ⚙️ 环境变量配置（可选自定义）

Docker 一键部署已内置默认配置，如需自定义可创建 `.env` 文件覆盖：

### 可自定义配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | `easyworkflow_root_2024` |
| `MYSQL_DATABASE` | 数据库名称 | `easyworkflow` |
| `JWT_SECRET` | JWT 密钥 | 内置安全密钥 |
| `ENCRYPTION_KEY` | 数据加密密钥（32字符） | 内置密钥 |
| `RABBITMQ_DEFAULT_USER` | RabbitMQ 用户名 | `easyworkflow` |
| `RABBITMQ_DEFAULT_PASS` | RabbitMQ 密码 | `easyworkflow123` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |

---

## 🔧 生产环境建议

### 1. 安全配置

生产环境建议修改默认密码：

```bash
# 创建 .env 文件覆盖默认配置
cat > .env << EOF
MYSQL_ROOT_PASSWORD=<your_strong_password>
JWT_SECRET=<your_random_64_char_string>
ENCRYPTION_KEY=<your_random_32_char_string>
RABBITMQ_DEFAULT_PASS=<your_strong_password>
EOF

# 重新启动服务
docker-compose down
docker-compose up -d
```

### 2. 修改管理员密码

登录系统后，立即修改默认管理员密码：
1. 使用 `admin@easyworkflow.com / admin123` 登录
2. 进入个人设置修改密码

### 3. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 4. HTTPS 配置

建议使用反向代理（如 Traefik 或 Nginx Proxy Manager）处理 SSL 证书。

### 5. 数据备份

设置定期备份任务：

```bash
# 每天凌晨 2 点备份
0 2 * * * docker-compose exec -T mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} easyworkflow > /backup/db_$(date +\%Y\%m\%d).sql
```

---

## 🧩 节点配置 (Node Configuration)

为了便于维护，节点配置已解耦：
- **API 节点**: 支持多种认证方式 (Bearer, Basic, OAuth2)、Headers、Body 以及预请求/测试脚本。
- **处理节点**: Node.js 或 Python 风格的沙箱，用于数据转换。
- **LLM 节点**: 集成 LLM 提供商（默认通过代理/直连调用 Gemini）。

---

## 🐛 故障排除

### 服务启动失败

```bash
# 检查日志
docker-compose logs backend

# 检查容器状态
docker-compose ps

# 重置环境
docker-compose down -v
docker-compose up -d
```

### 数据库连接失败

```bash
# 检查 MySQL 是否就绪
docker-compose exec mysql mysqladmin ping -h localhost

# 检查数据库是否存在
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"
```

### 前端无法访问后端 API

- 检查 Nginx 配置中的代理设置
- 确认后端服务已启动并健康
- 检查网络连接

---

## 📝 许可证 (License)

Private / Enterprise
