import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BrainCircuit, Loader2, Copy, Check, Upload } from 'lucide-react';

export const QuickAdvisory: React.FC = () => {
  const [news, setNews] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hcmcpvKnowledge, setHcmcpvKnowledge] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch('/api/github/hcmcpv-knowledge')
      .then(res => res.json())
      .then(data => setHcmcpvKnowledge(data.knowledge || []))
      .catch(console.error);
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    let contentToAnalyze = news;

    try {
      if (!contentToAnalyze.trim()) {
        const response = await fetch('/api/fetch-news');
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        contentToAnalyze = data.content;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `Bạn là trợ lý tham mưu cho Đảng ủy phường. Hãy đọc nội dung sau và rút ra hướng chỉ đạo, việc cần làm tại phường theo cấu trúc JSON yêu cầu.

Kho tri thức HCMCPV làm cơ sở tham mưu:
${hcmcpvKnowledge.map(k => k.content).join('\n---\n')}

Nhiệm vụ:
1. Tóm tắt nội dung chính (3-5 dòng).
2. Xác định vấn đề nổi bật (3-5 ý).
3. Rút ra hướng chỉ đạo (3-5 ý, bắt đầu bằng "Tăng cường...", "Đẩy mạnh...", "Rà soát...").
4. Đề xuất việc cần làm tại phường (cụ thể, làm ngay).
5. Đề xuất việc cần làm ngay (2-3 việc quan trọng nhất trong tuần).

Trả kết quả dạng JSON:
{
  "tom_tat": "",
  "van_de": [],
  "huong_chi_dao": [],
  "viec_can_lam": [],
  "viec_lam_ngay": []
}

Nội dung cần xử lý:
${contentToAnalyze}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      setResult(response.text || "{}");
    } catch (error) {
      console.error(error);
      setResult('{"error": "Không thể phân tích tin tức."}');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToKnowledge = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const response = await fetch('/api/github/save-hcmcpv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, tags: ['tham-muu', 'hcmcpv'] })
      });
      const data = await response.json();
      if (data.success) {
        alert('Đã lưu vào kho tri thức HCMCPV!');
        setHcmcpvKnowledge([...hcmcpvKnowledge, { content: result, tags: ['tham-muu', 'hcmcpv'] }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lưu vào kho tri thức.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNews(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Tham mưu nhanh cho Bí thư</h3>
          <p className="text-sm text-slate-500">Trợ lý tham mưu Đảng ủy phường</p>
        </div>
      </div>

      <textarea
        className="w-full p-4 border border-slate-200 rounded-2xl h-48 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        placeholder="Dán tin tức từ Thành ủy TP.HCM vào đây hoặc tải file lên..."
        value={news}
        onChange={(e) => setNews(e.target.value)}
      />

      <div className="flex gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".txt,.md,.pdf"
        />
        <button
          className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={20} />
          Tải văn bản lên
        </button>
        <button
          className="flex-1 bg-purple-600 text-white py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
          {loading ? 'Đang phân tích...' : 'Phân tích & Tham mưu'}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 relative">
          <div className="flex gap-2 absolute top-4 right-4">
            <button 
              onClick={handleSaveToKnowledge}
              className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-100"
              title="Lưu vào kho tri thức HCMCPV"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
            </button>
            <button 
              onClick={copyToClipboard}
              className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-100"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}
    </div>
  );
};
