import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// 不再接收大文件 multipart 上传，JSON body 仅用于 { key: string } 等轻量请求
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ---- Access token auth middleware ----
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";
app.use("/api", (req, res, next) => {
  // Public endpoints
  if (req.path === "/healthz") return next();

  if (!ACCESS_TOKEN) {
    // No token configured = open access
    return next();
  }

  const token = req.headers["x-access-token"] as string | undefined;
  if (!token || token !== ACCESS_TOKEN) {
    res.status(401).json({ success: false, error: "未授权，请提供有效的访问令牌" });
    return;
  }
  next();
});

app.use("/api", router);

export default app;
