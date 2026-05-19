import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Upload, Sparkles, Check, Plus, Trash2 } from 'lucide-react';
import { Task } from '../constants';
import { generateContentWithRetry } from '../lib/ai-utils';

interface AICreateTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTasks: (tasks: any[]) => void;
}

export const AICreateTasksModal: React.FC<AICreateTasksModalProps> = ({ isOpen, onClose, onAddTasks }) => {
  const [draftText, setDraftText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setDraftText(prev => prev + '\n' + (event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleExtract = async () => {
    if (!draftText.trim()) return;
    setIsExtracting(true);
    
    try {
      const prompt = `Bạn là một trợ lý ảo chuyên phân tích văn bản và lập danh sách nhiệm vụ.
Từ bản nháp hoặc nội dung được cung cấp dưới đây, hãy trích xuất ra một danh sách các công việc/nhiệm vụ cần làm.
Với mỗi nhiệm vụ, bắt buộc phải xác định các thông tin sau:
1. Tên nhiệm vụ (ngắn gọn, rõ ràng)
2. Mô tả (chi tiết công việc)
3. Hạn chót (dưới dạng YYYY-MM-DD hoặc text nếu không rõ định dạng)
4. Người phụ trách (Tên người thực hiện)

Nếu thông tin nào không có, hãy để chuỗi rỗng "".
Trả về KẾT QUẢ DUY NHẤT LÀ MỘT MẢNG JSON, không giải thích gì thêm, định dạng:
[
  {
    "title": "Tên nhiệm vụ",
    "description": "Mô tả chi tiết",
    "deadline": "2024-12-31",
    "assignee": "Tên người phụ trách"
  }
]

Nội dung:
${draftText}`;

      const response = await generateContentWithRetry(prompt);
      const outputText = response.text || '';
      const jsonStr = outputText.replace(/`{3}json|`{3}/g, '').trim();
      const parsedTasks = JSON.parse(jsonStr);
      
      const tasksWithMeta = parsedTasks.map((t: any, idx: number) => ({
        ...t,
        id: `ai-task-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        priority: 'medium',
      }));
      
      setExtractedTasks(tasksWithMeta);
      setStep('review');
    } catch (error) {
      console.error(error);
      alert('Không thể trích xuất nhiệm vụ. Vui lòng thử lại.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = () => {
    onAddTasks(extractedTasks);
    // Reset state
    setDraftText('');
    setExtractedTasks([]);
    setStep('input');
    onClose();
  };

  const updateTask = (id: string, field: string, value: string) => {
    setExtractedTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTask = (id: string) => {
    setExtractedTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddNewTask = () => {
    setExtractedTasks(prev => [...prev, {
      id: `ai-task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: '',
      description: '',
      deadline: '',
      assignee: '',
      priority: 'medium'
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={20} />
              Tạo danh sách nhiệm vụ từ văn bản
            </h3>
            <p className="text-xs text-slate-500 mt-1">AI sẽ tự động đọc bản nháp và trích xuất nhiệm vụ</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'input' ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 block">Dán nội dung bản nháp:</label>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Ví dụ: Cuộc họp sáng nay chỉ đạo việc: Cần bạn An hoàn thành báo cáo quý trước ngày 20/12. Chị Nhung chịu trách nhiệm liên hệ khách hàng..."
                  className="w-full h-48 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 text-sm resize-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hoặc</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-3">Tải lên file văn bản (.txt)</label>
                <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl px-6 py-8 cursor-pointer transition-colors group">
                  <Upload size={24} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">Click để chọn file hoặc kéo thả file vào đây</span>
                  <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 text-sm">Danh sách các nhiệm vụ được trích xuất ({extractedTasks.length})</h4>
                <button
                  onClick={handleAddNewTask}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                >
                  <Plus size={14} /> Thêm thủ công
                </button>
              </div>
              <div className="space-y-4">
                {extractedTasks.map((task, idx) => (
                  <div key={task.id || `extracted-${idx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 relative group">
                    <button
                      onClick={() => removeTask(task.id)}
                      className="absolute top-4 right-4 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all bg-white p-1.5 rounded-lg shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Tên nhiệm vụ <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-0 text-sm font-bold text-slate-800"
                          placeholder="Mô tả ngắn gọn"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hạn chót <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={task.deadline}
                          onChange={(e) => updateTask(task.id, 'deadline', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-0 text-sm"
                          placeholder="Ví dụ: 2024-12-31"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Người phụ trách <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={task.assignee}
                          onChange={(e) => updateTask(task.id, 'assignee', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-0 text-sm"
                          placeholder="Nhập tên người phụ trách"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mô tả chi tiết <span className="text-rose-500">*</span></label>
                        <textarea
                          value={task.description || ''}
                          onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-0 text-sm resize-none h-20"
                          placeholder="Mô tả các yêu cầu cụ thể..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {extractedTasks.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <p className="text-slate-500 text-sm">Chưa có nhiệm vụ nào được trích xuất.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={() => step === 'review' ? setStep('input') : onClose()}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm"
          >
            {step === 'review' ? 'Quay lại' : 'Hủy bỏ'}
          </button>
          
          {step === 'input' ? (
            <button
              onClick={handleExtract}
              disabled={isExtracting || !draftText.trim()}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 text-sm"
            >
              {isExtracting ? (
                <span>Đang trích xuất...</span>
              ) : (
                <>
                  <Sparkles size={16} /> <span>Nhận diện nhiệm vụ</span>
                </>
              )}
            </button>
          ) : (
             <button
                onClick={handleSubmit}
                disabled={extractedTasks.length === 0}
                className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 text-sm"
              >
                <Check size={16} /> <span>Lưu ({extractedTasks.length}) nhiệm vụ</span>
             </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
