import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span>for Android developers</span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 AAB To APK. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
