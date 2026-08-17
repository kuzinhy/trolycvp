import React, { useMemo, useState } from 'react';
import { Cake, Calendar, Plus, X, UserPlus, BarChart3, List, Users, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Birthday } from '../constants';
import { cn } from '../lib/utils';

interface StaffBirthdayReminderProps {
  birthdays: Birthday[];
  updateBirthdays: (updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => Promise<void>;
}

export const StaffBirthdayReminder: React.FC<StaffBirthdayReminderProps> = ({ birthdays, updateBirthdays }) => {
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth() + 1; // 1 - 12
  const currentQuarter = Math.ceil(currentMonth / 3); // 1 - 4

  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('chart'); // Default to chart view as requested by user
  const [selectedQuarterFilter, setSelectedQuarterFilter] = useState<number>(currentQuarter);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  // 1. Upcoming Birthdays (Next 30 Days)
  const upcomingBirthdays = useMemo(() => {
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);

    return birthdays.filter(b => {
      const parts = b.date.split('/');
      if (parts.length < 2) return false;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const bDate = new Date(today.getFullYear(), month - 1, day);
      
      if (bDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        bDate.setFullYear(today.getFullYear() + 1);
      }
      
      return bDate >= today && bDate <= next30Days;
    }).sort((a, b) => {
        const partsA = a.date.split('/');
        const partsB = b.date.split('/');
        const dayA = parseInt(partsA[0], 10);
        const monthA = parseInt(partsA[1], 10);
        const dayB = parseInt(partsB[0], 10);
        const monthB = parseInt(partsB[1], 10);
        
        const dateA = new Date(today.getFullYear(), monthA - 1, dayA);
        const dateB = new Date(today.getFullYear(), monthB - 1, dayB);
        if (dateA < today) dateA.setFullYear(today.getFullYear() + 1);
        if (dateB < today) dateB.setFullYear(today.getFullYear() + 1);
        return dateA.getTime() - dateB.getTime();
    });
  }, [today, birthdays]);

