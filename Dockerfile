# 多阶段构建 Dockerfile
# 阶段 1：构建前端应用
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用（默认使用根路径 /）
# 如果需要指定其他路径，可以通过构建参数传入
ARG BASE_PATH=/CloudOps
ENV VITE_BASE_PATH=${BASE_PATH}

# 执行构建
RUN npm run build

# 阶段 2：使用 Nginx 提供静态文件服务
FROM nginx:alpine

# 安装必要的工具（可选）
RUN apk add --no-cache bash

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]

# 构建说明：
#
# 1. 默认构建（部署在根路径 /）：
#    docker build -t cloudops:latest .
#
# 2. 指定部署路径构建：
#    docker build --build-arg BASE_PATH=/MeetPro/ -t cloudops:meetpro .
#
# 3. 运行容器：
#    docker run -d -p 8080:80 --name cloudops cloudops:latest
#
# 4. 访问应用：
#    http://localhost:8080/
#
# 注意：
# - 如果使用构建参数指定了 BASE_PATH，需要确保 nginx.conf 中的配置与之匹配
# - 或者在运行时通过挂载自定义 nginx.conf 来覆盖默认配置
