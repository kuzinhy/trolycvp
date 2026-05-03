import { memo } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompetencyMatrixProps {
  data: any[];
}

export const CompetencyMatrix = memo(({ data }: CompetencyMatrixProps) => (
  <div className="xl:col-span-4 os-card p-10 bg-white border border-slate-200 shadow-xl shadow-slate-200/20 relative overflow-hidden min-h-[550px]">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.03),transparent_60%)]" />
    <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mb-32" />
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20 text-white">
          <PieChartIcon size={16} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Ma trận Năng lực</h3>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Đánh giá 6 chiều tiêu chuẩn Elite</p>
      
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
            <Radar
              name="Hiện tại"
              dataKey="A"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="#3b82f6"
              fillOpacity={0.2}
              animationDuration={2500}
            />
            <Radar
              name="Mục tiêu"
              dataKey="B"
              stroke="#10b981"
              strokeWidth={2}
              fill="#10b981"
              fillOpacity={0.05}
              animationDuration={3000}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '24px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-5 mt-8">
        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group transition-all">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Chỉ số Elite</p>
          <p className="text-3xl font-black text-blue-600 italic tracking-tighter">104.2</p>
          <div className="mt-2 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-[70%]" />
          </div>
        </div>
        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group transition-all">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Độ ổn định</p>
          <p className="text-3xl font-black text-blue-500 italic tracking-tighter">98.5%</p>
          <div className="mt-2 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-[98%]" />
          </div>
        </div>
      </div>
    </div>
  </div>
));

CompetencyMatrix.displayName = 'CompetencyMatrix';
