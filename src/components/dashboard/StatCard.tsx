import { memo } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps { 
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  colorClass: string;
  progress: number;
  trend?: string;
  onAction?: () => void;
}

export const StatCard = memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorClass, 
  progress, 
  trend, 
  onAction 
}: StatCardProps) => (
  <div className="os-card p-10 flex flex-col justify-between group overflow-hidden relative min-h-[260px] bg-white border border-slate-200/60 shadow-lg hover:shadow-2xl transition-all duration-700 rounded-[2.5rem]">
    <div className={cn("absolute -right-8 -top-8 w-48 h-48 rounded-full blur-[64px] opacity-10 group-hover:opacity-20 transition-all duration-1000", colorClass)} />
    <div className="flex items-center justify-between mb-8 relative z-10">
      <div className={cn("p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-700 shadow-xl border border-white/20", colorClass, "text-white")}>
        <Icon size={28} />
      </div>
      <div className="flex items-center gap-3">
        {onAction && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAction(); }}
            className="p-2.5 bg-slate-900 text-white hover:bg-blue-600 rounded-xl shadow-lg border border-slate-800 hover:border-blue-500 transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
          >
            <ArrowUpRight size={18} />
          </button>
        )}
        {trend && (
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Growth</span>
            <div className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-black text-[10px] uppercase tracking-wider border border-emerald-100">
              {trend}
            </div>
          </div>
        )}
      </div>
    </div>
    <div className="relative z-10">
      <div className="flex flex-col space-y-1 mb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">{title}</p>
        <div className="flex items-baseline gap-3">
          <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">{value}</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm">{subtitle}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
          <span className="text-[9px] font-black text-slate-800 font-mono tracking-tighter">{progress}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40 p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 2, ease: "circOut" }}
            className={cn("h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]", colorClass)} 
          />
        </div>
      </div>
    </div>
    
    {/* Decorative Elements */}
    <div className="absolute bottom-2 right-2 flex gap-1 opacity-20">
      <div className="w-1 h-4 bg-slate-200 rounded-full" />
      <div className="w-1 h-3 bg-slate-200 rounded-full" />
      <div className="w-1 h-5 bg-slate-200 rounded-full" />
    </div>
  </div>
));

StatCard.displayName = 'StatCard';
