import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Send, Loader2, Sparkles, LayoutDashboard } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';

interface WorkForecastingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkForecastingModal: React.FC<WorkForecastingModalProps> = ({ isOpen, onClose }) => {
  const [contexts, setContexts] = useState({
    world: '',
    national: '',
    local: ''
  });
  const [forecast, setForecast] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setForecast(null);
    
    try {
      const prompt = `Bạn là chuyên gia phân tích chiến lược, cố vấn tham mưu cho lãnh đạo địa phương.
      Nhiệm vụ của bạn là phân tích tình hình thế giới, trong nước và địa phương, từ đó dự báo xu hướng, nhận diện tác động và đề xuất nội dung chỉ đạo sát thực tiễn cho lãnh đạo địa phương.

      Thông tin đầu vào:
      - Tình hình thế giới: ${contexts.world}
      - Tình hình trong nước: ${contexts.national}
      - Tình hình địa phương: ${contexts.local}

      Hãy phân tích và trình bày theo đúng cấu trúc 10 phần sau đây (I đến X):

      ------------------------------------
      I. PHÂN TÍCH TÌNH HÌNH THẾ GIỚI
      ------------------------------------
      [Phân tích các yếu tố lớn, xác định xu hướng chính, tác động đến VN và địa phương]

      ------------------------------------
      II. PHÂN TÍCH TÌNH HÌNH TRONG NƯỚC
      ------------------------------------
      [Phân tích kinh tế, chính trị-xã hội, chủ trương mới, xác định xu hướng chính, các lĩnh vực cần quan tâm]

      ------------------------------------
      III. PHÂN TÍCH TÌNH HÌNH ĐỊA PHƯƠNG
      ------------------------------------
      [Phân tích kinh tế, xã hội, tư tưởng/dư luận, hệ thống chính trị địa phương]

      ------------------------------------
      IV. NHẬN DIỆN NHỮNG TÁC ĐỘNG CHÍNH
      ------------------------------------
      [Xác định các tác động kinh tế, xã hội, chính trị, quản lý, nguy cơ tiềm ẩn]

      ------------------------------------
      V. DỰ BÁO XU HƯỚNG SẮP TỚI
      ------------------------------------
      [Dự báo ngắn hạn (3-6 tháng), trung hạn (1-2 năm), dài hạn (3-5 năm)]

      ------------------------------------
      VI. ĐỀ XUẤT NỘI DUNG CHỈ ĐẠO CHO LÃNH ĐẠO ĐỊA PHƯƠNG
      ------------------------------------
      [Đề xuất chỉ đạo cụ thể cho 8 nhóm nội dung: kinh tế, xã hội, tuyên truyền, xây dựng Đảng, cải cách hành chính, chuyển đổi số, ổn định tư tưởng, phòng ngừa rủi ro]

      ------------------------------------
      VII. ĐỀ XUẤT NHIỆM VỤ TRỌNG TÂM CỦA ĐỊA PHƯƠNG
      ------------------------------------
      [5 nhiệm vụ trọng tâm, 5 giải pháp then chốt, 5 vấn đề cần theo dõi sát]

      ------------------------------------
      VIII. GỢI Ý NỘI DUNG CHỈ ĐẠO TRONG CÁC CUỘC HỌP
      ------------------------------------
      [Gợi ý nội dung cho Hội nghị giao ban, Ban Thường vụ, cán bộ chủ chốt, phòng ban, khu phố/tổ dân phố]

      ------------------------------------
      IX. NGUYÊN TẮC PHÂN TÍCH
      ------------------------------------
      [Đảm bảo tư duy chiến lược, tầm nhìn lãnh đạo, bám sát thực tiễn, không chung chung, có tính tham mưu]

      ------------------------------------
      X. QUY TẮC TRÌNH BÀY
      ------------------------------------
      [Văn phong báo cáo tham mưu lãnh đạo, ngắn gọn, rõ ý, phân tích sâu, đề xuất cụ thể]
      `;

      const response = await generateContentWithRetry({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });
      
      setForecast(response.text || 'Không thể tạo báo cáo.');
    } catch (error) {
      console.error(error);
      setForecast('Lỗi khi tạo báo cáo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dự báo chiến lược & Xu hướng</h3>
                </div>
              </div>
              <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tình hình thế giới</label>
                    <textarea 
                      value={contexts.world} 
                      onChange={e => setContexts({...contexts, world: e.target.value})} 
                      className="w-full h-40 p-4 rounded-3xl border border-slate-200 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-slate-50/50" 
                      placeholder="Phân tích yếu tố lớn, xu hướng toàn cầu..." 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tình hình trong nước</label>
                    <textarea 
                      value={contexts.national} 
                      onChange={e => setContexts({...contexts, national: e.target.value})} 
                      className="w-full h-40 p-4 rounded-3xl border border-slate-200 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-slate-50/50" 
                      placeholder="Phân tích kinh tế, chính trị, chủ trương mới..." 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tình hình địa phương</label>
                    <textarea 
                      value={contexts.local} 
                      onChange={e => setContexts({...contexts, local: e.target.value})} 
                      className="w-full h-40 p-4 rounded-3xl border border-slate-200 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-slate-50/50" 
                      placeholder="Phân tích kinh tế, xã hội, dư luận địa phương..." 
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {isAnalyzing ? <><Loader2 className="animate-spin" size={20}/> Đang phân tích chiến lược...</> : <><Send size={20}/> Thực hiện dự báo chiến lược</>}
                </button>

                {forecast && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-inner text-sm text-slate-800 leading-relaxed whitespace-pre-line prose prose-slate max-w-none"
                  >
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <LayoutDashboard size={20} />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Báo cáo tham mưu chi tiết</h4>
                    </div>
                    {forecast}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
