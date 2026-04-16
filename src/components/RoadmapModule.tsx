import React, { memo } from 'react';
import { motion } from 'motion/react';
import { 
  Rocket, 
  BrainCircuit, 
  ShieldAlert, 
  Zap, 
  Globe, 
  Smartphone, 
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'planned' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  timeline: string;
  tags: string[];
}

const roadmapData: RoadmapItem[] = [
  {
    id: '1',
    title: 'AI-Powered Resource Allocation',
    description: 'Hệ thống tự động phân bổ nguồn lực và nhiệm vụ dựa trên ma trận năng lực và khối lượng công việc hiện tại của nhân sự.',
    icon: BrainCircuit,
    status: 'planned',
    priority: 'high',
    timeline: 'Q3 2024',
    tags: ['AI', 'Management', 'Optimization']
  },
  {
    id: '2',
    title: 'Predictive Risk Modeling',
    description: 'Mô hình dự báo rủi ro chiến lược nâng cao, xác định các điểm nghẽn tiềm ẩn trước khi chúng xảy ra.',
    icon: ShieldAlert,
    status: 'in-progress',
    priority: 'high',
    timeline: 'Q4 2024',
    tags: ['AI', 'Risk', 'Strategic']
  },
  {
    id: '3',
    title: 'Automated Document Intelligence',
    description: 'Tìm kiếm ngữ nghĩa trên toàn bộ kho dữ liệu văn bản và tự động tóm tắt nội dung điều hành cho lãnh đạo.',
    icon: Sparkles,
    status: 'planned',
    priority: 'medium',
    timeline: 'Q1 2025',
    tags: ['NLP', 'Knowledge', 'Automation']
  },
  {
    id: '4',
    title: 'Strategic War Room',
    description: 'Không gian cộng tác thời gian thực tích hợp các luồng dữ liệu trực tiếp phục vụ ra quyết định tức thời.',
    icon: Globe,
    status: 'planned',
    priority: 'high',
    timeline: 'Q2 2025',
    tags: ['Collaboration', 'Real-time', 'Data']
  },
  {
    id: '5',
    title: 'Advanced Sentiment Analysis',
    description: 'Phân tích dư luận xã hội và tâm tư nội bộ với khả năng nhận diện cảm xúc chi tiết qua AI.',
    icon: Zap,
    status: 'planned',
    priority: 'medium',
    timeline: 'Q3 2025',
    tags: ['AI', 'Social', 'Analysis']
  },
  {
    id: '6',
    title: 'Mobile Command Center',
    description: 'Ứng dụng di động chuyên biệt dành cho lãnh đạo, cho phép điều hành và phê duyệt mọi lúc mọi nơi.',
    icon: Smartphone,
    status: 'planned',
    priority: 'medium',
    timeline: 'Q4 2025',
    tags: ['Mobile', 'Leadership', 'Remote']
  }
];

export const RoadmapModule: React.FC = memo(() => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto p-8 space-y-12"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm">
            <Rocket size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Product Roadmap</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
            Tầm nhìn <span className="text-blue-600">Chiến lược</span>
          </h1>
          <p className="text-slate-500 max-w-2xl font-medium leading-relaxed">
            Lộ trình phát triển các tính năng đột phá nhằm nâng tầm hệ thống Elite Strategic Hub thành một trung tâm điều hành thông minh toàn diện.
          </p>
        </div>
        
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Planned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">In Progress</span>
          </div>
        </div>
      </div>

      {/* Roadmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {roadmapData.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bento-card p-8 group relative overflow-hidden flex flex-col justify-between min-h-[320px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <Icon size={28} className={cn(
                      item.id === '1' && "text-blue-500",
                      item.id === '2' && "text-rose-500",
                      item.id === '3' && "text-amber-500",
                      item.id === '4' && "text-emerald-500",
                      item.id === '5' && "text-indigo-500",
                      item.id === '6' && "text-slate-700"
                    )} />
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                    item.status === 'in-progress' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {item.status === 'in-progress' ? 'Đang thực hiện' : 'Kế hoạch'}
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-3 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div className="relative z-10 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.timeline}</span>
                </div>
                <div className="flex gap-1">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Call to Action */}
      <div className="bento-card p-12 bg-slate-900 text-white border-none shadow-2xl shadow-slate-900/40 relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)]" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Bạn có ý tưởng mới?</h2>
          <p className="text-slate-400 font-medium">
            Chúng tôi luôn lắng nghe ý kiến từ người dùng để hoàn thiện hệ thống. Hãy chia sẻ những tính năng bạn mong muốn được trải nghiệm trong tương lai.
          </p>
          <button className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 group">
            Gửi đề xuất tính năng
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

RoadmapModule.displayName = 'RoadmapModule';
