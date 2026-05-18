import { Router, type IRouter, type Request, type Response } from "express";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getSignedUploadUrl,
  uploadFile,
  downloadToFile,
  deleteObject,
  getObjectUrl,
  getObjectStream,
} from "../lib/oss";
import { logger } from "../lib/logger";

const execAsync = promisify(exec);

const router: IRouter = Router();

// Use OS temp dir so it works in any container/serverless environment
const tmpBase = process.env.TMP_DIR || os.tmpdir();
const workDir = path.join(tmpBase, "aab-work");

// bundletool and keystore are embedded in the image at /app/bundletool/
const bundletoolPath =
  process.env.BUNDLETOOL_PATH ||
  path.join(process.cwd(), "bundletool", "bundletool.jar");
const keystorePath =
  process.env.KEYSTORE_PATH ||
  path.join(process.cwd(), "bundletool", "debug.keystore");

fs.mkdirSync(workDir, { recursive: true });

// ---------------------------------------------------------------------------
// Debug endpoint — inspect container environment (unchanged)
// ---------------------------------------------------------------------------
router.get("/debug", (_req, res) => {
  try {
    const diskInfo = execSync("df -h /tmp 2>/dev/null || echo 'df not available'", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const javaVersion = execSync("java -version 2>&1", {
      encoding: "utf-8",
      timeout: 5000,
    });
    const bundletoolCheck = fs.existsSync(bundletoolPath)
      ? `exists (${Math.round(fs.statSync(bundletoolPath).size / 1024 / 1024)}MB)`
      : "MISSING";
    const keystoreCheck = fs.existsSync(keystorePath) ? "exists" : "MISSING";
    const tmpSpace = execSync(
      "du -sh /tmp 2>/dev/null; echo '---'; df -m /tmp 2>/dev/null || df -m / 2>/dev/null",
      { encoding: "utf-8", timeout: 5000 },
    );

    res.json({
      tmpBase,
      workDir,
      bundletoolPath,
      bundletoolCheck,
      keystorePath,
      keystoreCheck,
      diskInfo: diskInfo.trim(),
      tmpSpace: tmpSpace.trim(),
      javaVersion: javaVersion.trim().split("\n").slice(0, 3),
      memTotal: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      memFree: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
    });
  } catch (err: unknown) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ---------------------------------------------------------------------------
// GET /upload-url — 生成 OSS 预签名上传 URL
// ---------------------------------------------------------------------------
router.get("/upload-url", (req: Request, res: Response) => {
  const filename = req.query.filename as string | undefined;

  if (!filename) {
    res.status(400).json({ success: false, error: "缺少 filename 参数" });
    return;
  }

  if (!filename.toLowerCase().endsWith(".aab")) {
    res.status(400).json({ success: false, error: "仅支持 .aab 文件" });
    return;
  }

  const uploadId = uuidv4();
  const key = `uploads/${uploadId}/${filename}`;

  try {
    const uploadUrl = getSignedUploadUrl(key, "application/octet-stream", 900);
    const objectUrl = getObjectUrl(key);

    res.json({
      success: true,
      uploadUrl,
      key,
      objectUrl,
    });
  } catch (err) {
    logger.error({ err }, "生成上传 URL 失败");
    res.status(500).json({
      success: false,
      error: "生成上传 URL 失败，请检查 OSS 配置",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /convert — 从 OSS 拉取 AAB 并转换
// ---------------------------------------------------------------------------

/** exec 抛出的错误扩展类型 */
interface ExecError extends Error {
  code?: string | number;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

/** 清理本地临时目录 */
function cleanupDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn({ err, dir }, "清理临时目录失败");
  }
}

/** 延迟清理 OSS 对象 */
function scheduleOssCleanup(keys: string[], delayMs: number): void {
  setTimeout(() => {
    for (const k of keys) {
      deleteObject(k).catch(() => {});
    }
  }, delayMs);
}

/** 从 exec 错误中提取 stderr 文本 */
function extractStderr(err: unknown): string {
  const execErr = err as ExecError;
  if (typeof execErr.stderr === "string" && execErr.stderr.trim()) {
    return execErr.stderr.trim();
  }
  if (Buffer.isBuffer(execErr.stderr) && execErr.stderr.length > 0) {
    return execErr.stderr.toString().trim();
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

router.post("/convert", async (req: Request, res: Response) => {
  const { key } = req.body as { key?: string };

  // ---- 参数校验 ----
  if (!key) {
    res.status(400).json({ success: false, error: "缺少 OSS 文件 key" });
    return;
  }

  if (!key.startsWith("uploads/") || !key.toLowerCase().endsWith(".aab")) {
    res.status(400).json({ success: false, error: "无效的文件 key" });
    return;
  }

  // ---- 准备工作目录 ----
  const originalName = key.split("/").pop() || "unknown.aab";
  const taskId = uuidv4();
  const taskDir = path.join(workDir, taskId);
  const inputPath = path.join(taskDir, "input.aab");
  const apksPath = path.join(taskDir, "app.apks");
  const outputApk = path.join(taskDir, "output.apk");
  const outputKey = `outputs/${taskId}/output.apk`;

  // 需要延迟清理的 OSS 对象 key
  const ossKeysToClean: string[] = [key];

  try {
    fs.mkdirSync(taskDir, { recursive: true });
  } catch (err) {
    logger.error({ err }, "创建临时目录失败");
    res.status(500).json({ success: false, error: "服务器内部错误" });
    return;
  }

  /** 统一清理：本地立即清理，OSS 延迟 1 小时清理 */
  const cleanup = (): void => {
    cleanupDir(taskDir);
    scheduleOssCleanup(ossKeysToClean, 3600000);
  };

  // ---- Step 1: 从 OSS 下载 AAB ----
  try {
    await downloadToFile(key, inputPath);
  } catch (err) {
    logger.error({ err, key }, "从 OSS 下载 AAB 文件失败");
    cleanup();
    res
      .status(404)
      .json({ success: false, error: "AAB 文件不存在或已过期，请重新上传" });
    return;
  }

  // ---- Step 2: bundletool 构建 APKS ----
  const hasKeystore = fs.existsSync(keystorePath);
  const keystoreFlags = hasKeystore
    ? `--ks="${keystorePath}" --ks-pass=pass:android --ks-key-alias=androiddebugkey --key-pass=pass:android`
    : "";

  const buildCmd = [
    `java -jar "${bundletoolPath}"`,
    `build-apks`,
    `--bundle="${inputPath}"`,
    `--output="${apksPath}"`,
    `--mode=universal`,
    keystoreFlags,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    await execAsync(buildCmd, { timeout: 180000 });
  } catch (buildError: unknown) {
    const detail = extractStderr(buildError);
    const friendly = detail.includes("not a valid zip")
      ? "文件不是有效的 AAB 格式"
      : detail.includes("Version must match")
        ? "AAB 文件格式无效，请使用 Android Studio 生成的 AAB 文件"
        : `构建失败：${detail.split("\n").slice(0, 3).join(" | ")}`;

    cleanup();
    res.status(500).json({ success: false, error: friendly, detail });
    return;
  }

  // ---- Step 3: 从 APKS 中提取 universal.apk ----
  const extractCmd = `unzip -p "${apksPath}" universal.apk > "${outputApk}"`;
  try {
    await execAsync(extractCmd, { timeout: 60000 });
  } catch (unzipError: unknown) {
    const msg =
      unzipError instanceof Error ? unzipError.message : String(unzipError);
    cleanup();
    res.status(500).json({
      success: false,
      error: `提取 APK 失败：${msg}`,
    });
    return;
  }

  const stat = fs.statSync(outputApk);
  if (stat.size === 0) {
    cleanup();
    res
      .status(500)
      .json({ success: false, error: "提取 APK 失败：输出文件为空" });
    return;
  }

  // ---- Step 4: 上传 APK 到 OSS ----
  try {
    await uploadFile(outputApk, outputKey);
    ossKeysToClean.push(outputKey);
  } catch (err) {
    logger.error({ err, outputKey }, "上传 APK 到 OSS 失败");
    cleanup();
    res
      .status(500)
      .json({ success: false, error: "APK 上传失败，请重试" });
    return;
  }

  // ---- Step 5: 生成后端代理下载路径 ----
  const fileName = originalName.replace(/\.aab$/i, ".apk");
  const downloadPath = `/api/download/${taskId}/${fileName}`;

  // ---- Step 6: 返回结果 ----
  res.json({
    success: true,
    downloadPath,
    fileName,
    fileSize: stat.size,
  });

  // ---- Step 7: 清理（本地立即，OSS 1 小时后） ----
  cleanup();
});

// ---------------------------------------------------------------------------
// GET /download/:taskId/:filename — 后端代理下载 OSS 文件流
// 避免 APK 文件被 OSS 公开端点拦截（ApkDownloadForbidden）
// ---------------------------------------------------------------------------
router.get("/download/:taskId/:filename", async (req: Request, res: Response) => {
  const { taskId, filename } = req.params;

  if (!/^[a-f0-9-]{36}$/.test(taskId) || !/^[\w\s.-]+\.apk$/.test(filename)) {
    res.status(400).json({ error: "无效路径" });
    return;
  }

  const key = `outputs/${taskId}/${filename}`;

  try {
    const { stream, contentType, size } = await getObjectStream(key);

    res.setHeader("Content-Type", contentType || "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    if (size) {
      res.setHeader("Content-Length", String(size));
    }

    stream.pipe(res);

    stream.on("error", (err: Error) => {
      logger.error({ err, key }, "OSS 流读取错误");
      // 如果 headers 还没发完，尝试结束响应
      if (!res.headersSent) {
        res.status(500).json({ error: "文件读取失败" });
      } else {
        res.destroy();
      }
    });
  } catch (err) {
    logger.error({ err, key }, "代理下载失败");
    res.status(500).json({ error: "下载失败，文件可能已过期" });
  }
});

export default router;
