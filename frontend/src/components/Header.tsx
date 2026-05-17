import { Github, Zap, History } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';

export function Header() {
  const count = useHistoryStore((s) => s.entries.length);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-slate-900/50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              AAB To APK
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">
              功能
            </a>
            <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">
              使用方法
            </a>
            <a href="#faq" className="text-slate-400 hover:text-white transition-colors">
              常见问题
            </a>
            {count > 0 && (
              <a href="#history" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <History className="w-4 h-4" />
                <span>转换记录</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                  {count > 9 ? '9+' : count}
                </span>
              </a>
            )}
          </nav>
          <a
            href="https://github.com/hbiui/AAB-To-APK"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
