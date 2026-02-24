![EasyWorkflow](https://github.com/leonda123/EasyWorkflow/blob/main/doc/easyworkflow_new.png)
# EasyWorkflow

[English](README.md) | [中文](README_CN.md)

A high-performance, enterprise-grade low-code workflow orchestration platform built with React and React Flow.

## 🌐 Live Demo

**Demo URL:** http://115.190.8.7/

**Demo Credentials:** `test@easyworkflow.com` / `test123`

**📖 User Manual:** https://my.feishu.cn/wiki/QkWpw4GJTiBqGhk6yH9crJVxnTg

## 📸 Screenshots

> 📷 Demo screenshots and GIF animations will be placed here

<!--
![EasyWorkflow Demo](./docs/demo.webp)
![Workflow Editor](./docs/editor.webp)
-->
![demo1](https://github.com/leonda123/EasyWorkflow/blob/main/doc/demo1.gif)
![demo2](https://github.com/leonda123/EasyWorkflow/blob/main/doc/demo2.gif)
![demo3](https://github.com/leonda123/EasyWorkflow/blob/main/doc/demo3.gif)
![demo4](https://github.com/leonda123/EasyWorkflow/blob/main/doc/demo4.gif)
![demo5](https://github.com/leonda123/EasyWorkflow/blob/main/doc/demo5.gif)
---

## 🎯 Why EasyWorkflow?

In the rapidly evolving landscape of AI-powered workflow automation, platforms like **Dify**, **Coze**, and **n8n** have made significant contributions to the low-code/no-code space. However, when it comes to **enterprise-grade workflow orchestration**, these platforms may have certain limitations:

| Challenge | Common Platforms | EasyWorkflow |
|-----------|------------------|--------------|
| **LLM Configuration** | Complex setup, vendor lock-in | Simple configuration, multi-provider support |
| **Private Deployment** | Limited self-hosting options | Full control, on-premise ready |
| **Scheduling Flexibility** | Fixed patterns | Customizable scheduling strategies |
| **Enterprise Integration** | Basic API support | Comprehensive API & webhook ecosystem |
| **Execution Control** | Limited visibility | Full execution tracing & analytics |

### 🏢 Built for Enterprise

EasyWorkflow is designed from the ground up with **enterprise requirements** in mind:

- **🔒 Private Deployment**: Full control over your data and infrastructure
- **⚡ High Performance**: Optimized for high-throughput workflow execution
- **🔌 Easy Integration**: Simple LLM provider configuration without vendor lock-in
- **📊 Full Observability**: Complete execution tracing and performance analytics
- **🎛️ Flexible Scheduling**: Custom scheduling strategies that adapt to your business needs

---

## ✨ Key Features

### 🚀 Message Queue Support
- RabbitMQ integration for async task processing
- Reliable message delivery with retry mechanism
- Queue monitoring and management
- **Enterprise-grade reliability** for mission-critical workflows

### 🤖 LLM API Orchestration
- Support for multiple LLM providers (OpenAI, Gemini, Azure, local models, etc.)
- **Perfect for private deployment scenarios** - connect to your own LLM servers
- Configurable rate limiting and concurrency control
- **Simple configuration** - just add your API endpoint and key
- Support for custom model endpoints (Ollama, vLLM, etc.)

### 📦 Release Management
- Version control with deployment history
- One-click rollback to previous versions
- Workflow version comparison
- **Production-ready deployment pipeline**

### 📊 Execution Statistics
- Real-time execution monitoring
- Success rate analytics and performance metrics
- Detailed execution logs with step-by-step tracing
- **Complete visibility** into workflow performance

### 🔑 API Key Management
- **Global API Key**: System-wide access for integrations
- **Workflow-specific API Key**: Fine-grained access control
- Secure key generation and revocation
- **Enterprise security standards**

### ✨ AI Node Generation
- Convert API documentation/URL to HTTP request nodes automatically
- cURL command parsing and node creation
- Smart parameter detection and configuration
- **Accelerate development** with intelligent automation

### 💬 EasyBot Chat
- Built-in AI chat assistant
- Natural language workflow design assistance
- Intelligent suggestions and automation
- **Lower the learning curve** for new users

### 🌐 Internationalization
- Chinese and English language support
- Extensible i18n framework
- Locale-aware date/time formatting
- **Global team collaboration**

### 🔧 Rich Node Library

| Category | Nodes |
|----------|-------|
| **Triggers** | Webhook, Cron, Form, Manual |
| **Actions** | HTTP Request, Database Query, Delay, LLM |
| **Logic** | Code Sandbox (Node.js/Python), If/Else, Switch |

---

## 🎨 Visual Workflow Editor

- **Drag & Drop**: Intuitive canvas based on React Flow v12
- **Smart Tools**: Multi-select, copy/paste, partial execution
- **Real-time Preview**: Live execution tracking with logs
- **Variable System**: Dynamic data passing with `{{steps.nodeId.data.key}}` syntax

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| Zustand | State Management |
| @xyflow/react | Flow Engine |
| Tailwind CSS | Styling |
| Vite | Build Tool |

### Backend
| Technology | Purpose |
|------------|---------|
| NestJS 11 | API Framework |
| Prisma 5 | ORM |
| MySQL 8.0 | Database |
| RabbitMQ | Message Queue |
| Socket.io | Real-time Communication |

---

## 🚀 Getting Started

### Option 1: Local Development

#### Frontend
```bash
npm install
npm run dev
```

#### Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev
```

Access: http://localhost:3000

### Option 2: Docker Deployment (Recommended)

```bash
git clone <repository-url>
cd EasyWorkflow
docker-compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:3001/api/v1 |
| RabbitMQ Management | http://localhost:15673 |

**Default Credentials:** `admin@easyworkflow.com` / `admin123`

---

## 📂 Project Structure

```
├── components/          # React components
│   ├── ai/             # AI Copilot
│   ├── flow/           # Workflow editor
│   └── nodes/config/   # Node configuration
├── store/              # Zustand stores
├── backend/            # NestJS backend
│   ├── src/            # Source code
│   └── prisma/         # Database schema
├── docker/             # Docker configs
└── locales.ts          # i18n translations
```

---

## 📦 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Stop services
docker-compose down
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact

For questions or feedback, please contact: **dadajiu45@gmail.com**

---

## 🙏 Acknowledgments

- [React Flow](https://reactflow.dev/) - Amazing flow library
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
