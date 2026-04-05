import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Sparkles, Copy, Check, Loader2, AlertCircle, Send, ArrowRightLeft } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export const SmartTranslator: React.FC = () => {
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [targetLang, setTargetLang] = useState<'en' | 'vi' | 'zh' | 'fr' | 'ja'>('en');
  const [tone, setTone] = useState<'formal' | 'casual' | 'technical' | 'legal'>('formal');

  const translateText = async () => {
    if (!text.trim()) return;

    setIsTranslating(true);
    setError(null);
    setTranslation(null);

    try {
      const langMap = {
        en: 'Tiếng Anh',
        vi: 'Tiếng Việt',
        zh: 'Tiếng Trung',
        fr: 'Tiếng Pháp',
        ja: 'Tiếng Nhật'
      };

      const toneMap = {
        formal: 'Trang trọng, lịch sự (phù hợp văn bản hành chính)',
        casual: 'Tự nhiên, thân thiện (phù hợp giao tiếp thông thường)',
        technical: 'Chuyên ngành, kỹ thuật (giữ nguyên các thuật ngữ chuyên môn)',
        legal: 'Pháp lý (chính xác tuyệt đối, ngôn từ pháp luật)'
      };

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [{
            text: `Hãy đóng vai một biên dịch viên chuyên nghiệp. Dịch đoạn văn bản sau sang ${langMap[targetLang]}.
                
Văn bản gốc:
${text}

Yêu cầu:
1. Giọng điệu và văn phong: ${toneMap[tone]}.
2. Đảm bảo bản dịch tự nhiên, trôi chảy và chuẩn xác về mặt ngữ nghĩa.
3. Chỉ trả về nội dung bản dịch, không giải thích thêm.`
          }]
        }]
      });

      setTranslation(response.text || 'Không có kết quả dịch thuật.');
    } catch (err) {
      console.error('Error translating text:', err);
      setError('Đã xảy ra lỗi khi dịch văn bản. Vui lòng thử lại.');
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = () => {
    if (translation) {
      navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Languages size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trợ lý Dịch thuật Đa ngữ</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI Smart Translator</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ngôn ngữ đích</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'en', label: 'Tiếng Anh' },
                { id: 'vi', label: 'Tiếng Việt' },
                { id: 'zh', label: 'Tiếng Trung' },
                { id: 'ja', label: 'Tiếng Nhật' },
                { id: 'fr', label: 'Tiếng Pháp' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setTargetLang(lang.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                    targetLang === lang.id 
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Văn phong</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'formal', label: 'Trang trọng' },
                { id: 'casual', label: 'Tự nhiên' },
                { id: 'technical', label: 'Chuyên ngành' },
                { id: 'legal', label: 'Pháp lý' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                    tone === t.id 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập văn bản cần dịch..."
            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all text-sm"
          />
          <button
            onClick={translateText}
            disabled={!text.trim() || isTranslating}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
          >
            {isTranslating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRightLeft size={16} />
            )}
            Dịch ngay
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100"
          >
            <AlertCircle size={18} />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {translation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sparkles size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Kết quả dịch thuật</h4>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            <div className="prose prose-sm max-w-none prose-slate bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="markdown-body">
                <ReactMarkdown>{translation}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
