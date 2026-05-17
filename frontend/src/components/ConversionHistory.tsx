import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, Trash2, FileX } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { formatFileSize } from '../services/conversionService';

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return '刚刚';
}

export function ConversionHistory() {
  const { entries, removeEntry, clearAll } = useHistoryStore();

  if (entries.length === 0) return null;

  return (
    <section id="history" className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                转换记录
              </span>
            </h2>
            <p className="text-slate-400 text-sm">共 {entries.length} 条记录，保存在本地浏览器中</p>
          </div>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 text-sm transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">清空记录</span>
          </button>
        </motion.div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600/50 transition-all duration-200"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  entry.status === 'success'
                    ? 'bg-green-500/20'
                    : 'bg-red-500/20'
                }`}>
                  {entry.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-sm font-medium truncate">
                      {entry.fileName}
                    </span>
                    <span className="text-slate-500 text-xs flex-shrink-0">
                      {formatFileSize(entry.fileSize)}
                    </span>
                  </div>
                  {entry.status === 'success' ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-orange-400 font-medium">{entry.apkName}</span>
                      <span>·</span>
                      <span>{formatFileSize(entry.apkSize)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-red-400 truncate">{entry.errorMessage}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(entry.timestamp)}</span>
                  </div>

                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                    title="删除记录"
                  >
                    <FileX className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
