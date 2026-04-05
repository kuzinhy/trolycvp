import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, Loader2 } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';

export const ReportGeneratorModule: React.FC = () => {
  const [metrics, setMetrics] = useState('');
  const [results, setResults] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Bạn là chuyên gia văn phòng Đảng ủy. Hãy soạn thảo một báo cáo tổng kết chuyên nghiệp dựa trên các thông tin sau:
      - Chỉ số: ${metrics}
      - Kết quả: ${results}
      - Điểm chính cần đánh giá: ${keyPoints}
      
      Mẫu báo cáo chuẩn:
      I. ĐẶC ĐIỂM TÌNH HÌNH
      II. KẾT QUẢ THỰC HIỆN
      III. ĐÁNH GIÁ CHUNG (Ưu điểm, Hạn chế)
      IV. PHƯƠNG HƯỚNG, NHIỆM VỤ TRỌNG TÂM THỜI GIAN TỚI
      
      Trình bày bằng Markdown chuyên nghiệp.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });
      setReport(response.text || 'Không thể tạo báo cáo.');
    } catch (error) {
      console.error(error);
      setReport('Lỗi khi tạo báo cáo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Tạo báo cáo tổng kết AI</h2>
      <textarea placeholder="Nhập các chỉ số (KPIs)..." value={metrics} onChange={e => setMetrics(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" />
      <textarea placeholder="Nhập kết quả đạt được..." value={results} onChange={e => setResults(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" />
      <textarea placeholder="Nhập các điểm chính cần đánh giá..." value={keyPoints} onChange={e => setKeyPoints(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" />
      
      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full p-3 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
      >
        {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} 
        Tạo báo cáo tự động
      </button>

      {report && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 whitespace-pre-line">
          {report}
        </div>
      )}
    </div>
  );
};
