import OSS from "ali-oss";
import { logger } from "./logger";

/** OSS 环境配置 */
const OSS_REGION = process.env.OSS_REGION || "oss-cn-hangzhou";
const OSS_BUCKET = process.env.OSS_BUCKET || "aab-to-apk-hangzhou";
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || "";
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || "";

/** 单例 OSS 客户端 */
let _client: OSS | null = null;

/**
 * 获取 OSS 客户端实例（单例模式）
 * 需要环境变量 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET
 */
export function getOssClient(): OSS {
  if (_client) return _client;

  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET) {
    throw new Error(
      "OSS 配置缺失：请设置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 环境变量",
    );
  }

  _client = new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    secure: true,
  });

  logger.info({ region: OSS_REGION, bucket: OSS_BUCKET }, "OSS 客户端已初始化");
  return _client;
}

/**
 * 生成预签名上传 URL（PUT 方法）
 * @param key OSS 对象 key
 * @param contentType 文件 MIME 类型，默认 application/octet-stream
 * @param expires 有效期（秒），默认 900（15 分钟）
 * @returns 预签名上传 URL
 */
export function getSignedUploadUrl(
  key: string,
  contentType: string = "application/octet-stream",
  expires: number = 900,
): string {
  const client = getOssClient();
  return client.signatureUrl(key, {
    method: "PUT",
    expires,
    "Content-Type": contentType,
  });
}

/**
 * 生成预签名下载 URL（GET 方法）
 * @param key OSS 对象 key
 * @param downloadFileName 下载时显示的文件名（可选，设置 Content-Disposition）
 * @param expires 有效期（秒），默认 3600（1 小时）
 * @returns 预签名下载 URL
 */
export function getSignedDownloadUrl(
  key: string,
  downloadFileName?: string,
  expires: number = 3600,
): string {
  const client = getOssClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = { expires };
  if (downloadFileName) {
    options.response = {
      "content-disposition": `attachment; filename="${downloadFileName}"`,
    };
  }
  return client.signatureUrl(key, options);
}

/**
 * 从本地路径上传文件到 OSS
 * @param localPath 本地文件路径
 * @param key OSS 对象 key
 */
export async function uploadFile(
  localPath: string,
  key: string,
): Promise<void> {
  const client = getOssClient();
  await client.put(key, localPath);
  logger.info({ key, localPath }, "文件已上传到 OSS");
}

/**
 * 从 OSS 下载文件到本地路径
 * @param key OSS 对象 key
 * @param localPath 本地保存路径
 */
export async function downloadToFile(
  key: string,
  localPath: string,
): Promise<void> {
  const client = getOssClient();
  await client.get(key, localPath);
  logger.info({ key, localPath }, "文件已从 OSS 下载到本地");
}

/**
 * 获取 OSS 对象可读流（用于后端代理下载）
 * @param key OSS 对象 key
 * @returns 包含可读流和元数据的对象
 */
export async function getObjectStream(
  key: string,
): Promise<{ stream: NodeJS.ReadableStream; contentType?: string; size?: number }> {
  const client = getOssClient();
  const result = await client.getStream(key);
  // ali-oss 的 res 中 headers 可能包含 content-type / content-length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers = (result as any).res?.headers || {};
  return {
    stream: result.stream,
    contentType: headers["content-type"] || "application/octet-stream",
    size: headers["content-length"] ? parseInt(headers["content-length"], 10) : undefined,
  };
}

/**
 * 删除 OSS 对象（忽略错误，仅记录日志）
 * @param key OSS 对象 key
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    const client = getOssClient();
    await client.delete(key);
    logger.info({ key }, "OSS 对象已删除");
  } catch (err) {
    logger.warn({ err, key }, "OSS 对象删除失败，可手动清理");
  }
}

/**
 * 获取 OSS 对象的公开 URL（不签名）
 * @param key OSS 对象 key
 * @returns 对象公开 URL
 */
export function getObjectUrl(key: string): string {
  return `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${key}`;
}

export { OSS_REGION, OSS_BUCKET };
