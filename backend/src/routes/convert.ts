import { Router, type IRouter } from "express";
import multer from "multer";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";

const router: IRouter = Router();

// Use OS temp dir so it works in any container/serverless environment
const tmpBase = process.env.TMP_DIR || os.tmpdir();
const uploadsDir = path.join(tmpBase, "aab-uploads");
const outputsDir = path.join(tmpBase, "aab-outputs");

// bundletool and keystore are embedded in the image at /app/bundletool/
const bundletoolPath =
  process.env.BUNDLETOOL_PATH ||
  path.join(process.cwd(), "bundletool", "bundletool.jar");
const keystorePath =
  process.env.KEYSTORE_PATH ||
  path.join(process.cwd(), "bundletool", "debug.keystore");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".aab")) {
      cb(null, true);
    } else {
      cb(new Error("Only AAB files are allowed"));
    }
  },
});

router.post("/convert", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "未上传文件" });
    return;
  }

  const taskId = uuidv4();
  const inputPath = req.file.path;
  const outputDir = path.join(outputsDir, taskId);
  const apksPath = path.join(outputDir, "app.apks");
  const outputApk = path.join(outputDir, "output.apk");

  fs.mkdirSync(outputDir, { recursive: true });

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

  exec(buildCmd, { timeout: 180000 }, (error, _stdout, stderr) => {
    if (error) {
      try {
        fs.unlinkSync(inputPath);
      } catch {}
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch {}
      const detail = stderr?.trim() || error.message;
      const friendly = detail.includes("not a valid zip")
        ? "文件不是有效的 AAB 格式"
        : detail.includes("Version must match")
        ? "AAB 文件格式无效，请使用 Android Studio 生成的 AAB 文件"
        : `构建失败：${detail.split("\n")[0]}`;
      res.status(500).json({ success: false, error: friendly });
      return;
    }

    // Extract universal.apk from the .apks zip file
    const extractCmd = `unzip -p "${apksPath}" universal.apk > "${outputApk}"`;
    exec(extractCmd, { timeout: 60000 }, (unzipError) => {
      try {
        fs.unlinkSync(inputPath);
      } catch {}

      if (unzipError) {
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch {}
        res.status(500).json({
          success: false,
          error: `提取 APK 失败：${unzipError.message}`,
        });
        return;
      }

      const stat = fs.statSync(outputApk);
      if (stat.size === 0) {
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch {}
        res
          .status(500)
          .json({ success: false, error: "提取 APK 失败：输出文件为空" });
        return;
      }

      const downloadUrl = `/api/download/${taskId}/output.apk`;
      const fileName = req.file!.originalname.replace(/\.aab$/i, ".apk");

      res.json({
        success: true,
        downloadUrl,
        fileName,
        fileSize: stat.size,
      });

      // Clean up after 1 hour
      setTimeout(() => {
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch {}
      }, 3600000);
    });
  });
});

router.get("/download/:taskId/:filename", (req, res) => {
  const { taskId, filename } = req.params;
  if (
    !/^[a-f0-9-]{36}$/.test(taskId) ||
    !/^[\w.-]+\.apk$/.test(filename)
  ) {
    res.status(400).json({ error: "无效路径" });
    return;
  }
  const filePath = path.join(outputsDir, taskId, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "文件不存在或已过期" });
    return;
  }
  res.download(filePath, filename);
});

export default router;
