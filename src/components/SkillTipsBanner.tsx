import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ChevronRight, X } from 'lucide-react';

const TIPS = [
  "Kỹ năng giao tiếp: Luôn mỉm cười và chào hỏi đồng nghiệp khi đến văn phòng để tạo năng lượng tích cực.",
  "Kỹ năng email: Sử dụng tiêu đề email rõ ràng, ngắn gọn để người nhận dễ dàng nắm bắt nội dung chính.",
  "Kỹ năng quản lý thời gian: Áp dụng phương pháp Pomodoro (làm 25 phút, nghỉ 5 phút) để tăng sự tập trung.",
  "Kỹ năng làm việc nhóm: Lắng nghe tích cực và không ngắt lời khi người khác đang trình bày ý kiến.",
  "Kỹ năng giải quyết vấn đề: Khi gặp khó khăn, hãy đề xuất ít nhất 2 giải pháp thay vì chỉ báo cáo vấn đề.",
  "Kỹ năng thuyết trình: Giao tiếp bằng mắt với khán giả giúp tăng sự tự tin và kết nối tốt hơn.",
  "Lưu ý văn phòng: Luôn dọn dẹp không gian làm việc sạch sẽ trước khi ra về để tạo cảm hứng cho ngày hôm sau.",
  "Kỹ năng tin học: Học thêm các phím tắt Excel/Word mỗi tuần để tăng tốc độ xử lý công việc.",
  "Kỹ năng phản hồi: Sử dụng cấu trúc 'Khen ngợi - Góp ý - Khích lệ' khi nhận xét công việc của người khác.",
  "Lưu ý giao tiếp: Tránh sử dụng điện thoại cá nhân trong các cuộc họp quan trọng để thể hiện sự tôn trọng."
];

export const SkillTipsBanner: React.FC = () => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Rotate tips every 15 seconds
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between relative z-50 shadow-sm">
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <Lightbulb size={16} className="text-yellow-300 shrink-0 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider shrink-0 bg-white/20 px-2 py-0.5 rounded-full">
          Mẹo nâng cao kỹ năng
        </span>
        <div className="flex-1 overflow-hidden relative h-5 ml-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentTipIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium truncate absolute inset-0"
              title={TIPS[currentTipIndex]}
            >
              {TIPS[currentTipIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button 
          onClick={() => setCurrentTipIndex((prev) => (prev + 1) % TIPS.length)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Mẹo tiếp theo"
        >
          <ChevronRight size={16} />
        </button>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Đóng"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
