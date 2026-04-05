import React, { useState } from 'react';
import { Upload, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';

interface AnalysisResult {
  title: string;
  summary: string;
  actionItems: string[];
  risks: string[];
}

export const DocumentScanner: React.FC = () => {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze the following document based on administrative and legal rules. Extract the title, a brief summary, key action items, and potential risks.
      
      Document content:
      ${content}
      
      Return the result in JSON format:
      {
        "title": "...",
        "summary": "...",
        "actionItems": ["...", "..."],
        "risks": ["...", "..."]
      }`;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const jsonResult = JSON.parse(response.text || '{}');
      setResult(jsonResult);
    } catch (error) {
      console.error('Error analyzing document:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Quét văn bản</h2>
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Dán nội dung văn bản cần quét vào đây..."
        className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
      />
      <button 
        onClick={handleAnalyze}
        disabled={isAnalyzing || !content.trim()}
        className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
      >
        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Phân tích văn bản
      </button>

      {result && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pt-4">
          <h3 className="font-bold text-slate-800">{result.title}</h3>
          <p className="text-sm text-slate-600">{result.summary}</p>
          
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Action Items</h4>
            <ul className="list-disc list-inside text-sm text-slate-600">
              {result.actionItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-2"><AlertCircle size={16} className="text-rose-500" /> Risks</h4>
            <ul className="list-disc list-inside text-sm text-slate-600">
              {result.risks.map((risk, i) => <li key={i}>{risk}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
