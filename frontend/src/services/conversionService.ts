import { ApkInfo } from '../store/conversionStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  apks?: ApkInfo[];
  error?: string;
}

export interface ConversionResponse {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  apk?: string;
  error?: string;
}

export async function convertAabToApk(
  file: File,
  onProgress: (progress: number) => void
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    onProgress(10);

    const response = await fetch(`${API_BASE_URL}/api/convert`, {
      method: 'POST',
      body: formData,
    });

    onProgress(50);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Conversion failed');
    }

    onProgress(90);

    const data: ConversionResponse = await response.json();

    onProgress(100);

    if (data.success) {
      if (data.downloadUrl) {
        const fullDownloadUrl = data.downloadUrl.startsWith('http')
          ? data.downloadUrl
          : `${API_BASE_URL}${data.downloadUrl}`;

        return {
          success: true,
          downloadUrl: fullDownloadUrl,
          apks: [
            {
              name: data.fileName || file.name.replace('.aab', '.apk'),
              url: fullDownloadUrl,
              size: data.fileSize || 0,
            },
          ],
        };
      } else if (data.apk) {
        const blob = base64ToBlob(data.apk, 'application/vnd.android.package-archive');
        const url = URL.createObjectURL(blob);
        const fileName = data.fileName || file.name.replace('.aab', '.apk');

        return {
          success: true,
          downloadUrl: url,
          apks: [
            {
              name: fileName,
              url: url,
              size: data.fileSize || blob.size,
            },
          ],
        };
      }
    }

    throw new Error(data.error || 'Conversion failed');

  } catch (error) {
    console.error('Conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error. Please try again.',
    };
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], { type: mimeType });
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
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
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