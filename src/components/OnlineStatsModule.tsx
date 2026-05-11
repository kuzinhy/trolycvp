import React, { useMemo } from 'react';
import { useDashboardContext } from '../context/DashboardContext';
import { useAppStats } from '../hooks/useAppStats';
import { Activity, Users, Zap, BarChart3 } from 'lucide-react';

export const OnlineStatsModule: React.FC = () => {
  const { tasks, meetings } = useDashboardContext();
  const { onlineCount, visitCount } = useAppStats();

  const systemHealth = useMemo(() => {
    const totalItems = tasks.length + meetings.length;
    let score = 100;
    if (totalItems > 50) score -= 20;
    if (onlineCount > 20) score -= 10;
    return score;
  }, [tasks.length, meetings.length, onlineCount]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Users className="text-blue-500" size={24} />
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">Online</p>
          <p className="text-xl font-black text-slate-900">{onlineCount}</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Zap className="text-emerald-500" size={24} />
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">Lượt truy cập</p>
          <p className="text-xl font-black text-slate-900">{visitCount}</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <BarChart3 className="text-amber-500" size={24} />
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">Nhiệm vụ</p>
          <p className="text-xl font-black text-slate-900">{tasks.length}</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Activity className="text-rose-500" size={24} />
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">Sức khỏe hệ thống</p>
          <p className="text-xl font-black text-slate-900">{systemHealth}%</p>
        </div>
      </div>
    </div>
  );
};
