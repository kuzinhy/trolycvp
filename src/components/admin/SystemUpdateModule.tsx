import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, AlertTriangle, CheckCircle, Shield, Zap, Settings, Clock, ChevronRight } from 'lucide-react';
import { systemUpdateService } from '../../services/systemUpdateService';
import { SystemIssue, IntegrationSuggestion, ScanHistory } from '../../types/systemUpdate';
import { cn } from '../../lib/utils';

export const SystemUpdateModule: React.FC = () => {
  const [issues, setIssues] = useState<SystemIssue[]>([]);
  const [suggestions, setSuggestions] = useState<IntegrationSuggestion[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const loadData = async () => {
    setIsScanning(true);
    const [i, s] = await Promise.all([
      systemUpdateService.runHealthCheck(),
      systemUpdateService.getIntegrationSuggestions(),
    ]);
    setIssues(i);
    setSuggestions(s);
    setIsScanning(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cập nhật hệ thống</h2>
          <p className="text-slate-500 text-sm mt-1">Kiểm tra và quản lý tình trạng sức khỏe hệ thống.</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={isScanning}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          <RefreshCw size={18} className={cn(isScanning && "animate-spin")} />
          {isScanning ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}
        </button>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> Tình trạng hệ thống
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left">Vấn đề</th>
              <th className="px-6 py-4 text-left">Mức độ</th>
              <th className="px-6 py-4 text-left">Trạng thái</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {issues.map(issue => (
              <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{issue.name}</p>
                  <p className="text-slate-500 text-xs">{issue.description}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", 
                    issue.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  )}>{issue.severity}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">{issue.status}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={async () => {
                      if (issue.fixAction) {
                        await issue.fixAction();
                        loadData();
                      }
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Xử lý
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integrations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-indigo-500" /> Đề xuất tích hợp
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left">Công nghệ</th>
              <th className="px-6 py-4 text-left">Mục đích</th>
              <th className="px-6 py-4 text-left">Độ phức tạp</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suggestions.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                <td className="px-6 py-4 text-slate-600">{s.purpose}</td>
                <td className="px-6 py-4 text-slate-600">{s.complexity}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={async () => {
                      if (s.action) {
                        await s.action();
                        loadData();
                      }
                    }}
                    className="flex items-center gap-1 text-indigo-600 text-xs font-bold hover:underline ml-auto"
                  >
                    Đề xuất <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
