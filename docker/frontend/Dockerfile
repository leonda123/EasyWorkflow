# 阶段1: 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置 VITE_API_URL 为空，使 API 请求使用相对路径（由 Nginx 代理）
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

# 构建应用
RUN npm run build

# 阶段2: 运行阶段
FROM nginx:alpine

# 复制 Nginx 配置
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
