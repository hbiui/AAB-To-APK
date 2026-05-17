import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-react';
import { useConversionStore } from '../store/conversionStore';
import { useHistoryStore } from '../store/historyStore';
import { convertAabToApk, formatFileSize, downloadApk } from '../services/conversionService';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function UploadZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const {
    status,
    progress,
    errorMessage,
    apks,
    setStatus,
    setProgress,
    setFile,
    setError,
    setDownloadUrl,
    reset,
  } = useConversionStore();

  const { addEntry } = useHistoryStore();

  useEffect(() => {
    if (status === 'uploading' || status === 'converting') {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setElapsedSeconds(0);
      }
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
      setElapsedSeconds(0);
    }
  }, [status]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} 秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} 分 ${s} 秒`;
  };

  const estimatedRemaining = (): string | null => {
    if (progress <= 5 || elapsedSeconds < 2) return null;
    const totalEstimate = elapsedSeconds / (progress / 100);
    const remaining = Math.max(0, Math.round(totalEstimate - elapsedSeconds));
    return formatTime(remaining);
  };

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.aab')) {
      return '请上传 .aab 格式的文件';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `文件大小不能超过 ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setError(error);
      return;
    }

    setSelectedFile(file);
    setFile(file.name, file.size);
    setStatus('uploading');

    convertAabToApk(file, (prog) => {
      setProgress(prog);
      if (prog > 30) {
        setStatus('converting');
      }
    }).then((result) => {
      if (result.success && result.downloadUrl && result.apks) {
        setDownloadUrl(result.downloadUrl, result.apks);
        addEntry({
          id: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          apkName: result.apks[0]?.name ?? file.name.replace('.aab', '.apk'),
          apkSize: result.apks[0]?.size ?? 0,
          status: 'success',
          timestamp: Date.now(),
        });
      } else {
        const msg = result.error || '转换失败，请重试';
        setError(msg);
        addEntry({
          id: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          apkName: '',
          apkSize: 0,
          status: 'error',
          errorMessage: msg,
          timestamp: Date.now(),
        });
      }
    });
  }, [setStatus, setProgress, setFile, setError, setDownloadUrl, addEntry]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleReset = () => {
    setSelectedFile(null);
    reset();
  };

  const handleDownload = async (apk: { name: string; url: string }) => {
    await downloadApk(apk.url, apk.name);
  };

  return (
    <section id="upload" className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              开始转换
            </span>
          </h2>
          <p className="text-slate-400">
            上传您的 AAB 文件，即可在几秒钟内获得 APK
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative"
        >
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative p-12 rounded-2xl border-2 border-dashed transition-all duration-300
              ${isDragOver
                ? 'border-orange-500 bg-orange-500/10'
                : status === 'idle'
                  ? 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
                  : 'border-slate-700 bg-slate-800/30 cursor-default'
              }
            `}
          >
            <input
              type="file"
              accept=".aab"
              onChange={handleFileSelect}
              disabled={status !== 'idle'}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default disabled:pointer-events-none"
            />

            <div className="flex flex-col items-center text-center">
              <AnimatePresence mode="wait">
                {status === 'idle' && !selectedFile && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className={`
                      w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-300
                      ${isDragOver ? 'bg-orange-500/20' : 'bg-slate-700/50'}
                    `}>
                      <Upload className={`w-10 h-10 ${isDragOver ? 'text-orange-400' : 'text-slate-400'}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      拖拽 AAB 文件到此处
                    </h3>
                    <p className="text-slate-400 mb-4">
                      或点击选择文件
                    </p>
                    <p className="text-sm text-slate-500">
                      支持 .aab 格式，最大 {formatFileSize(MAX_FILE_SIZE)}
                    </p>
                  </motion.div>
                )}

                {(status === 'uploading' || status === 'converting') && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center w-full"
                  >
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-6">
                      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      {status === 'uploading' ? '正在上传...' : '正在转换...'}
                    </h3>
                    <p className="text-slate-400 mb-6">
                      {selectedFile?.name}
                    </p>
                    <div className="w-full max-w-md">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-slate-500">已用时 {formatTime(elapsedSeconds)}</span>
                        <span className="text-slate-400 font-medium">{progress}%</span>
                        <span className="text-slate-500">
                          {estimatedRemaining()
                            ? `预计还需 ${estimatedRemaining()}`
                            : '计算中…'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-white">
                      转换成功！
                    </h3>
                    <div className="space-y-3 w-full max-w-sm">
                      {apks.map((apk, index) => (
                        <button
                          key={index}
                          onClick={() => handleDownload(apk)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <File className="w-5 h-5 text-orange-400" />
                            <span className="text-white text-sm">{apk.name}</span>
                          </div>
                          <Download className="w-5 h-5 text-slate-400 group-hover:text-orange-400 transition-colors" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleReset}
                      className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      转换其他文件
                    </button>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      转换失败
                    </h3>
                    <p className="text-red-400 mb-6">
                      {errorMessage}
                    </p>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white transition-colors"
                    >
                      重试
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
