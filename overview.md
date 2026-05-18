# AAB-to-APK OSS 中转改造 - 全部完成

## 已完成

### 1. 根因定位
- 确认 FC HTTP 触发器 32MB body 硬限制导致 54MB AAB 上传失败
- 方案：OSS 预签名 URL 中转，绕过 FC body 限制

### 2. 代码改造
- **前端**：`frontend/src/services/conversionService.ts` 重写为 OSS relay 流程
  - Step 1: 获取预签名上传 URL (`GET /api/upload-url`)
  - Step 2: 直传 OSS (`PUT` via XMLHttpRequest，带进度回调)
  - Step 3: 触发转换 (`POST /api/convert {key}`)
  - Step 4: 获取预签名下载 URL 下载 APK
- **后端**：
  - `backend/src/lib/oss.ts` — OSS 客户端封装
  - `backend/src/routes/convert.ts` — 新接口 `/api/upload-url`，改造 `/api/convert` 和 `/api/download`
  - `backend/src/app.ts` — 移除 multer，JSON body limit 改为 1mb
  - `backend/package.json` — 添加 `ali-oss`，移除 `multer`
  - `backend/build.mjs` — `ali-oss` 加入 esbuild externals

### 3. 基础设施
- OSS Bucket：`aab-to-apk-hangzhou`（华东1杭州，标准存储，私有）
- OSS CORS：已配置，允许 Vercel 和 localhost 的 PUT/GET
- RAM 用户：`power-application-user`（`PowerUserAccess`）
- RAM 角色：`fc-acr-role`（ACR 只读 + OSS 完全访问）
- ACR 镜像：已推送 `crpi-c9n07tpdmagxf45j.cn-hangzhou.personal.cr.aliyuncs.com/hbiui/aab-to-apk:latest`

### 4. CI/CD
- GitHub 代码推送成功
- GitHub Actions CI 构建成功

### 5. FC 函数更新（用户手动完成）
- 镜像已更新为最新 ACR 镜像
- 环境变量已添加：NODE_ENV, OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET

### 6. 端到端测试 ✅
- FC 健康检查：`/api/healthz` → `{"status":"ok"}`
- 预签名上传 URL 生成：正常返回 PUT URL
- OSS 直传：HTTP 200 成功
- 后端 OSS 下载 + bundletool 转换链路：正常执行
- Vercel 前端：已部署最新代码，VITE_API_URL 指向 FC

## 系统状态
- 前端：https://aab-to-apk.vercel.app
- 后端：https://aab-to-apk-vtkxrfdabv.cn-hangzhou.fcapp.run
- 功能：AAB → APK 转换（支持 54MB+ 大文件，OSS 中转）