  // 2. Process Monthly & Quarterly Data for Charting
  const monthlyData = useMemo(() => {
    const monthsMap: { [key: number]: { month: number; label: string; count: number; names: string[] } } = {};
    
    for (let m = 1; m <= 12; m++) {
      monthsMap[m] = {
        month: m,
        label: `T${m}`,
        count: 0,
        names: []
      };
    }

    birthdays.forEach(b => {
      const parts = b.date.split('/');
      if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        if (month >= 1 && month <= 12) {
          monthsMap[month].count += 1;
          monthsMap[month].names.push(`${b.name} (${parts[0]}/${parts[1]})`);
        }
      }
    });

    return Object.values(monthsMap);
  }, [birthdays]);

  // Quarterly Summary Data
  const quarterlyStats = useMemo(() => {
    const qStats = [
      { name: 'Quý I (T1-T3)', quarter: 1, count: 0, color: '#3b82f6', officers: [] as string[] },
      { name: 'Quý II (T4-T6)', quarter: 2, count: 0, color: '#10b981', officers: [] as string[] },
      { name: 'Quý III (T7-T9)', quarter: 3, count: 0, color: '#f59e0b', officers: [] as string[] },
      { name: 'Quý IV (T10-T12)', quarter: 4, count: 0, color: '#f43f5e', officers: [] as string[] },
    ];

    birthdays.forEach(b => {
      const parts = b.date.split('/');
      if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        if (month >= 1 && month <= 12) {
          const qIdx = Math.ceil(month / 3) - 1;
          qStats[qIdx].count += 1;
          qStats[qIdx].officers.push(`${b.name} (${parts[0]}/${parts[1]})`);
        }
      }
    });

    return qStats;
  }, [birthdays]);

  // Current Month Stats
  const currentMonthCount = useMemo(() => {
    return monthlyData.find(m => m.month === currentMonth)?.count || 0;
  }, [monthlyData, currentMonth]);

  // Officers in Selected Quarter Filter
  const selectedQuarterOfficers = useMemo(() => {
    const qObj = quarterlyStats.find(q => q.quarter === selectedQuarterFilter);
    return qObj ? qObj.officers : [];
  }, [quarterlyStats, selectedQuarterFilter]);

  const handleAddBirthday = async () => {
    if (!newName.trim() || !newDate.trim()) return;
    
    if (!/^\d{1,2}\/\d{1,2}(\/\d{4})?$/.test(newDate)) {
      alert('Vui lòng nhập ngày định dạng DD/MM hoặc DD/MM/YYYY');
      return;
    }

    const newBirthday: Birthday = {
      id: `b-${Date.now()}`,
      name: newName,
      date: newDate,
      source: 'agency'
    };

    await updateBirthdays(prev => [...prev, newBirthday]);
    setNewName('');
    setNewDate('');
    setIsAdding(false);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs max-w-xs z-50">
          <p className="font-bold text-rose-300 mb-1">Tháng {data.month} ({data.count} đồng chí)</p>
          {data.names.length > 0 ? (
            <ul className="space-y-1">
              {data.names.map((n: string, i: number) => (
                <li key={i} className="text-[11px] text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-slate-400 italic">Chưa có dữ liệu sinh nhật</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-rose-50/50 via-indigo-50/30 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-400 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Cake size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                Sinh nhật cán bộ
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                  VP Đảng ủy
                </span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Thống kê & Nhắc nhở sự kiện
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setActiveTab('chart')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  activeTab === 'chart' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
                title="Xem Biểu đồ Trực quan"
              >
                <BarChart3 size={14} />
                <span className="hidden sm:inline text-[11px]">Biểu đồ</span>
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  activeTab === 'list' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
                title="Danh sách sắp tới"
              >
                <List size={14} />
                <span className="hidden sm:inline text-[11px]">Danh sách</span>
              </button>
            </div>

            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
              title="Thêm sinh nhật mới"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {/* Quick Modal for Adding Birthday */}
        {isAdding && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserPlus size={14} className="text-indigo-600" />
              Thêm sinh nhật cán bộ mới
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ví dụ: Lê Thị Kiều Oanh"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh (DD/MM hoặc DD/MM/YYYY)</label>
              <input 
                type="text" 
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="08/10/1988"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={handleAddBirthday}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <UserPlus size={14} />
              Lưu thông tin sinh nhật
            </button>
          </div>
        )}

        {/* TAB 1: CHART VIEW (Biểu đồ Trực quan hóa) */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            {/* KPI Badges for Month & Quarter */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/50 border border-rose-100 flex flex-col justify-between">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} />
                  Tháng {currentMonth} (Hiện tại)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-900 tracking-tight">{currentMonthCount}</span>
                  <span className="text-[11px] font-bold text-rose-600">Đồng chí</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 flex flex-col justify-between">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                  <Users size={11} />
                  Quý {currentQuarter} (Quý hiện tại)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-indigo-900 tracking-tight">
                    {quarterlyStats.find(q => q.quarter === currentQuarter)?.count || 0}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600">Đồng chí</span>
                </div>
              </div>
            </div>

            {/* Monthly Distribution Bar Chart */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">
                  Phân bổ sinh nhật theo Tháng (12 Tháng)
                </h4>
                <span className="text-[10px] font-semibold text-slate-400">
                  Tháng {currentMonth} tô màu tím
                </span>
              </div>

              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {monthlyData.map((entry) => {
                        const isCurrentMonth = entry.month === currentMonth;
                        const isCurrentQuarter = Math.ceil(entry.month / 3) === currentQuarter;
                        let fill = '#cbd5e1'; // Slate 300 default
                        if (isCurrentMonth) fill = '#818cf8'; // Indigo 400
                        else if (isCurrentQuarter) fill = '#fb7185'; // Rose 400

                        return <Cell key={`cell-${entry.month}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quarterly Filter & Breakdown List */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">
                  Chi tiết theo Quý
                </h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuarterFilter(q)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                        selectedQuarterFilter === q
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Q{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Quarter Personnel List */}
              <div className="space-y-1.5 pt-1">
                {selectedQuarterOfficers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    Không có sinh nhật trong Quý {selectedQuarterFilter}
                  </p>
                ) : (
                  selectedQuarterOfficers.map((officer, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 text-xs text-slate-700 shadow-2xs"
                    >
                      <span className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {officer.split(' (')[0]}
                      </span>
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        {officer.split(' (')[1]?.replace(')', '')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIST VIEW (Sắp tới 30 ngày) */}
        {activeTab === 'list' && (
          <div className="space-y-2">
            {upcomingBirthdays.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400 font-medium">Không có sinh nhật trong 30 ngày tới</p>
                <p className="text-[10px] text-slate-300 mt-1">Chuyển qua tab "Biểu đồ" để xem toàn bộ các quý</p>
              </div>
            ) : (
              upcomingBirthdays.map(b => (
                <div 
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-100/80 transition-all border border-slate-100 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-2xs">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Cake size={11} className="text-rose-400" />
                        Ngày sinh: <span className="font-bold text-rose-600">{b.date}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
