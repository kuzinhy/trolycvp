import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Sparkles, Copy, Check, Loader2, AlertCircle, Send, FileJson } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export const SmartDataExtractor: React.FC = () => {
  const [text, setText] = useState('');
  const [fields, setFields] = useState('');
  const [extraction, setExtraction] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'table' | 'json' | 'list'>('table');

  const extractData = async () => {
    if (!text.trim()) return;

    setIsExtracting(true);
    setError(null);
    setExtraction(null);

    try {
      const formatMap = {
        table: 'Định dạng bảng Markdown',
        json: 'Định dạng JSON',
        list: 'Danh sách gạch đầu dòng'
      };

      const fieldPrompt = fields.trim() 
        ? `Hãy trích xuất cụ thể các trường thông tin sau: ${fields}.` 
        : `Hãy tự động nhận diện và trích xuất các thông tin quan trọng nhất (như Tên, Ngày tháng, Số tiền, Quyết định, v.v.).`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Bạn là một chuyên gia phân tích và trích xuất dữ liệu. Hãy đọc văn bản sau và trích xuất thông tin.
                
Văn bản gốc:
${text}

Yêu cầu:
1. ${fieldPrompt}
2. Trình bày kết quả dưới dạng: ${formatMap[format]}.
3. Nếu không tìm thấy thông tin cho một trường, hãy ghi "Không có thông tin".
4. Chỉ trả về kết quả trích xuất, không giải thích thêm.` }] }]
      });

      setExtraction(response.text || 'Không có kết quả trích xuất.');
    } catch (err) {
      console.error('Error extracting data:', err);
      setError('Đã xảy ra lỗi khi trích xuất dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    if (extraction) {
      navigator.clipboard.writeText(extraction);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trợ lý Trích xuất Dữ liệu</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI Data Extractor</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Trường thông tin cần lấy (Tùy chọn)</label>
            <input
              type="text"
              value={fields}
              onChange={(e) => setFields(e.target.value)}
              placeholder="VD: Họ tên, Ngày sinh, Số CMND..."
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Định dạng kết quả</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'table', label: 'Bảng (Table)' },
                { id: 'json', label: 'JSON' },
                { id: 'list', label: 'Danh sách' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                    format === f.id 
                      ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán văn bản thô, hợp đồng, báo cáo... vào đây để trích xuất dữ liệu"
            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all text-sm"
          />
          <button
            onClick={extractData}
            disabled={!text.trim() || isExtracting}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-600/20"
          >
            {isExtracting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileJson size={16} />
            )}
            Trích xuất
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
        {extraction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <Sparkles size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Kết quả trích xuất</h4>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            <div className="prose prose-sm max-w-none prose-slate bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              {format === 'json' ? (
                <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto">
                  <code>{extraction.replace(/```json\n?|\n?```/g, '')}</code>
                </pre>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>{extraction}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
