import { memo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface PerformanceChartProps {
  data: any[];
}

export const PerformanceChart = memo(({ data }: PerformanceChartProps) => (
  <div className="xl:col-span-8 os-card p-10 relative overflow-hidden min-h-[550px] bg-white border border-slate-200/60 shadow-sm">
    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />
    
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <BarChart3 size={20} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Phân tích Hiệu suất Chiến lược</h3>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] ml-13">Dữ liệu tổng hợp thời gian thực từ các đơn vị nghiệp vụ</p>
      </div>
      <div className="flex flex-wrap items-center gap-5 p-3.5 bg-slate-50/80 backdrop-blur-md rounded-[1.5rem] border border-slate-200/60 shadow-inner">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Thực tế</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="w-2.5 h-2.5 bg-blue-200 rounded-full"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Dự báo</span>
        </div>
      </div>
    </div>

    <div className="h-[420px] w-full relative z-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
            dy={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '24px', 
              border: '1px solid rgba(226, 232, 240, 0.8)', 
              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.12)', 
              padding: '24px', 
              backgroundColor: 'rgba(255, 255, 255, 0.98)', 
              backdropFilter: 'blur(12px)' 
            }}
            itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}
            labelStyle={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" animationDuration={2500} />
          <Area type="monotone" dataKey="predicted" stroke="#93c5fd" strokeWidth={2} strokeDasharray="10 10" fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
));

PerformanceChart.displayName = 'PerformanceChart';
