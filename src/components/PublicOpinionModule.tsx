import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  MapPin, 
  Newspaper, 
  Search, 
  Filter,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface OpinionItem {
  id: string;
  source: 'Facebook' | 'Báo chí' | 'Zalo' | 'Trực tiếp';
  location: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
  tags: string[];
}

export const PublicOpinionModule: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [opinions, setOpinions] = useState<OpinionItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');

  useEffect(() => {
    fetchOpinions();
  }, []);

  const fetchOpinions = async () => {
    setIsLoading(true);
    // Giả lập dữ liệu dư luận địa phương
    setTimeout(() => {
      const mockData: OpinionItem[] = [
        {
          id: '1',
          source: 'Facebook',
          location: 'Phường Phú Cường',
          content: 'Người dân rất phấn khởi trước dự án cải tạo vỉa hè, giúp đường thông thoáng hơn.',
          sentiment: 'positive',
          date: '2026-03-31',
          tags: ['Hạ tầng', 'Đô thị']
        },
        {
          id: '2',
          source: 'Báo chí',
          location: 'Phường Thủ Dầu Một, TP.HCM',
          content: 'Phản ánh tình trạng rác thải ùn ứ tại một số điểm tập kết vào giờ cao điểm.',
          sentiment: 'negative',
          date: '2026-03-30',
          tags: ['Môi trường', 'Vệ sinh']
        },
        {
          id: '3',
          source: 'Zalo',
          location: 'Phường Hiệp Thành',
          content: 'Ý kiến về việc điều chỉnh giờ làm việc tại bộ phận một cửa để thuận tiện cho công nhân.',
          sentiment: 'neutral',
          date: '2026-03-30',
          tags: ['Cải cách hành chính']
        },
        {
          id: '4',
          source: 'Trực tiếp',
          location: 'Phường Chánh Nghĩa',
          content: 'Kiến nghị tăng cường tuần tra đêm tại các khu dân cư mới để đảm bảo an ninh.',
          sentiment: 'neutral',
          date: '2026-03-29',
          tags: ['An ninh', 'Trật tự']
        }
      ];
      setOpinions(mockData);
      setIsLoading(false);
    }, 1000);
  };

  const filteredOpinions = filter === 'all' 
    ? opinions 
    : opinions.filter(o => o.sentiment === filter);

  const stats = {
    positive: opinions.filter(o => o.sentiment === 'positive').length,
    neutral: opinions.filter(o => o.sentiment === 'neutral').length,
    negative: opinions.filter(o => o.sentiment === 'negative').length,
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng ý kiến</p>
            <p className="text-2xl font-black text-slate-900">{opinions.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tích cực</p>
            <p className="text-2xl font-black text-emerald-600">{stats.positive}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
            <Minus size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trung lập</p>
            <p className="text-2xl font-black text-slate-600">{stats.neutral}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiêu cực</p>
            <p className="text-2xl font-black text-rose-600">{stats.negative}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-600" />
                <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Dòng thời gian Dư luận</h3>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['all', 'positive', 'neutral', 'negative'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      filter === f ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'positive' ? 'Tích cực' : f === 'neutral' ? 'Trung lập' : 'Tiêu cực'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 size={32} className="text-emerald-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Đang tổng hợp dư luận...</p>
                </div>
              ) : filteredOpinions.length > 0 ? (
                filteredOpinions.map((opinion, idx) => (
                  <motion.div
                    key={opinion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        opinion.sentiment === 'positive' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        opinion.sentiment === 'negative' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {opinion.sentiment === 'positive' ? <TrendingUp size={18} /> : 
                         opinion.sentiment === 'negative' ? <TrendingDown size={18} /> : <Minus size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{opinion.source}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <MapPin size={10} />
                              {opinion.location}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">{opinion.date}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed mb-3">{opinion.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {opinion.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 opacity-40">
                  <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="font-black text-slate-500 uppercase tracking-widest">Không tìm thấy ý kiến phù hợp</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Analysis */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/60">AI Analysis Insight</span>
              </div>
              <div className="space-y-4">
                <h4 className="text-xl font-black leading-tight">Dư luận tuần qua ổn định, tập trung vào hạ tầng.</h4>
                <p className="text-xs text-emerald-100/60 leading-relaxed font-medium">
                  AI ghi nhận sự gia tăng 15% ý kiến tích cực liên quan đến các dự án chỉnh trang đô thị. Tuy nhiên, cần lưu ý vấn đề vệ sinh môi trường tại các điểm tập kết rác.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-emerald-200/60 uppercase tracking-widest">Chỉ số niềm tin</span>
                  <span className="text-emerald-400">82%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '82%' }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hot Topics */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Chủ đề Nóng</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Cải tạo đô thị', count: 42, trend: 'up' },
                { label: 'An ninh trật tự', count: 28, trend: 'stable' },
                { label: 'Vệ sinh môi trường', count: 19, trend: 'down' },
                { label: 'Thủ tục hành chính', count: 15, trend: 'up' }
              ].map((topic, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">{topic.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">{topic.count}</span>
                    {topic.trend === 'up' ? <TrendingUp size={12} className="text-emerald-500" /> : 
                     topic.trend === 'down' ? <TrendingDown size={12} className="text-rose-500" /> : <Minus size={12} className="text-slate-300" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
