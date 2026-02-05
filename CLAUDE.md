# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

CloudOps Deployer Pro 是一个全栈 DevOps 管理平台，用于管理 CI/CD 流水线、Kubernetes 资源和 Jenkins 任务。

**技术栈：**
- 前端：React 19 + TypeScript + Vite + Recharts（图表）
- 后端：Spring Boot 3.2.2 + JPA + MySQL
- AI 集成：Google Gemini API（用于智能流水线分析）
- Java 版本：17

## 开发命令

### 前端开发
```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口：通常是 5173）
npm run dev

# 构建生产版本
npm build

# 预览生产构建
npm run preview
```

### 后端开发
```bash
# 进入后端目录
cd backend

# 使用 Maven 运行 Spring Boot 应用（端口 8080）
mvn spring-boot:run

# 构建项目
mvn clean package

# 运行测试
mvn test
```

### 数据库初始化
```bash
# 使用 MySQL 客户端执行初始化脚本
mysql -u root -p < backend/db_init.sql
```

## 架构说明

### 前端架构
- **App.tsx**：主应用组件，管理视图状态（Dashboard、Wizard、K8sExplorer、JenkinsJobs）
- **components/**：四个主要视图组件
  - Dashboard：仪表板，显示统计信息
  - PipelineWizard：流水线创建向导
  - K8sExplorer：Kubernetes 资源浏览器
  - JenkinsJobs：Jenkins 任务管理
  - Layout：通用布局组件
- **services/geminiService.ts**：集成 Gemini AI，用于生成流水线配置的智能解释
- **types.ts**：TypeScript 类型定义
- **constants.tsx**：常量定义

### 后端架构
采用标准的 Spring Boot 分层架构：

**包结构：**
- `com.heitasoft.cloudops`
  - `controller/`：REST API 控制器
    - DashboardController：仪表板统计 API
    - JenkinsController：Jenkins 任务管理 API
    - K8sController：Kubernetes 资源管理 API
    - PipelineController：流水线配置 API
  - `entity/`：JPA 实体类
    - JenkinsJob：Jenkins 任务实体
    - PipelineConfig：流水线配置实体
    - `k8s/`：K8s 资源实体（K8sDeployment、K8sPod、K8sService、K8sIngress）
  - `repository/`：Spring Data JPA 仓库接口
  - `dto/`：数据传输对象（如 DashboardStats）
  - `config/`：配置类（如 CorsConfig）

### 数据库设计
MySQL 数据库 `cloudops_db` 包含以下表：
- `pipeline_configs`：流水线配置（支持 node/java/python 技术栈）
- `jenkins_jobs`：Jenkins 任务执行记录（外键关联到 pipeline_configs）
- `k8s_deployments`：Kubernetes Deployment 资源
- `k8s_pods`：Kubernetes Pod 资源（外键关联到 k8s_deployments）
- `k8s_services`：Kubernetes Service 资源
- `k8s_ingresses`：Kubernetes Ingress 资源

## 配置要求

### 环境变量
- **前端**：需要在 `.env.local` 中设置 `GEMINI_API_KEY`（用于 AI 功能）
- **后端**：在 `backend/src/main/resources/application.properties` 中配置：
  - MySQL 连接信息（默认：localhost:3306，用户名/密码：root/root）
  - CORS 允许的前端地址（默认：http://localhost:3000）

### 数据库
- 需要 MySQL 8.0+
- 数据库名称：`cloudops_db`
- 字符集：utf8mb4

## 关键功能模块

1. **流水线向导（Pipeline Wizard）**：
   - 支持多种技术栈（Node.js、Java、Python）
   - 配置 Git 仓库、Docker 镜像、构建参数
   - 使用 Gemini AI 生成配置说明

2. **Kubernetes 资源管理**：
   - 查看和管理 Deployments、Pods、Services、Ingresses
   - 支持命名空间过滤
   - 实时状态监控

3. **Jenkins 集成**：
   - 查看任务执行状态
   - 显示构建历史和持续时间
   - 关联到流水线配置

4. **仪表板**：
   - 统计活跃流水线、Jenkins 任务、K8s 资源
   - 可视化图表展示

## 注意事项

- 前端和后端需要分别启动
- 确保 MySQL 服务运行并已执行 `db_init.sql`
- Gemini API 功能需要有效的 API 密钥
- 后端默认端口 8080，前端开发服务器通常使用 5173
- CORS 配置需要根据实际前端端口调整
