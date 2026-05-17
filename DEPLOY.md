# AAB To APK — 免费永久部署指南

> **方案：前端 Vercel（免费永久）+ 后端 Render（免费永久）**
> 两者均无时间限制，无需信用卡，国内可访问。

---

## 一、前置准备

1. **GitHub 账号** — 需要将代码托管到 GitHub
2. **Render 账号** — https://render.com （用 GitHub 登录即可）
3. **Vercel 账号** — https://vercel.com （用 GitHub 登录即可）

---

## 二、推送代码到 GitHub

```bash
# 在项目根目录 aab-to-apk/
git init
git add .
git commit -m "init: aab-to-apk ready for deployment"

# 在 GitHub 新建仓库后：
git remote add origin https://github.com/你的用户名/aab-to-apk.git
git push -u origin main
```

> ⚠️ bundletool.jar 已加入 .gitignore（文件太大），Dockerfile 在构建时会自动从 GitHub 下载。

---

## 三、部署后端到 Render（含 Java 环境）

### 方法 A：通过 render.yaml 一键部署（推荐）

1. 登录 https://render.com
2. 点击 **New → Blueprint**
3. 连接你的 GitHub 仓库
4. Render 会自动识别 `render.yaml`，点击 **Apply**
5. 等待约 5-10 分钟构建完成（需下载 bundletool.jar，约 32MB）
6. 记录你的后端 URL，形如：`https://aab-to-apk-api.onrender.com`

### 方法 B：手动创建服务

1. New → **Web Service**
2. 选择你的 GitHub 仓库
3. 配置：
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free
4. 添加环境变量：
   - `NODE_ENV` = `production`
   - `PORT` = `8080`
5. Deploy

---

## 四、部署前端到 Vercel

1. 登录 https://vercel.com
2. **Add New Project** → 导入 GitHub 仓库
3. **Root Directory**：改为 `frontend`
4. **Build Command**：`npm run build`（会自动检测）
5. **Output Directory**：`dist`
6. **环境变量**（关键！）：
   - 变量名：`VITE_API_URL`
   - 变量值：`https://aab-to-apk-api.onrender.com`（你第三步得到的 Render URL）
7. 点击 **Deploy**，约 1-2 分钟完成
8. 你会得到一个永久域名：`https://aab-to-apk-xxx.vercel.app`

---

## 五、验证

1. 访问 Vercel 给的域名
2. 上传一个 `.aab` 文件测试转换
3. 检查 Render 控制台日志确认后端正常接收请求

---

## 六、注意事项

### Render 免费版冷启动
- Render 免费实例在 **15 分钟无请求后会自动休眠**
- 下次请求时需要约 **30-50 秒**冷启动
- 可用 [UptimeRobot](https://uptimerobot.com) 每 14 分钟 ping 一次 `/api/healthz` 保持活跃（免费）

### 文件大小限制
- 后端默认支持最大 **500MB** 的 AAB 文件
- Render 免费版 RAM 512MB，建议 AAB 不超过 **200MB**

### 域名自定义（可选）
- Vercel 支持绑定自定义域名（免费）
- Render 也支持绑定自定义域名（免费）

---

## 七、备用方案：Fly.io

如果 Render 免费额度用完，可改用 Fly.io：

```bash
# 安装 flyctl
curl -L https://fly.io/install.sh | sh

# 登录
fly auth login

# 在项目根目录
fly launch --config fly.toml --no-deploy
fly deploy
```

Fly.io 免费提供 3 个共享 VM（256MB RAM），不会自动休眠。

---

## 八、GitHub Actions 自动部署（可选）

在 GitHub 仓库 Settings → Secrets 添加：

| Secret 名称 | 值 |
|---|---|
| `VITE_API_URL` | Render 后端 URL |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel 项目 .vercel/project.json 里 |
| `VERCEL_PROJECT_ID` | 同上 |
| `RENDER_DEPLOY_HOOK_URL` | Render 服务 Settings → Deploy Hook |

之后每次 `git push` 自动触发前后端同步部署。

---

## 九、本地测试（部署前验证）

```bash
# 构建 Docker 镜像（需要安装 Docker Desktop）
docker build -t aab-to-apk-api .
docker run -p 8080:8080 aab-to-apk-api

# 前端
cd frontend
npm install
VITE_API_URL=http://localhost:8080 npm run build
npm run serve
```

访问 http://localhost:4173 验证完整流程。
