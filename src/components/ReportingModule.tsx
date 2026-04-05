import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Download, FileText, RefreshCw, PieChart as PieChartIcon, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';

interface ReportingModuleProps {
  tasks?: any[];
  knowledge?: any[];
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'];

export const ReportingModule: React.FC<ReportingModuleProps> = ({ tasks = [], knowledge = [] }) => {
  const [reportType, setReportType] = useState('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState('');
  const [generationMode, setGenerationMode] = useState<'auto' | 'custom'>('auto');
  
  // Custom report fields
  const [metrics, setMetrics] = useState('');
  const [results, setResults] = useState('');
  const [keyPoints, setKeyPoints] = useState('');

  // Calculate Task Statistics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const overdue = tasks.filter(t => {
      if (t.status === 'Completed' || !t.deadline) return false;
      return new Date(t.deadline) < new Date();
    }).length;

    return { total, completed, inProgress, pending, overdue };
  }, [tasks]);

  // Prepare Data for Pie Chart (Task Status)
  const taskStatusData = useMemo(() => [
    { name: 'Đã hoàn thành', value: taskStats.completed },
    { name: 'Đang thực hiện', value: taskStats.inProgress },
    { name: 'Chờ xử lý', value: taskStats.pending },
  ].filter(item => item.value > 0), [taskStats]);

  // Prepare Data for Bar Chart (Tasks by Priority)
  const taskPriorityData = useMemo(() => {
    const high = tasks.filter(t => t.priority === 'High').length;
    const medium = tasks.filter(t => t.priority === 'Medium').length;
    const low = tasks.filter(t => t.priority === 'Low').length;
    
    return [
      { name: 'Cao', count: high },
      { name: 'Trung bình', count: medium },
      { name: 'Thấp', count: low },
    ];
  }, [tasks]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let prompt = '';
      let model = 'gemini-3.1-flash-preview';
      
      if (generationMode === 'auto') {
        prompt = `
Bạn là một trợ lý phân tích dữ liệu chuyên nghiệp. Hãy viết một báo cáo tổng hợp (loại báo cáo: ${reportType}) dựa trên các số liệu sau:

1. Tình hình nhiệm vụ:
- Tổng số: ${taskStats.total}
- Đã hoàn thành: ${taskStats.completed}
- Đang thực hiện: ${taskStats.inProgress}
- Chờ xử lý: ${taskStats.pending}
- Quá hạn: ${taskStats.overdue}

2. Kho kiến thức/Văn bản:
- Tổng số tài liệu: ${knowledge.length}

Yêu cầu:
- Viết bằng tiếng Việt, văn phong trang trọng, chuyên nghiệp.
- Cấu trúc rõ ràng: Tiêu đề, Tóm tắt số liệu, Đánh giá chung, Đề xuất/Khuyến nghị.
- Nhấn mạnh vào tỷ lệ hoàn thành và các công việc quá hạn (nếu có).
`;
      } else {
        model = 'gemini-3.1-pro-preview';
        prompt = `Bạn là chuyên gia văn phòng Đảng ủy. Hãy soạn thảo một báo cáo tổng kết chuyên nghiệp dựa trên các thông tin sau:
      - Chỉ số: ${metrics}
      - Kết quả: ${results}
      - Điểm chính cần đánh giá: ${keyPoints}
      
      Mẫu báo cáo chuẩn:
      I. ĐẶC ĐIỂM TÌNH HÌNH
      II. KẾT QUẢ THỰC HIỆN
      III. ĐÁNH GIÁ CHUNG (Ưu điểm, Hạn chế)
      IV. PHƯƠNG HƯỚNG, NHIỆM VỤ TRỌNG TÂM THỜI GIAN TỚI
      
      Trình bày bằng Markdown chuyên nghiệp.`;
      }

      const response = await generateContentWithRetry({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
      });

      if (response.text) {
        setReport(response.text);
      } else {
        setReport('Không thể tạo báo cáo. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setReport('Đã xảy ra lỗi khi tạo báo cáo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([report], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `bao-cao-${reportType}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhiệm vụ</p>
            <p className="text-2xl font-black text-slate-800">{taskStats.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã hoàn thành</p>
            <p className="text-2xl font-black text-slate-800">{taskStats.completed}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang thực hiện</p>
            <p className="text-2xl font-black text-slate-800">{taskStats.inProgress}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quá hạn</p>
            <p className="text-2xl font-black text-slate-800">{taskStats.overdue}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-slate-900">Trạng thái công việc</h3>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={taskStatusData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60}
                    outerRadius={100} 
                    paddingAngle={5}
                    stroke="none"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Số lượng']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Chưa có dữ liệu công việc
              </div>
            )}
          </div>
        </div>

        {/* Task Priority Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-slate-900">Mức độ ưu tiên</h3>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskPriorityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40}>
                  {taskPriorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Cao' ? '#ef4444' : 
                      entry.name === 'Trung bình' ? '#f59e0b' : '#10b981'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Report Generation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Phân tích và tạo báo cáo</h2>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Đang tạo...' : 'Tạo báo cáo'}
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setGenerationMode('auto')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                generationMode === 'auto' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Từ dữ liệu hệ thống
            </button>
            <button
              onClick={() => setGenerationMode('custom')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                generationMode === 'custom' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Tùy chỉnh nội dung
            </button>
          </div>

          {generationMode === 'auto' ? (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700">Loại báo cáo:</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="weekly">Báo cáo tuần</option>
                <option value="monthly">Báo cáo tháng</option>
                <option value="quarterly">Báo cáo quý</option>
              </select>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea placeholder="Nhập các chỉ số (KPIs)..." value={metrics} onChange={e => setMetrics(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} />
              <textarea placeholder="Nhập kết quả đạt được..." value={results} onChange={e => setResults(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} />
              <textarea placeholder="Nhập các điểm chính cần đánh giá..." value={keyPoints} onChange={e => setKeyPoints(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} />
            </div>
          )}
          
          <AnimatePresence>
            {report && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {report}
                </div>
                
                <button 
                  onClick={downloadReport}
                  className="w-full p-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                >
                  <Download size={18} /> Tải báo cáo (TXT)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
