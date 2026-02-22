# 阶段1: 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 安装构建工具 (isolated-vm 需要编译原生模块)
RUN apk add --no-cache \
    openssl \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

# 复制 package 文件
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# 安装依赖
RUN npm ci

# 复制源代码
COPY backend/ .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 阶段2: 运行阶段
FROM node:22-alpine AS runner

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache openssl curl netcat-openbsd

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# 复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 复制启动脚本
COPY docker/backend/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 设置文件所有权
RUN chown -R nestjs:nodejs /app

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -s http://localhost:3001/api/v1/auth/me || exit 1

# 启动应用
CMD ["/app/start.sh"]
