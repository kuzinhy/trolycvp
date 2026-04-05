import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Upload, Search, Mic, Loader2, FileText, Check, Trash2, 
  Database, Settings2, Users, Clock, Target, MessageSquare, Copy, 
  Download, RefreshCw, ChevronRight, Info, Plus, Settings, Globe, X
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProgressPopup } from './ui/ProgressPopup';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';

const TONES = [
  { id: 'formal', label: 'Trang trọng', icon: <Target size={14} /> },
  { id: 'inspiring', label: 'Truyền cảm hứng', icon: <Sparkles size={14} /> },
  { id: 'direct', label: 'Quyết liệt', icon: <Target size={14} /> },
  { id: 'emotional', label: 'Chân thành', icon: <MessageSquare size={14} /> },
];

const STYLES = [
  { id: 'standard', label: 'Chuẩn mực Đảng' },
  { id: 'modern', label: 'Hiện đại, đổi mới' },
  { id: 'traditional', label: 'Truyền thống' },
];

const STRUCTURES = [
  { id: 'classic', label: '3 phần truyền thống' },
  { id: 'problem', label: 'Vấn đề - Giải pháp' },
  { id: 'story', label: 'Kể chuyện dẫn dắt' },
];

const FOCUS_AREAS = [
  { id: 'results', label: 'Thành tích, số liệu' },
  { id: 'people', label: 'Con người, đoàn kết' },
  { id: 'future', label: 'Tầm nhìn, nhiệm vụ' },
];

const AUDIENCES = [
  { id: 'party', label: 'Cán bộ, Đảng viên' },
  { id: 'general', label: 'Quần chúng nhân dân' },
  { id: 'youth', label: 'Thanh niên' },
  { id: 'business', label: 'Doanh nghiệp' },
];

const DURATIONS = [
  { id: 'short', label: '3-5 phút' },
  { id: 'medium', label: '10-15 phút' },
  { id: 'long', label: '20+ phút' },
];

interface SpeechAssistantProps {
  aiKnowledge: any[];
}

