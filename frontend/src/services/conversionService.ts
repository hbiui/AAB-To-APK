import { ApkInfo } from '../store/conversionStore';
import { getAccessToken } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['x-access-token'] = token;
  return headers;
}

export interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  apks?: ApkInfo[];
  error?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}

export interface ConversionResponse {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Step 1: Get a presigned upload URL from backend
 */
export async function getUploadUrl(filename: string): Promise<UploadUrlResponse> {
  const encodedName = encodeURIComponent(filename);
  const response = await fetch(`${API_BASE_URL}/api/upload-url?filename=${encodedName}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取上传地址失败');
  }

  return await response.json();
}

/**
 * Step 2: Upload file directly to OSS using presigned URL (PUT)
 * Tracks upload progress via XMLHttpRequest
 */
export async function uploadToOss(
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        // Map to 10-50% range
        onProgress(10 + Math.round(percent * 0.4));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('上传过程中网络错误'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.send(file);
  });
}

/**
 * Step 3: Call backend to convert the AAB on OSS
 */
export async function triggerConversion(
  key: string,
  onProgress: (progress: number) => void
): Promise<ConversionResponse> {
  onProgress(55);

  const response = await fetch(`${API_BASE_URL}/api/convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ key }),
  });

  onProgress(90);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '转换失败');
  }

  return await response.json();
}

/**
 * Main flow: upload → convert → get download URL
 */
export async function convertAabToApk(
  file: File,
  onProgress: (progress: number) => void
): Promise<ConversionResult> {
  try {
    // Step 1: Get presigned upload URL
    onProgress(5);
    const { uploadUrl, key } = await getUploadUrl(file.name);
    onProgress(10);

    // Step 2: Upload to OSS (PUT directly)
    await uploadToOss(file, uploadUrl, onProgress);
    onProgress(50);

    // Step 3: Trigger conversion
    const data = await triggerConversion(key, onProgress);
    onProgress(100);

    if (data.success && data.downloadUrl) {
      const fileName = data.fileName || file.name.replace(/\.aab$/i, '.apk');
      return {
        success: true,
        downloadUrl: data.downloadUrl,
        apks: [
          {
            name: fileName,
            url: data.downloadUrl,
            size: data.fileSize || 0,
          },
        ],
      };
    }

    throw new Error(data.error || '转换失败');
  } catch (error) {
    console.error('Conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络错误，请重试',
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function downloadApk(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`下载失败: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  } catch {
    window.open(url, '_blank');
  }
}
