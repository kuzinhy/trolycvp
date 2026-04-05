import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, FileText, Send, CheckCircle2, AlertCircle, Loader2, Copy, Download } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';

export const MeetingAssistant: React.FC = () => {
  const [rawNotes, setRawNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'vi-VN'; // Set language to Vietnamese

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setRawNotes((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError(`Lỗi ghi âm: ${event.error}`);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    } else {
      setError('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    setError(null);
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setRawNotes(''); // Clear previous notes when starting a new recording
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
        setError("Không thể bắt đầu ghi âm. Vui lòng kiểm tra quyền truy cập micro.");
      }
    }
  };

  const handleProcess = async () => {
    if (!rawNotes.trim()) {
      setError('Vui lòng nhập hoặc ghi âm nội dung cuộc họp trước khi tạo biên bản.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSummary('');

    try {
      const prompt = `
Bạn là một thư ký cuộc họp chuyên nghiệp. Hãy tóm tắt và tạo biên bản cuộc họp từ nội dung thô sau đây.
Nội dung thô có thể là văn bản do nhận dạng giọng nói tạo ra, có thể có lỗi chính tả hoặc lủng củng. Hãy sắp xếp lại cho logic, rõ ràng và chuyên nghiệp.

Nội dung thô:
"""
${rawNotes}
"""

Yêu cầu định dạng biên bản:
1. TÓM TẮT CHUNG (1-2 câu ngắn gọn về mục đích/nội dung chính)
2. CÁC ĐIỂM CHÍNH ĐÃ THẢO LUẬN (Sử dụng gạch đầu dòng)
3. KẾT LUẬN & QUYẾT ĐỊNH (Rõ ràng, dứt khoát)
4. PHÂN CÔNG NHIỆM VỤ (Ai làm gì, thời hạn bao giờ - nếu có)

Hãy trình bày bằng tiếng Việt, văn phong trang trọng, chuyên nghiệp, phù hợp với môi trường cơ quan nhà nước hoặc doanh nghiệp.
`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.1-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });

      if (response.text) {
        setSummary(response.text);
      } else {
        setError('Không thể tạo biên bản. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(`Lỗi khi xử lý AI: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    // Could add a toast here
  };

  const downloadAsTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([summary], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "bien-ban-cuoc-hop.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Mic className="text-indigo-600" size={24} />
          Trợ lý họp thông minh
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {/* Input Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Nội dung cuộc họp (Ghi âm hoặc nhập tay)</label>
          <div className="relative">
            <textarea 
              value={rawNotes} 
              onChange={(e) => setRawNotes(e.target.value)}
              className="w-full h-48 p-4 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Nhấn nút ghi âm để bắt đầu nói, hoặc dán nội dung cuộc họp vào đây..."
            />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 text-red-500 text-xs font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Đang ghi âm...
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={toggleRecording}
              className={`flex-1 p-3 rounded-2xl flex items-center justify-center gap-2 font-medium transition-colors ${
                isRecording 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff size={18} /> Dừng ghi âm
                </>
              ) : (
                <>
                  <Mic size={18} /> Bắt đầu ghi âm
                </>
              )}
            </button>
            <button 
              onClick={handleProcess}
              disabled={isProcessing || (!rawNotes.trim() && !isRecording)}
              className="flex-1 p-3 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Đang xử lý AI...
                </>
              ) : (
                <>
                  <FileText size={18} /> Tạo biên bản
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-800 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Output Section */}
        <AnimatePresence>
          {summary && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Biên bản cuộc họp</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Sao chép"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={downloadAsTxt}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Tải xuống TXT"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {summary}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

