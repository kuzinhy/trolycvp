import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, RefreshCw, CheckCircle2, AlertCircle, Github } from 'lucide-react';

interface GitHubStatusData {
  connected: boolean;
  repo: string;
  branch: string;
  lastCommit?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  error?: string;
}

export const GitHubSyncStatus: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const [status, setStatus] = useState<GitHubStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/github/verify');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLastChecked(new Date());
      } else {
        setStatus({
          connected: false,
          repo: 'kuzinhy/trolycvp',
          branch: 'main',
          error: `HTTP ${res.status}`
        });
      }
    } catch (err: any) {
      setStatus({
        connected: false,
        repo: 'kuzinhy/trolycvp',
        branch: 'main',
        error: err.message || 'Không thể kết nối API'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Tự động kiểm tra mỗi 60s
    return () => clearInterval(interval);
  }, [checkStatus]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-2xl border border-slate-800 shadow-sm text-xs select-none">
      <Github size={15} className="text-slate-400 shrink-0" />
      
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
        <span className="font-bold text-[11px] text-slate-200 truncate max-w-[110px] md:max-w-[140px]">
          {status?.repo || 'kuzinhy/trolycvp'}
        </span>
      </div>

      <span className="text-slate-600 font-normal">|</span>

      {status?.connected ? (
        <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400">
          <GitBranch size={12} className="text-indigo-400" />
          <span className="font-semibold text-indigo-300">{status.branch}</span>
          {status.lastCommit && (
            <span className="text-slate-500 truncate max-w-[100px]" title={status.lastCommit.message}>
              ({status.lastCommit.sha})
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-rose-400 font-semibold truncate max-w-[90px]" title={status?.error}>
          {status?.error || 'Mất kết nối'}
        </span>
      )}

      <button
        onClick={checkStatus}
        disabled={loading}
        title={lastChecked ? `Lần kiểm tra cuối: ${formatTime(lastChecked.toISOString())}` : 'Đồng bộ ngay'}
        className="p-1 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-50 ml-1"
      >
        <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-400' : ''} />
      </button>
    </div>
  );
};