export const SpeechAssistant: React.FC<SpeechAssistantProps> = ({ aiKnowledge }) => {
  const [options, setOptions] = useState({
    upgradeStyle: true,
    keepMainPoints: true,
    refineLanguage: true,
    useInternetSearch: false,
    tone: 'formal',
    audience: 'party',
    duration: 'medium',
    style: 'standard',
    structure: 'classic',
    focus: 'results',
    addQuotes: true,
    useLocalContext: true,
  });
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [locality, setLocality] = useState('Phường Thủ Dầu Một');
  const [fileContent, setFileContent] = useState('');
  const [samples, setSamples] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'content'>('config');
  const progress = useSimulatedProgress();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setFileContent(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSamples(prev => [...prev, e.target?.result as string]);
      reader.readAsText(file);
    }
  };

  const removeSample = (index: number) => {
    setSamples(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    // Could add a toast here
  };

  const generateSpeech = async () => {
    setIsGenerating(true);
    progress.start();
    setStatus('Đang phân tích dữ liệu và bài mẫu...');
    try {
      const selectedTone = TONES.find(t => t.id === options.tone)?.label;
      const selectedAudience = AUDIENCES.find(a => a.id === options.audience)?.label;
      const selectedDuration = DURATIONS.find(d => d.id === options.duration)?.label;
      const selectedStyle = STYLES.find(s => s.id === options.style)?.label;
      const selectedStructure = STRUCTURES.find(s => s.id === options.structure)?.label;
      const selectedFocus = FOCUS_AREAS.find(f => f.id === options.focus)?.label;

      let prompt = `Hãy soạn thảo bài phát biểu chuyên nghiệp cho lãnh đạo tại địa phương ${locality} với các thông số thuật toán nâng cao sau:\n`;
      prompt += `- Chủ đề: ${subject}\n`;
      prompt += `- Đối tượng thính giả: ${selectedAudience}\n`;
      prompt += `- Tông giọng chủ đạo: ${selectedTone}\n`;
      prompt += `- Thời lượng dự kiến: ${selectedDuration}\n`;
      prompt += `- Phong cách chính trị: ${selectedStyle}\n`;
      prompt += `- Cấu trúc bài viết: ${selectedStructure}\n`;
      prompt += `- Trọng tâm nhấn mạnh: ${selectedFocus}\n`;
      
      if (options.upgradeStyle) prompt += '- Nâng cấp văn phong chuyên nghiệp, sắc sảo, súc tích.\n';
      if (options.keepMainPoints) prompt += '- Đảm bảo bám sát các số liệu và ý chính trong báo cáo.\n';
      if (options.refineLanguage) prompt += '- Sử dụng ngôn từ trang trọng, đúng chuẩn mực văn bản Đảng và Nhà nước.\n';
      if (options.addQuotes) prompt += '- Trích dẫn các câu nói của Lãnh đạo Đảng, Nhà nước hoặc danh ngôn phù hợp.\n';
      if (options.useLocalContext) prompt += '- Lồng ghép khéo léo đặc thù địa phương và tình hình thực tế.\n';
      
      // Filter knowledge base for speech samples or leader's style
      const speechKnowledge = aiKnowledge.filter(k => 
        k.category === 'Bài phát biểu' || 
        k.tags.some((t: string) => t.toLowerCase().includes('phát biểu') || t.toLowerCase().includes('diễn văn') || t.toLowerCase().includes('lãnh đạo')) ||
        k.title?.toLowerCase().includes('phát biểu') ||
        k.title?.toLowerCase().includes('diễn văn')
      );

      if (speechKnowledge.length > 0) {
        setStatus('Đang phân tích phong cách phát biểu từ bộ nhớ chung...');
        prompt += '\n[PHONG CÁCH PHÁT BIỂU CỦA LÃNH ĐẠO TỪ BỘ NHỚ CHUNG]:\n';
        prompt += 'Dựa vào các bài phát biểu mẫu và quy định sau đây, hãy suy luận và áp dụng phong cách, cách dùng từ, nhịp điệu và tư tưởng chỉ đạo đặc trưng của lãnh đạo:\n';
        speechKnowledge.forEach((k, i) => {
          prompt += `Tài liệu ${i+1} (${k.title || 'Không tên'}):\n${k.content}\n\n`;
        });
      }
      
      if (fileContent) prompt += `\n[DỮ LIỆU THỰC TẾ TỪ BÁO CÁO]:\n${fileContent}\n`;
      if (notes) prompt += `\n[LƯU Ý ĐẶC BIỆT & CHỈ ĐẠO THÊM]:\n${notes}\n`;
      
      if (samples.length > 0) {
        setStatus('Đang học hỏi phong cách từ bài mẫu...');
        prompt += '\n[PHONG CÁCH CẦN HỌC TẬP TỪ CÁC BÀI MẪU]:\n';
        samples.forEach((s, i) => prompt += `Mẫu ${i+1}:\n${s}\n`);
      }

      prompt += `\nCẤU TRÚC YÊU CẦU:
1. Phần mở đầu: Chào mừng, nêu lý do, bối cảnh.
2. Phần nội dung: 
   - Đánh giá kết quả (số liệu cụ thể nếu có).
   - Phân tích tồn tại, hạn chế.
   - Phương hướng, nhiệm vụ trọng tâm.
3. Phần kết luận: Lời chúc, thông điệp truyền cảm hứng, lời kêu gọi hành động.`;

      setStatus('Đang soạn thảo bài phát biểu...');
      const config: any = {
        systemInstruction: `Bạn là chuyên gia soạn thảo diễn văn (Speechwriter) cấp cao cho lãnh đạo Đảng và Nhà nước. 
        Nhiệm vụ của bạn là tạo ra những bài phát biểu có sức nặng, tính thuyết phục cao, ngôn từ sắc bén nhưng vẫn gần gũi (tùy theo tông giọng chọn).
        Hãy đảm bảo tính chính xác về chính trị và sự logic trong lập luận.`,
      };

      if (options.useInternetSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await generateContentWithRetry({
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: config,
      });

      setResult(response.text || 'Không thể tạo bài phát biểu.');
      setActiveTab('content');
    } catch (error) {
      console.error(error);
      setResult('Đã xảy ra lỗi khi tạo bài phát biểu.');
    } finally {
      progress.complete();
      setIsGenerating(false);
      setStatus('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <ProgressPopup 
        isOpen={progress.isSimulating} 
        progress={progress.progress} 
        title="Khởi tạo bài phát biểu" 
        message={status || "AI đang xử lý dữ liệu..."} 
      />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20 relative overflow-hidden group">
            <Mic size={28} className="relative z-10 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Trợ lý Diễn văn Cao cấp</h2>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-widest rounded-full border border-indigo-200">AI Algorithm v2.5</span>
            </div>
            <p className="text-slate-500 mt-1 font-medium">Hệ thống soạn thảo văn bản chính trị chuyên sâu với thuật toán tối ưu hóa ngôn từ</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('config')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'config' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Settings2 size={14} />
            Cấu hình
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            disabled={!result}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'content' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700 disabled:opacity-50"
            )}
          >
            <FileText size={14} />
            Kết quả
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <AnimatePresence mode="wait">
            {activeTab === 'config' ? (
              <motion.div 
                key="config-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  {/* Left Panel: Parameters */}
                  <div className="lg:col-span-5 p-5 bg-slate-50/30 space-y-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Target size={10} /> Thuật toán & Tông giọng
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {TONES.map(tone => (
                          <button
                            key={tone.id}
                            onClick={() => setOptions({...options, tone: tone.id})}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-xl border text-[10px] font-bold transition-all text-left",
                              options.tone === tone.id 
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" 
                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                            <div className={cn(
                              "p-1 rounded-md shrink-0",
                              options.tone === tone.id ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"
                            )}>
                              {tone.icon}
                            </div>
                            <span className="leading-tight truncate">{tone.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Users size={10} /> Đối tượng
                        </label>
                        <select 
                          value={options.audience}
                          onChange={e => setOptions({...options, audience: e.target.value})}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm"
                        >
                          {AUDIENCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Clock size={10} /> Thời lượng
                        </label>
                        <select 
                          value={options.duration}
                          onChange={e => setOptions({...options, duration: e.target.value})}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm"
                        >
                          {DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Settings size={10} /> Phong cách & Cấu trúc
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select 
                            value={options.style}
                            onChange={e => setOptions({...options, style: e.target.value})}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm"
                          >
                            {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                          <select 
                            value={options.structure}
                            onChange={e => setOptions({...options, structure: e.target.value})}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm"
                          >
                            {STRUCTURES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles size={10} /> Trọng tâm nhấn mạnh
                        </label>
                        <select 
                          value={options.focus}
                          onChange={e => setOptions({...options, focus: e.target.value})}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm"
                        >
                          {FOCUS_AREAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Settings2 size={10} /> Tùy chọn nâng cao
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'upgradeStyle', label: 'Nâng cấp văn phong' },
                          { id: 'keepMainPoints', label: 'Bám sát ý chính' },
                          { id: 'refineLanguage', label: 'Chuẩn hóa ngôn từ' },
                          { id: 'addQuotes', label: 'Thêm trích dẫn' },
                          { id: 'useLocalContext', label: 'Lồng ghép thực tế' },
                          { id: 'useInternetSearch', label: 'Tra cứu Internet' },
                        ].map(opt => (
                          <label key={opt.id} className={cn(
                            "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
                            (options as any)[opt.id] ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100 hover:bg-slate-50"
                          )}>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tight">{opt.label}</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={(options as any)[opt.id]} 
                                onChange={e => setOptions({...options, [opt.id]: e.target.checked})} 
                                className="sr-only peer"
                              />
                              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Inputs & Files */}
                  <div className="lg:col-span-7 p-5 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <FileText size={12} className="text-emerald-600" /> Báo cáo
                        </label>
                        <div className="relative group h-16">
                          <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="h-full border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-0.5 group-hover:border-emerald-300 group-hover:bg-emerald-50/30 transition-all">
                            <Upload size={14} className="text-slate-300 group-hover:text-emerald-500" />
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              {fileContent ? "Đã tải" : "Tải báo cáo"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Database size={12} className="text-indigo-600" /> Bài mẫu ({samples.length})
                        </label>
                        <div className="relative group h-16">
                          <input type="file" onChange={handleSampleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="h-full border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-0.5 group-hover:border-indigo-300 group-hover:bg-indigo-50/30 transition-all">
                            <Plus size={14} className="text-slate-300 group-hover:text-indigo-500" />
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Thêm mẫu</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Địa phương</label>
                        <input 
                          value={locality} 
                          onChange={e => setLocality(e.target.value)} 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium outline-none" 
                          placeholder="Phường/Xã..." 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Chủ đề</label>
                        <input 
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium outline-none" 
                          placeholder="Tổng kết..." 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú thêm</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-medium outline-none min-h-[60px] max-h-[80px]" 
                        placeholder="Các ý chính cần nhấn mạnh..." 
                      />
                    </div>

                    <button 
                      onClick={generateSpeech} 
                      disabled={isGenerating} 
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 group"
                    >
                      {isGenerating ? <Loader2 className="animate-spin size-4" /> : (
                        <>
                          <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                          KHỞI TẠO BÀI PHÁT BIỂU
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Văn bản bài phát biểu</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đã tối ưu hóa bởi AI</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={copyToClipboard}
                        className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Sao chép"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Tải xuống PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => setActiveTab('config')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all ml-2"
                      >
                        <RefreshCw size={14} />
                        Soạn lại
                      </button>
                    </div>
                  </div>
                  <div className="p-10 max-h-[700px] overflow-y-auto custom-scrollbar">
                    <div className="markdown-body prose prose-slate max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-2">
                    <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Tông giọng</h4>
                    <p className="text-sm font-medium text-indigo-900">{TONES.find(t => t.id === options.tone)?.label}</p>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Đối tượng</h4>
                    <p className="text-sm font-medium text-emerald-900">{AUDIENCES.find(a => a.id === options.audience)?.label}</p>
                  </div>
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 space-y-2">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest">Thời lượng</h4>
                    <p className="text-sm font-medium text-amber-900">{DURATIONS.find(d => d.id === options.duration)?.label}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
