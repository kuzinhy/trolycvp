import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  FileUp, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Calendar as CalendarIcon,
  X,
  Zap,
  Trash2,
  Edit3,
  Clock,
  User,
  MapPin,
  HelpCircle,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { generateContentWithRetry, parseAIResponse } from '../../lib/ai-utils';
import { extractTextFromPDF } from '../../lib/pdf-utils';
import { ScheduleItem, determineSession } from './scheduleUtils';

interface AIScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (items: ScheduleItem[]) => Promise<void>;
  showToast: (msg: string, type?: any) => void;
  smartLearnFromText?: (text: string, tagsHint?: string[], isManual?: boolean) => Promise<void>;
}

const SAMPLE_PROMPTS = [
  "Sáng thứ Ba lúc 08:00 họp Ban Thường vụ Đảng ủy tại Phòng họp 1 do Bí thư chủ trì, Văn phòng chuẩn bị báo cáo",
  "Chiều thứ Tư 14:00 đi khảo sát công tác giải phóng mặt bằng tại Chi bộ Khóm 3, PBT Thường trực chủ trì",
  "Sáng thứ Sáu 08:30 Hội nghị Ban Chấp hành Đảng bộ mở rộng sơ kết công tác 9 tháng tại Hội trường A",
  "Sáng thứ Năm lúc 08:00 Thường trực Đảng ủy tiếp công dân định kỳ tại Trụ sở Tiếp công dân"
];

