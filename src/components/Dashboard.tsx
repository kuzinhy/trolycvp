import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, MessageSquare, Database, TrendingUp, Calendar as CalendarIcon, Sparkles, Clock } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';

interface DashboardProps {
  knowledge: { content: string, tags: string[] }[];
  chatHistory: any[];
  onNavigate?: (tab: string) => void;
}

const COLORS = ['#3b82f6', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'];

const DateTimeWidget = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-center h-full group"
    >
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110">
        <Clock size={80} />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          {time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-4xl font-black tracking-tight text-white">
          {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ knowledge, chatHistory, onNavigate }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const prompt = `Dựa trên dữ liệu sau, hãy viết một bản tóm tắt công việc ngắn gọn (khoảng 3-4 câu) cho ngày hôm nay. 
      Dữ liệu kiến thức: ${knowledge.length} mục. 
      Lịch sử hội thoại: ${chatHistory.length} tin nhắn.
      Các chủ đề chính: ${tagData.map(t => t.name).join(', ')}.
      Hãy viết theo phong cách chuyên nghiệp, khích lệ.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });
      setAiSummary(response.text || 'Không thể tạo tóm tắt lúc này.');
    } catch (error) {
      console.error('Error generating summary:', error);
      setAiSummary('Đã có lỗi xảy ra khi tạo tóm tắt.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (knowledge.length > 0 || chatHistory.length > 0) {
      generateSummary();
    }
  }, []);

  // Prepare Tag Data
  const tagData = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    knowledge.forEach(k => {
      k.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [knowledge]);

  const totalTags = useMemo(() => tagData.reduce((sum, item) => sum + item.value, 0), [tagData]);

  // Prepare Chat Data (last 7 days)
  const chatData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const count = chatHistory.filter(h => {
        const hDate = new Date(h.timestamp);
        return hDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) === dateStr;
      }).length;
      return { name: dateStr, count };
    });
  }, [chatHistory]);

  const stats = [
    { label: 'Kiến thức', value: knowledge.length, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: '+5%', tab: 'knowledge' },
    { label: 'Hội thoại', value: chatHistory.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', trend: '+12%', tab: 'chat' },
    { label: 'Chủ đề', value: tagData.length, icon: Brain, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: '+2%', tab: 'knowledge' },
    { label: 'Hoạt động', value: chatHistory.filter(h => new Date(h.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', trend: '+8%', tab: 'chat' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Bento Row: AI Summary + Time + Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* AI Summary Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden group flex flex-col justify-center min-h-[220px]"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
            <Brain size={160} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
              <Brain size={40} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Trợ lý Chiến lược</span>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tóm tắt Thông minh</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">Hệ thống Chỉ huy Elite</h2>
              {isGeneratingSummary ? (
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm font-medium italic">Đang phân tích dữ liệu tham mưu...</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed font-medium max-w-2xl">
                  {aiSummary || "Hệ thống đã sẵn sàng. Hãy bắt đầu một ngày làm việc hiệu quả cùng Trợ lý AI."}
                </p>
              )}
            </div>
            <button 
              onClick={generateSummary}
              disabled={isGeneratingSummary}
              className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 shrink-0 disabled:opacity-50 mt-4 md:mt-0 shadow-sm"
            >
              Làm mới
            </button>
          </div>
        </motion.div>

        {/* Time & Weather */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <div className="h-full min-h-[120px]">
            <DateTimeWidget />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => onNavigate && onNavigate(stat.tab)}
            className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm interactive-card group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-all duration-300 group-hover:scale-110 shadow-sm`}>
                <stat.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100">
                <TrendingUp size={12} />
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">mục</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => onNavigate && onNavigate('chat')}
          className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm interactive-card cursor-pointer flex flex-col min-h-[360px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Hoạt động hệ thống</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Tần suất tương tác trong 7 ngày qua</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-blue-100 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-500/50"></div>
                Trực tuyến
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chatData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: '700' }} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: '700' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 16 }}
                  formatter={(value: number) => [value, 'Số lượng']}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '16px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)'
                  }}
                  itemStyle={{ fontSize: '14px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="url(#barGradient)" 
                  radius={[12, 12, 12, 12]} 
                  barSize={48}
                  activeBar={{ fill: '#1e40af' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Knowledge Distribution */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => onNavigate && onNavigate('knowledge')}
          className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm interactive-card cursor-pointer flex flex-col min-h-[360px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Phân loại kiến thức</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Dựa trên các thẻ chủ đề</p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
              <Brain size={20} />
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={tagData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={90}
                  outerRadius={120} 
                  paddingAngle={8}
                  stroke="none"
                >
                  {tagData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} (${totalTags > 0 ? ((value / totalTags) * 100).toFixed(1) : 0}%)`,
                    'Số lượng'
                  ]}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '16px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)'
                  }}
                  itemStyle={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  iconSize={12}
                  wrapperStyle={{ paddingTop: '40px' }}
                  formatter={(value) => <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
