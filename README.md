# AAB To APK 转换工具

> 一个免费的在线 AAB 转 APK 工具，面向 Android 开发者。上传 `.aab` 文件，自动转换为可安装的 `.apk` 文件。

## ✨ 功能特点

- 🚀 **免费使用** — 无需注册账号，无需付费
- 🔒 **安全可靠** — 文件 1 小时后自动从服务器删除
- ⚡ **实时进度** — 上传、转换进度可视化，显示已用时和预计剩余时间
- 📋 **转换记录** — 本地保存历史记录，方便查阅
- 📱 **一键下载** — 转换完成即可下载 APK

## 🖥️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + TypeScript + Tailwind CSS v3 |
| 后端 | Node.js + Express 5 + TypeScript |
| 转换 | Google bundletool v1.17.2 + OpenJDK 17 |
| 状态管理 | Zustand + localStorage 持久化 |
| 动效 | Framer Motion |
| 图标 | Lucide React |

## 📁 项目结构

```
aab-to-apk/
├── frontend/               # React + Vite 前端
│   ├── src/
│   │   ├── components/     # 页面组件（Header、UploadZone、ConversionHistory 等）
│   │   ├── services/       # API 客户端（上传、下载）
│   │   ├── store/          # Zustand 状态管理（转换状态、历史记录）
│   │   └── hooks/          # 自定义 Hooks
│   ├── index.html
│   └── package.json
│
├── backend/                # Express 5 API 后端
│   ├── src/
│   │   └── routes/
│   │       └── convert.ts  # 核心转换路由
│   ├── bundletool/
│   │   ├── bundletool.jar  # ⚠ 需自行下载（见下方说明）
│   │   └── debug.keystore  # 调试签名证书
│   └── package.json
│
└── .github/workflows/      # GitHub Actions CI/CD 配置
```

## 🚀 本地运行

### 环境要求

- **Node.js** v18+（推荐 v20）
- **pnpm** 包管理器
- **Java** 17+（必须，用于运行 bundletool）
- **unzip**（macOS 自带；Linux: `sudo apt install unzip`）

### 1. 下载 bundletool.jar

访问 [bundletool Releases](https://github.com/google/bundletool/releases/tag/1.17.2)，下载 `bundletool-all-1.17.2.jar`，重命名为 `bundletool.jar`，放入 `backend/bundletool/` 目录。

### 2. 安装依赖

```bash
# 安装前端依赖
cd frontend && pnpm install

# 安装后端依赖
cd ../backend && pnpm install
```

### 3. 配置环境变量

在 `frontend/` 目录创建 `.env.local`：

```env
VITE_API_URL=http://localhost:8080
```

### 4. 启动服务

**终端 1 — 启动后端（端口 8080）：**

```bash
cd backend
pnpm run dev
```

**终端 2 — 启动前端：**

```bash
cd frontend
pnpm run dev
```

打开浏览器访问：**http://localhost:5173**

## 🔑 关于签名

本工具使用调试签名证书（`debug.keystore`）对 APK 进行签名，适合测试安装到 Android 设备。**不能用于上架 Google Play**，如需发布请使用自己的 release keystore。

生成调试证书的命令（已内置，供参考）：

```bash
keytool -genkey -v -keystore debug.keystore -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android -keypass android \
  -dname "CN=Android Debug,O=Android,C=US"
```

## 🌐 部署

项目支持部署到任何支持 Node.js 的平台（Replit、Railway、Render 等）。
部署时需确保服务器已安装 Java 17+ 和 unzip。

## 📄 License

MIT
