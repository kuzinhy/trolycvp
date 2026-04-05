import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, Copy, Check, Loader2, AlertCircle, RefreshCw, Trash2, PenTool } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { ToastType } from './ui/Toast';

import { useKnowledgeSuggestions } from '../hooks/useKnowledgeSuggestions';

export const SmartEmailAssistant: React.FC<{ aiKnowledge: any[], showToast: (message: string, type: ToastType) => void }> = ({ aiKnowledge, showToast }) => {
  const [prompt, setPrompt] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState<'formal' | 'friendly' | 'urgent'>('formal');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useKnowledgeSuggestions(prompt, aiKnowledge);

  const insertKnowledge = (content: string) => {
    setPrompt(prev => prev + '\n\n' + content);
    showToast('Đã chèn kiến thức vào email', 'success');
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(128, textareaRef.current.scrollHeight)}px`;
    }
  }, [prompt]);

  const generateEmail = async (retryCount = 0) => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setEmail(null);

    try {
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `Hãy soạn một email chuyên nghiệp dựa trên yêu cầu sau: ${prompt}. 
                Phong cách: ${
                  tone === 'formal' ? 'Trang trọng, lịch sự' : 
                  tone === 'friendly' ? 'Thân thiện, cởi mở' : 
                  'Khẩn cấp, trực diện'
                }. 
                
                Yêu cầu:
                1. Bao gồm tiêu đề email (Subject).
                2. Nội dung email đầy đủ, chuyên nghiệp bằng tiếng Việt.
                3. Sử dụng Markdown để định dạng.
                4. Nếu là trang trọng, hãy sử dụng các đại từ xưng hô phù hợp trong môi trường công sở.`
              }
            ]
          }
        ]
      });

      setEmail(response.text || 'Không có kết quả soạn thảo.');
    } catch (err: any) {
      console.error('Error generating email:', err);
      if (err.message?.includes('429') && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateEmail(retryCount + 1);
      }
      setError('Đã xảy ra lỗi khi soạn thảo email. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (email) {
      navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trợ lý Soạn thảo Email Thông minh</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI Email Drafter</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button 
              onClick={() => setTone('formal')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                tone === 'formal' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Trang trọng
            </button>
            <button 
              onClick={() => setTone('friendly')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                tone === 'friendly' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Thân thiện
            </button>
            <button 
              onClick={() => setTone('urgent')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                tone === 'urgent' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Khẩn cấp
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Nhập ý chính của email bạn muốn soạn (ví dụ: xin nghỉ phép, gửi báo cáo, mời họp...)"
              className="w-full h-32 bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all resize-none font-medium placeholder:text-slate-400"
            />
            {suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Kiến thức gợi ý:</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => insertKnowledge(s.content)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      <Sparkles size={12} />
                      {s.title || 'Kiến thức'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPrompt('')}
              className="px-4 py-3.5 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
              title="Xóa nội dung"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => generateEmail()}
              disabled={isGenerating || !prompt.trim()}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300",
                isGenerating || !prompt.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang soạn thảo...
                </>
              ) : (
                <>
                  <PenTool size={16} />
                  Soạn email ngay
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
          >
            <AlertCircle size={18} />
            <p className="text-xs font-bold">{error}</p>
          </motion.div>
        )}

        {email && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 border-blue-100/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 active-glow" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Bản thảo Email AI</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateEmail()}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                  title="Soạn lại"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                  title="Sao chép kết quả"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className="prose prose-slate max-w-none">
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                {email}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Sparkles size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Tiết kiệm thời gian</span>
          </div>
          <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
            Chỉ cần nhập ý chính, AI sẽ giúp bạn diễn đạt một cách chuyên nghiệp và đầy đủ.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <Check size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Đúng văn phong</span>
          </div>
          <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
            Tùy chỉnh phong cách linh hoạt từ trang trọng đến thân thiện tùy theo đối tượng nhận.
          </p>
        </div>
      </div>
    </div>
  );
};