export const AIScheduleModal: React.FC<AIScheduleModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  showToast,
  smartLearnFromText
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ScheduleItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessText = async () => {
    if (!inputText.trim()) {
      showToast("Vui lòng nhập văn bản hoặc câu mô tả lịch công tác", "warning");
      return;
    }

    setIsProcessing(true);
    try {
      const todayFormatted = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi });
      const prompt = `Bạn là Trợ lý Lịch công tác Thường trực Đảng ủy cấp cao. 
Nhiệm vụ: Hãy phân tích đoạn văn bản hoặc thông báo lịch sau đây và trích xuất thành danh sách các cuộc họp / sự kiện công tác.

Ngày hiện tại là: ${todayFormatted}.

VĂN BẢN ĐẦU VÀO:
"""
${inputText}
"""

HÃY TRẢ VỀ JSON ARRAY CÁC ĐỐI TƯỢNG VỚI ĐỊNH DẠNG:
[
  {
    "name": "Tên hoặc nội dung cuộc họp/công việc",
    "date": "YYYY-MM-DD",
    "time": "HH:mm (ví dụ: 08:00 hoặc 14:00)",
    "endTime": "HH:mm (nếu có)",
    "session": "morning" hoặc "afternoon" hoặc "evening",
    "chairperson": "Đồng chí chủ trì (ví dụ: Bí thư, Phó Bí thư TT, Nguyễn Minh Huy...)",
    "location": "Địa điểm (ví dụ: Phòng họp 1, Hội trường A...)",
    "participants": "Thành phần tham dự",
    "preparingUnit": "Cơ quan chuẩn bị (ví dụ: Văn phòng Đảng ủy, Ban Tổ chức...)",
    "category": "standing" | "executive" | "party_cell" | "grassroots" | "citizen" | "online" | "general",
    "priority": "low" | "medium" | "high",
    "description": "Ghi chú, tài liệu yêu cầu nếu có"
  }
]

Quy tắc:
- Tự động tính toán chính xác ngày YYYY-MM-DD dựa trên các từ chỉ thời gian (ví dụ: "thứ Hai tuần này", "ngày mai", "sáng thứ 4...").
- Mặc định: "Sáng" là 08:00 (session: morning), "Chiều" là 14:00 (session: afternoon).
- Nếu văn bản có nhiều cuộc họp trong tuần, hãy bóc tách đầy đủ tất cả các cuộc họp.
- Chỉ trả về JSON array duy nhất, không giải thích thêm.`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const parsed = parseAIResponse(response.text || '[]');
      const itemsList = Array.isArray(parsed) ? parsed : (parsed.items || [parsed]);

      const formatted: ScheduleItem[] = itemsList.map((it: any, index: number) => ({
        id: `ai_${Date.now()}_${index}`,
        name: it.name || 'Cuộc họp công tác',
        date: it.date || format(new Date(), 'yyyy-MM-dd'),
        time: it.time || '08:00',
        endTime: it.endTime || '',
        session: it.session || determineSession(it.time || '08:00'),
        chairperson: it.chairperson || 'Nguyễn Minh Huy',
        location: it.location || 'Phòng họp 1 (Thường trực)',
        participants: Array.isArray(it.participants) ? it.participants.join(', ') : (it.participants || 'Thường trực Đảng ủy'),
        preparingUnit: it.preparingUnit || 'Văn phòng Đảng ủy',
        category: it.category || 'standing',
        priority: it.priority || 'medium',
        description: it.description || '',
        status: 'scheduled'
      }));

      setExtractedItems(formatted);
      showToast(`AI đã trích xuất thành công ${formatted.length} cuộc họp`, "success");

      if (smartLearnFromText) {
        smartLearnFromText(inputText, ['Lịch công tác', 'Trích xuất AI'], false).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      showToast("Không thể trích xuất lịch bằng AI. Vui lòng thử lại.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    showToast(`Đang đọc nội dung file: ${file.name}...`, "info");

    try {
      let content = '';
      if (file.name.endsWith('.pdf')) {
        content = await extractTextFromPDF(file);
      } else {
        content = await file.text();
      }

      setInputText(content);
      showToast("Đã tải nội dung văn bản. Bấm 'Trích xuất bằng AI' để xử lý.", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi đọc file tài liệu", "error");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSaveAll = async () => {
    if (extractedItems.length === 0) return;
    try {
      await onSaveBatch(extractedItems);
      showToast(`Đã lưu thành công ${extractedItems.length} cuộc họp vào lịch`, "success");
      onClose();
    } catch (err) {
      showToast("Có lỗi xảy ra khi lưu lịch", "error");
    }
  };

  const removeItem = (id: string) => {
    setExtractedItems(prev => prev.filter(it => it.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-tight flex items-center gap-2">
                <span>Trợ lý AI Trích xuất Lịch Công tác</span>
                <span className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-[9px] font-black rounded-md">8.0</span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Nhập văn bản tự nhiên hoặc tải file thông báo lịch để AI tự động cấu trúc hóa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Brain size={14} className="text-indigo-600" />
                <span>Nội dung hoặc thông báo lịch công tác</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <FileUp size={12} />
                  <span>{isUploadingFile ? 'Đang đọc...' : 'Tải file văn bản'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu mô tả nhanh hoặc dán thông báo lịch công tác tuần..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
            />

            {/* Sample Prompts */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500">Mẫu câu lệnh gợi ý:</span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(sample)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl text-[11px] font-medium transition-all text-left truncate max-w-full"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            {/* Action Process Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProcessText}
                disabled={isProcessing || !inputText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>AI đang phân tích và cấu trúc hóa lịch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Trích xuất danh sách lịch bằng AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Preview */}
          {extractedItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Danh sách trích xuất ({extractedItems.length} cuộc họp)</span>
                </h4>
                <span className="text-[11px] text-slate-500">Kiểm tra thông tin trước khi lưu</span>
              </div>

              <div className="space-y-2.5">
                {extractedItems.map((item, index) => (
                  <div 
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md">
                          {item.date} | {item.time} ({item.session === 'morning' ? 'Sáng' : 'Chiều'})
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Chủ trì: <strong className="text-slate-800">{item.chairperson}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Loại bỏ mục này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900">{item.name}</h5>

                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-blue-600" /> {item.location}
                        </span>
                      )}
                      {item.preparingUnit && (
                        <span className="flex items-center gap-1">
                          <FileText size={11} className="text-amber-600" /> CB: {item.preparingUnit}
                        </span>
                      )}
                      {item.participants && (
                        <span className="text-slate-500 truncate max-w-xs">
                          TP: {item.participants}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Đóng
          </button>

          {extractedItems.length > 0 && (
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Xác nhận lưu {extractedItems.length} cuộc họp vào lịch</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
