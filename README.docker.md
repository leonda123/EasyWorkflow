# EasyWorkflow Docker 部署指南

本文档介绍如何使用 Docker 和 Docker Compose 部署 EasyWorkflow 应用。

## 目录

- [系统要求](#系统要求)
- [快速启动](#快速启动)
- [配置说明](#配置说明)
- [服务说明](#服务说明)
- [常用命令](#常用命令)
- [生产环境建议](#生产环境建议)
- [故障排除](#故障排除)

---

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

---

## 快速启动

### 1. 克隆项目

```bash
git clone <repository-url>
cd EasyWorkflow
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑环境变量（重要：修改默认密码！）
vim .env
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看启动日志
docker-compose logs -f
```

### 4. 初始化数据库

首次启动需要运行数据库迁移：

```bash
# 进入后端容器
docker-compose exec backend sh

# 运行数据库迁移
npx prisma migrate deploy

# 退出容器
exit
```

### 5. 访问应用

- **前端应用**: http://localhost
- **后端 API**: http://localhost:3001/api/v1
- **RabbitMQ 管理界面**: http://localhost:15672

---

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | `easyworkflow_mysql_2024` |
| `MYSQL_DATABASE` | 数据库名称 | `easy_workflow` |
| `JWT_SECRET` | JWT 密钥 | - |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `ENCRYPTION_KEY` | 数据加密密钥（32字符） | - |
| `RABBITMQ_DEFAULT_USER` | RabbitMQ 用户名 | `admin` |
| `RABBITMQ_DEFAULT_PASS` | RabbitMQ 密码 | - |

### 端口映射

| 服务 | 容器端口 | 主机端口 |
|------|----------|----------|
| 前端 (Nginx) | 80 | 80 |
| 后端 (NestJS) | 3001 | 3001 |
| MySQL | 3306 | 3306 |
| RabbitMQ AMQP | 5672 | 5672 |
| RabbitMQ 管理 | 15672 | 15672 |

---

## 服务说明

### 架构图

```
                    ┌─────────────────────────────────────┐
                    │           Docker Network            │
                    │                                     │
   用户 ──:80──►    │  ┌─────────┐      ┌─────────────┐   │
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

### 服务详情

#### Frontend (前端)

- **镜像**: Node.js 20 Alpine (构建) + Nginx Alpine (运行)
- **功能**: 提供 React 静态文件服务，反向代理 API 请求
- **健康检查**: `GET /health`

#### Backend (后端)

- **镜像**: Node.js 20 Alpine
- **功能**: NestJS API 服务，WebSocket 支持
- **健康检查**: `GET /api/v1/`

#### MySQL (数据库)

- **镜像**: MySQL 8.0
- **字符集**: utf8mb4
- **数据持久化**: `mysql_data` 卷

#### RabbitMQ (消息队列)

- **镜像**: RabbitMQ 3 Management Alpine
- **功能**: 工作流执行队列
- **数据持久化**: `rabbitmq_data` 卷

---

## 常用命令

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

### 调试

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 查看容器资源使用
docker stats
```

---

## 生产环境建议

### 1. 安全配置

```bash
# 修改所有默认密码
MYSQL_ROOT_PASSWORD=<strong_password>
JWT_SECRET=<random_64_char_string>
ENCRYPTION_KEY=<random_32_char_string>
RABBITMQ_DEFAULT_PASS=<strong_password>
```

### 2. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 3. HTTPS 配置

建议使用反向代理（如 Traefik 或 Nginx Proxy Manager）处理 SSL：

```yaml
# 添加 Traefik 标签
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
```

### 4. 数据备份

设置定期备份任务：

```bash
# 每天凌晨 2 点备份
0 2 * * * docker-compose exec -T mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} easy_workflow > /backup/db_$(date +\%Y\%m\%d).sql
```

### 5. 日志管理

配置日志轮转：

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 故障排除

### 常见问题

#### 1. 服务启动失败

```bash
# 检查日志
docker-compose logs backend

# 检查容器状态
docker-compose ps

# 检查网络
docker network ls
```

#### 2. 数据库连接失败

```bash
# 检查 MySQL 是否就绪
docker-compose exec mysql mysqladmin ping -h localhost

# 检查数据库是否存在
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"
```

#### 3. RabbitMQ 连接失败

```bash
# 检查 RabbitMQ 状态
docker-compose exec rabbitmq rabbitmqctl status

# 查看队列状态
docker-compose exec rabbitmq rabbitmqctl list_queues
```

#### 4. 前端无法访问后端 API

- 检查 Nginx 配置中的代理设置
- 确认后端服务已启动并健康
- 检查网络连接

### 重置环境

```bash
# 停止并删除所有容器、网络、卷
docker-compose down -v

# 重新启动
docker-compose up -d
```

---

## 技术支持

如有问题，请提交 Issue 或联系开发团队。
