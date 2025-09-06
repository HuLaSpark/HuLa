# HuLa 项目入门手册 🚀

<p align="center">
  <img width="350px" height="150px" src="../src/assets/logo/hula.png"/>
</p>

<p align="center">基于 Tauri、Vite 7、Vue 3 和 TypeScript 构建的跨平台即时通讯系统完整开发指南</p>

---

## 📋 目录
- [环境要求](#-环境要求)
- [环境配置与安装](#️-环境配置与安装)
- [项目启动](#-项目启动)
- [项目目录结构](#-项目目录结构)
- [服务地址配置](#-服务地址配置)
- [如何提交 Issues 和 PR](#-如何提交-issues-和-pr)

---

## 🔧 环境要求

在开始开发之前，请确保您的系统满足以下要求：

### 必需环境

| 环境 | 版本要求 | 说明 |
|------|---------|------|
| **Node.js** | `^20.19.0` 或 `>=22.12.0` | JavaScript 运行环境 |
| **pnpm** | `>=10.x` | 包管理器，必须使用 pnpm |
| **Rust** | `最新稳定版` | Tauri 后端开发需要 |
| **Git** | `2.0+` | 版本控制 |

### 操作系统支持

| 平台 | 支持版本 |
|------|---------|
| **Windows** | Windows 10, Windows 11 |
| **macOS** | macOS 10.15+ |
| **Linux** | Ubuntu 20.04+ |
| **iOS/iPadOS** | iOS 13.0+, iPadOS 13.0+ |
| **Android** | Android 8.0+ (API 26+) |

---

## ⚙️ 环境配置与安装

### 1. 安装 Node.js 和 pnpm

**Windows:**
```bash
# 方法1: 使用 winget 安装 Node.js
winget install OpenJS.NodeJS

# 方法2: 从官网下载安装包
# 访问 https://nodejs.org/ 下载 LTS 版本

# 安装 pnpm
npm install -g pnpm@latest
```

**macOS:**
```bash
# 使用 Homebrew 安装
brew install node pnpm

# 或使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
npm install -g pnpm@latest
```

**Linux (Ubuntu/Debian):**
```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm@latest
```

### 2. 安装 Rust 和 Tauri 环境

**所有平台:**
```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 验证安装
rustc --version
cargo --version
```

**Windows 额外要求:**

详细安装步骤：

1. **安装 Microsoft C++ Build Tools**
   ```bash
   # 方法1: 使用 winget 安装
   winget install Microsoft.VisualStudio.2022.BuildTools

   # 方法2: 下载安装包
   # 访问 https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   ```

2. **或者安装 Visual Studio Community 2022**
   ```bash
   # 使用 winget 安装
   winget install Microsoft.VisualStudio.2022.Community

   # 必须勾选以下工作负载：
   # - 使用 C++ 的桌面开发
   # - MSVC v143 编译器工具集
   # - Windows 10/11 SDK (最新版本)
   ```

3. **安装 WebView2 Runtime (通常已预装)**
   ```bash
   # 检查是否已安装 WebView2
   winget list --name "Microsoft Edge WebView2"

   # 如未安装，执行：
   winget install Microsoft.EdgeWebView2Runtime
   ```

4. **重启命令行工具**
   安装完成后，重新打开 PowerShell 或 CMD 以确保环境变量生效。

**Linux 额外要求:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Fedora
sudo dnf install webkit2gtk3-devel.x86_64 \
    openssl-devel \
    curl \
    wget \
    libappindicator-gtk3 \
    librsvg2-devel

# Arch
sudo pacman -S webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg \
    libvips
```

### 3. 移动端开发环境 (可选)

**Android 开发:**
```bash
# 安装 Android Studio 和 SDK
# 设置 ANDROID_HOME 环境变量

# 初始化 Android 项目
pnpm run tauri:android:init
```

**iOS 开发 (仅 macOS):**
```bash
# 安装 Xcode 和 Xcode Command Line Tools
xcode-select --install

# 初始化 iOS 项目
pnpm run tauri:ios:init
```

---

## 🚀 项目启动

### 1. 克隆项目

```bash
# 从 GitHub 克隆
git clone https://github.com/HuLaSpark/HuLa.git

# 或从 Gitee 克隆（国内推荐）
git clone https://gitee.com/HuLaSpark/HuLa.git

# 进入项目目录
cd HuLa
```

### 2. 安装依赖

```bash
# 使用 pnpm 安装所有依赖
pnpm install

# 如果在国内网络环境下遇到问题，可以设置镜像
pnpm config set registry https://registry.npmmirror.com/
```

### 3. 启动开发环境

```bash
# 启动桌面应用开发环境（推荐）
pnpm run tauri:dev
# 简化命令
pnpm run td

# 启动 Android 开发环境
pnpm run tauri:android:dev
# 简化命令
pnpm run adev

# 启动 iOS 开发环境（仅 macOS）
pnpm run tauri:ios:dev
# 简化命令
pnpm run idev
```

### 4. 构建生产版本

```bash
# 构建桌面应用
pnpm run tauri:build
# 简化命令
pnpm run tb
```

### 5. 代码质量检查

```bash
# 检查代码格式和问题（不修复）
pnpm run check

# 修复代码格式和问题
pnpm run check:write

# 格式化所有文件（包括 Vue 组件）
pnpm run format:all

# Git 提交前的代码检查
pnpm run lint:staged
```

### 6. 测试

```bash
# 运行单元测试
pnpm run test:run

# 运行测试 UI 界面
pnpm run test:ui

# 生成测试覆盖率报告
pnpm run coverage
```

---

## 📁 项目目录结构

```
HuLa/
├── 📁 src/                      # Vue 3 前端源码
│   ├── 📁 agreement/            # 用户协议相关组件
│   ├── 📁 assets/               # 静态资源
│   │   ├── 📁 fonts/            # 字体文件
│   │   ├── 📁 img/              # 图片资源
│   │   ├── 📁 logo/             # Logo 资源
│   │   ├── 📁 mobile/           # 移动端专用资源
│   │   └── 📁 video/            # 视频资源
│   ├── 📁 components/           # Vue 组件
│   │   ├── 📁 common/           # 公共组件
│   │   ├── 📁 rightBox/         # 右侧功能组件
│   │   └── 📁 windows/          # 窗口组件
│   ├── 📁 directives/           # Vue 自定义指令
│   ├── 📁 enums/               # 枚举定义
│   ├── 📁 hooks/               # Vue 3 组合式 API Hooks
│   ├── 📁 layout/              # 布局组件
│   │   ├── 📁 center/          # 中央布局
│   │   └── 📁 left/            # 左侧布局
│   ├── 📁 mobile/              # 移动端专用代码
│   ├── 📁 plugins/             # 插件配置
│   ├── 📁 router/              # Vue Router 路由配置
│   ├── 📁 services/            # API 服务层
│   ├── 📁 stores/              # Pinia 状态管理
│   ├── 📁 styles/              # 全局样式
│   ├── 📁 typings/             # TypeScript 类型定义
│   ├── 📁 utils/               # 工具函数
│   ├── 📁 views/               # 页面组件
│   ├── 📁 workers/             # Web Workers
│   ├── 📄 App.vue              # 根组件
│   └── 📄 main.ts              # 应用入口文件
├── 📁 src-tauri/               # Tauri Rust 后端源码
│   ├── 📁 capabilities/         # Tauri 权限配置
│   ├── 📁 configuration/        # 应用配置
│   ├── 📁 entity/              # 数据库实体
│   ├── 📁 icons/               # 应用图标
│   ├── 📁 migration/           # 数据库迁移
│   ├── 📁 src/                 # Rust 源码
│   ├── 📁 tray/                # 系统托盘相关
│   ├── 📄 Cargo.toml           # Rust 项目配置
│   ├── 📄 tauri.conf.json      # Tauri 主配置
│   ├── 📄 tauri.*.conf.json    # 平台特定配置
│   └── 📄 db.sqlite            # SQLite 数据库
├── 📁 public/                  # 静态资源文件
│   ├── 📁 AI/                  # AI 相关资源
│   ├── 📁 avatar/              # 头像资源
│   ├── 📁 emoji/               # 表情包资源
│   ├── 📁 sound/               # 音频文件
│   └── 📄 logo.png             # 应用 Logo
├── 📁 scripts/                 # 构建和开发脚本
│   ├── 📄 check-all.js         # 环境检查脚本
│   ├── 📄 check-dependencies.js # 依赖检查脚本
│   └── 📄 interactive-build-inquirer.js # 交互式构建脚本
├── 📁 docs/                    # 项目文档
├── 📁 preview/                 # 项目预览图
├── 📁 build/                   # 构建输出目录
├── 📁 .husky/                  # Git hooks 配置
├── 📁 .vscode/                 # VS Code 配置
├── 📄 package.json             # 项目依赖和脚本配置
├── 📄 pnpm-lock.yaml           # 依赖版本锁定文件
├── 📄 tsconfig.json            # TypeScript 配置
├── 📄 vite.config.ts           # Vite 构建配置
├── 📄 uno.config.ts            # UnoCSS 配置
├── 📄 biome.json               # 代码格式化配置
├── 📄 vitest.config.ts         # 测试配置
└── 📄 README.md                # 项目说明文档
```

### 核心目录说明

| 目录 | 作用 | 技术栈 |
|------|------|--------|
| `src/` | Vue 3 前端应用源码 | Vue 3 + TypeScript + Vite |
| `src-tauri/` | Tauri Rust 后端源码 | Rust + Tauri + SQLite |
| `src/components/` | 可复用 Vue 组件 | Vue 3 Composition API |
| `src/stores/` | 状态管理 | Pinia + TypeScript |
| `src/services/` | API 接口服务 | Axios + TypeScript |
| `src/hooks/` | 自定义 Hooks | Vue 3 Composition API |
| `src/utils/` | 工具函数库 | TypeScript + Lodash |
| `src/styles/` | 全局样式 | Sass + UnoCSS |
| `public/` | 静态资源文件 | 图片、音频、字体等 |

---

## 🐛 如何提交 Issues 和 PR

### 提交 Issue

1. **🔍 搜索现有 Issues**
   - 在提交新 Issue 前，请先搜索是否已有类似问题
   - 访问 [GitHub Issues](https://github.com/HuLaSpark/HuLa/issues)

2. **📝 创建新 Issue**
   ```markdown
   **问题描述**
   清晰描述您遇到的问题

   **复现步骤**
   1. 进入...
   2. 点击...
   3. 出现错误...

   **期望行为**
   描述您期望发生的情况

   **环境信息**
   - 操作系统: [例如 Windows 11]
   - Node.js 版本: [例如 v22.12.0]
   - HuLa 版本: [例如 v2.6.13]

   **截图或日志**
   如有可能，请提供相关截图或错误日志
   ```

### 提交 Pull Request

1. **🍴 Fork 项目**
   ```bash
   # 点击 GitHub 页面右上角的 "Fork" 按钮
   # 然后克隆您的 Fork
   git clone https://github.com/你的用户名/HuLa.git
   cd HuLa
   ```

2. **🌿 创建功能分支**
   ```bash
   # 创建并切换到新分支
   git checkout -b feature/your-feature-name

   # 或修复分支
   git checkout -b fix/your-bug-fix
   ```

3. **💻 开发和测试**
   ```bash
   # 安装依赖
   pnpm i

   # 启动开发环境
   pnpm run td

   # 运行代码检查
   pnpm run lint:staged

   # 运行测试
   pnpm run test:run
   ```

4. **📝 提交代码**
   ```bash
   # 使用项目提供的提交工具（推荐）
   pnpm run commit

   # 或传统方式提交
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

5. **🚀 推送和创建 PR**
   ```bash
   # 推送到您的 Fork
   git push origin feature/your-feature-name

   # 在 GitHub 上创建 Pull Request
   ```

### 代码提交规范

项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加消息撤回功能` |
| `fix` | 修复 Bug | `fix: 修复登录页面样式问题` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 代码格式化 | `style: 格式化组件代码` |
| `refactor` | 重构代码 | `refactor: 优化消息发送逻辑` |
| `perf` | 性能优化 | `perf: 优化图片加载性能` |
| `test` | 添加测试 | `test: 添加登录功能单元测试` |
| `chore` | 构建过程或辅助工具变动 | `chore: 更新依赖版本` |

### 代码审查流程

1. **自动检查**: PR 提交后会自动运行 CI 检查
2. **代码审查**: 维护者会审查您的代码
3. **修改完善**: 根据反馈修改代码
4. **合并入库**: 审查通过后合并到主分支

---

## 🔧 服务地址配置

### 修改服务地址的文件列表

当您需要修改 HuLa 项目连接的后端服务地址时，需要修改以下文件：

| 文件路径 | 作用 | 修改内容 |
|---------|------|----------|
| **`.env.development`** | 开发环境配置 | `VITE_SERVICE_URL` 和 `VITE_WEBSOCKET_URL` |
| **`.env.production`** | 生产环境配置 | `VITE_SERVICE_URL` 和 `VITE_WEBSOCKET_URL` |
| **`.env.development.local`** | 本地开发环境配置 | 覆盖开发环境的配置 |

### 具体配置说明

#### 1. 前端环境配置

**开发环境配置 (`.env.development`)**

```bash
# 后端 API 服务地址
VITE_SERVICE_URL="https://your-api-server.com/api"

# WebSocket 服务地址
VITE_WEBSOCKET_URL="wss://your-api-server.com/api/ws/ws"

# 项目标题
VITE_APP_TITLE="HuLa—IM"

# 项目名称
VITE_APP_NAME="HuLa"

# Gitee Token (用于更新检查)
VITE_GITEE_TOKEN="your_gitee_token_here"

# TURN 信令服务器配置 (可选，用于 WebRTC 通话)
VITE_TURN_SERVER_URL="turn:your-turn-server.com:3478"
VITE_TURN_SERVER_USER="username"
VITE_TURN_SERVER_PWD="password"

# 是否使用 Rust WebSocket 实现
VITE_USE_RUST_WEBSOCKET=true
```

**生产环境配置 (`.env.production`)**

```bash
# 后端 API 服务地址 (生产环境)
VITE_SERVICE_URL="https://hulaspark.com/api"

# WebSocket 服务地址 (生产环境)
VITE_WEBSOCKET_URL="wss://hulaspark.com/api/ws/ws"

# 其他配置同开发环境
```

**本地开发配置 (`.env.development.local` - 可选)**

如果您有本地后端服务，可以创建此文件来覆盖开发环境配置：

```bash
# 本地后端服务地址
VITE_SERVICE_URL="http://localhost:8080/api"
VITE_WEBSOCKET_URL="ws://localhost:8080/ws/ws"

# 或者局域网地址
# VITE_SERVICE_URL="http://192.168.1.100:8080/api"
# VITE_WEBSOCKET_URL="ws://192.168.1.100:8080/ws/ws"
```

### 配置优先级

环境变量文件的加载优先级（从高到低）：

1. `.env.development.local` (开发环境，最高优先级)
2. `.env.development` (开发环境默认)
3. `.env.production` (生产环境)
4. `.env` (全局默认)

### 注意事项

- ⚠️ **不要将** `.env.development.local` **提交到 Git**，该文件用于本地开发配置
- 🔄 修改环境变量后需要**重启开发服务器**才能生效
- 🌐 WebSocket 地址协议：开发环境通常用 `ws://`，生产环境用 `wss://`
- 🔒 生产环境建议使用 HTTPS/WSS 协议确保安全性
- ❗ **重要：`base_url` 和 `VITE_SERVICE_URL` 必须保持一致**，否则前后端请求会失败

#### 2. Tauri 后端配置

Tauri 后端有独立的配置系统，用于管理数据库连接和后端服务地址：

**环境控制文件 (`src-tauri/.env`)**

```bash
# Rust 调试信息级别
RUST_BACKTRACE=1

# 应用运行环境 (local/production)
# APP_ENVIRONMENT=local
APP_ENVIRONMENT=production
```

**基础配置 (`src-tauri/configuration/base.yaml`)**

```yaml
# 数据库配置
database:
  sqlite_file: db.sqlite

# 后端服务配置
backend:
  base_url: https://hulaspark.com/api
```

**本地环境配置 (`src-tauri/configuration/local.yaml`)**

```yaml
# 本地开发环境配置
database:
  sqlite_file: db.sqlite

backend:
  base_url: http://localhost:8080/api
```

**生产环境配置 (`src-tauri/configuration/production.yaml`)**

```yaml
# 生产环境配置
database:
  sqlite_file: db.sqlite

backend:
  base_url: https://hulaspark.com/api
```

#### 3. 配置文件详细说明

| 配置文件 | 作用范围 | 主要配置项 | 优先级 |
|---------|---------|-----------|--------|
| **前端配置** |
| `.env.development` | Vue 前端开发环境 | `VITE_SERVICE_URL`、`VITE_WEBSOCKET_URL` | 中 |
| `.env.production` | Vue 前端生产环境 | 同上 | 中 |
| `.env.development.local` | Vue 前端本地开发 | 同上，覆盖开发环境配置 | **高** |
| **后端配置** |
| `src-tauri/.env` | Tauri 后端环境控制 | `APP_ENVIRONMENT` | **最高** |
| `src-tauri/configuration/base.yaml` | Tauri 后端基础配置 | `database`、`backend.base_url` | 低 |
| `src-tauri/configuration/local.yaml` | Tauri 后端本地环境 | 同上，用于本地开发 | 中 |
| `src-tauri/configuration/production.yaml` | Tauri 后端生产环境 | 同上，用于生产部署 | 中 |

#### 4. 配置加载机制

**前端配置加载顺序：**
1. `.env.development.local` (最高优先级，不提交到 Git)
2. `.env.development` 或 `.env.production` (根据构建模式)
3. `.env` (全局默认，如果存在)

**后端配置加载顺序：**
1. `src-tauri/.env` 中的 `APP_ENVIRONMENT` 决定环境
2. 加载 `base.yaml` 作为基础配置
3. 根据环境加载对应的 `local.yaml` 或 `production.yaml`
4. 环境变量 `APP_*` 可以覆盖 YAML 配置

#### 5. 环境切换方法

**切换到本地开发环境：**
```bash
# 修改 src-tauri/.env
APP_ENVIRONMENT=local

# 修改 .env.development.local (可选)
VITE_SERVICE_URL="http://localhost:8080/api"
VITE_WEBSOCKET_URL="ws://localhost:8080/ws/ws"
```

**切换到生产环境：**
```bash
# 修改 src-tauri/.env
APP_ENVIRONMENT=production

# 删除或注释 .env.development.local 中的本地配置
```

### 验证配置

修改配置后，可以通过以下方式验证：

```bash
# 重启开发服务器
pnpm run td

# 在浏览器控制台检查前端环境变量
console.log('Frontend API URL:', import.meta.env.VITE_SERVICE_URL)
console.log('Frontend WebSocket URL:', import.meta.env.VITE_WEBSOCKET_URL)

# 查看 Tauri 后端配置日志
# 启动应用后在终端查看日志输出：
# APP_ENVIRONMENT: production
# Database path: /path/to/db.sqlite
# Backend URL: https://hulaspark.com/api
```

---

## 🎯 开发建议

### 编辑器配置

推荐使用 **Visual Studio Code** 并安装以下插件：

```json
{
  "recommendations": [
    "vue.volar",
    "bradlc.vscode-tailwindcss",
    "rust-lang.rust-analyzer",
    "tauri-apps.tauri-vscode",
    "ms-vscode.vscode-typescript-next",
    "biomejs.biome"
  ]
}
```

### 开发工作流

1. **🔄 保持同步**: 定期从上游仓库拉取最新代码
2. **🧪 测试驱动**: 为新功能编写测试用例
3. **📚 文档更新**: 及时更新相关文档
4. **🎨 代码风格**: 使用项目统一的代码风格
5. **🐛 问题跟踪**: 及时反馈和修复发现的问题

---

## 🤝 社区交流

- 💬 **微信群**: 扫描 README 中的二维码加入讨论群
- 🌟 **GitHub**: [https://github.com/HuLaSpark/HuLa](https://github.com/HuLaSpark/HuLa)
- 🦄 **Gitee**: [https://gitee.com/HulaSpark/HuLa](https://gitee.com/HulaSpark/HuLa)
- 📧 **邮箱**: 2439646234@qq.com
- 🌐 **官网**: [https://hulaspark.com](https://hulaspark.com)

---

## 🎉 开始您的 HuLa 开发之旅

现在您已经掌握了 HuLa 项目的完整开发指南！快来加入我们，一起构建更好的即时通讯体验吧！

如果在开发过程中遇到任何问题，请不要犹豫地：
1. 📖 查阅此文档
2. 🔍 搜索现有 Issues
3. 💬 在社区群中提问
4. 🐛 创建新的 Issue

**祝您开发愉快！** 🚀✨
