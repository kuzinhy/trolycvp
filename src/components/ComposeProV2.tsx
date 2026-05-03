import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ChevronLeft, Sparkles, FileText, Settings2, PenTool, 
  CheckCircle2, Download, Copy, Printer, Save, Share2, ArrowLeft, 
  History, Info, AlertCircle, FileCheck, Wand2, RefreshCw, Send,
  X, Maximize2, Layout, BookOpen, Layers, Brain, Plus
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface ComposeProV2Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  aiKnowledge: any[];
}

interface DocMetadata {
  coQuanChuQuan: string;
  coQuanBanHanh: string;
  soHieu: string;
  loaiVanBan: string;
  diaDanh: string;
  ngayBanHanh: string;
  veViec: string;
  maDonVi: string;
  isLienTich: boolean;
  hinhThucVanBan: string;
}

const DOCUMENT_TYPES = [
  'THÔNG BÁO', 'CÔNG VĂN', 'TỜ TRÌNH', 'BÁO CÁO', 'NGHỊ QUYẾT', 
  'QUYẾT ĐỊNH', 'KẾ HOẠCH', 'CHƯƠNG TRÌNH', 'BIÊN BẢN', 'CHỈ THỊ'
];

const AI_TEMPLATES = [
  { id: 'default', label: 'Mẫu mặc định của hệ thống' },
  { id: 'dang-uy', label: 'Mẫu văn bản Đảng ủy' },
  { id: 'chinh-quyen', label: 'Mẫu văn bản Chính quyền' },
  { id: 'doan-the', label: 'Mẫu văn bản Đoàn thể' }
];

export const ComposeProV2: React.FC<ComposeProV2Props> = ({ showToast, aiKnowledge }) => {
  const [step, setStep] = useState(1);
  const [metadata, setMetadata] = useState<DocMetadata>({
    coQuanChuQuan: 'ĐẢNG ỦY KHỐI CÁC CƠ QUAN TỈNH',
    coQuanBanHanh: 'VĂN PHÒNG ĐẢNG ỦY',
    soHieu: '01/TB-VPĐU',
    loaiVanBan: 'THÔNG BÁO',
    diaDanh: 'Bình Dương',
    ngayBanHanh: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    veViec: 'Về việc triển khai nhiệm vụ trọng tâm tháng 05/2026',
    maDonVi: 'VP',
    isLienTich: false,
    hinhThucVanBan: 'Văn bản Đảng (QĐ 66-QĐ/TW)'
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAiTemplate, setSelectedAiTemplate] = useState('default');
  const [learnedPreferences, setLearnedPreferences] = useState<string[]>([]);
  const [newPreference, setNewPreference] = useState('');
  const [refinementInput, setRefinementInput] = useState('');

  const progressSteps = [
    { id: 1, label: '1. Thiết lập ban đầu' },
    { id: 2, label: '2. Tạo nội dung AI' },
    { id: 3, label: '3. Tinh chỉnh AI' }
  ];

  useEffect(() => {
    // Load learned preferences from local storage if available
    const savedPrefs = localStorage.getItem('compose_pro_preferences');
    if (savedPrefs) {
      try {
        setLearnedPreferences(JSON.parse(savedPrefs));
      } catch (e) {
        console.error('Failed to load preferences');
      }
    }
  }, []);

  const savePreference = (pref: string) => {
    if (!pref.trim()) return;
    const cleanPref = pref.trim();
    if (learnedPreferences.includes(cleanPref)) return;
    
    const newPrefs = [cleanPref, ...learnedPreferences].slice(0, 10); // Keep last 10 preferences
    setLearnedPreferences(newPrefs);
    localStorage.setItem('compose_pro_preferences', JSON.stringify(newPrefs));
    showToast('AI đã ghi nhớ phong cách soạn thảo của đồng chí', 'info');
  };

  const removePreference = (index: number) => {
    const newPrefs = learnedPreferences.filter((_, i) => i !== index);
    setLearnedPreferences(newPrefs);
    localStorage.setItem('compose_pro_preferences', JSON.stringify(newPrefs));
  };

  useEffect(() => {
    // Cập nhật metadata dựa trên mẫu được chọn
    if (selectedAiTemplate === 'dang-uy') {
      setMetadata(prev => ({
        ...prev,
        coQuanChuQuan: 'TỈNH ỦY BÌNH DƯƠNG',
        coQuanBanHanh: 'VĂN PHÒNG TỈNH ỦY',
        maDonVi: 'VPTU',
        hinhThucVanBan: 'Văn bản Đảng (QĐ 66-QĐ/TW)'
      }));
    } else if (selectedAiTemplate === 'chinh-quyen') {
      setMetadata(prev => ({
        ...prev,
        coQuanChuQuan: 'UBND TỈNH BÌNH DƯƠNG',
        coQuanBanHanh: 'SỞ NỘI VỤ',
        maDonVi: 'SNV',
        hinhThucVanBan: 'Hành chính (NĐ 30/2020/NĐ-CP)'
      }));
    } else if (selectedAiTemplate === 'doan-the') {
      setMetadata(prev => ({
        ...prev,
        coQuanChuQuan: 'TỈNH ĐOÀN BÌNH DƯƠNG',
        coQuanBanHanh: 'BAN TUYÊN GIÁO',
        maDonVi: 'BTG',
        hinhThucVanBan: 'Hành chính (NĐ 30/2020/NĐ-CP)'
      }));
    }
  }, [selectedAiTemplate]);

  const handleMetadataChange = (field: keyof DocMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      showToast('Vui lòng nhập định hướng nội dung', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Bạn là một CHUYÊN GIA THAM MƯU CAO CẤP, am hiểu sâu sắc về công tác Đảng và các quy định hành chính của Đảng Cộng sản Việt Nam.
NHIỆM VỤ: Soạn thảo văn bản hành chính Đảng đúng chuẩn và sắc bén.
QUY ĐỊNH CỐT LÕI: Phải tuân thủ nghiêm ngặt Quy định 66-QĐ/TW về thể thức văn bản của Đảng.

THÔNG TIN VĂN BẢN:
- Loại văn bản: ${metadata.loaiVanBan}
- Về việc: ${metadata.veViec}
- Cơ quan ban hành: ${metadata.coQuanBanHanh}
- Định hướng nội dung: ${aiPrompt}

${learnedPreferences.length > 0 ? `PHONG CÁCH VĂN PHONG ƯU TIÊN (Đã học từ thói quen của Chánh văn phòng):
${learnedPreferences.map(p => `- ${p}`).join('\n')}` : ''}

YÊU CẦU BIÊN SOẠN:
1. TRÌNH BÀY: Rõ ràng các mục (I, II, III...) và tiểu mục (1, 2, 3...). 
2. VĂN PHONG: Quyết liệt, thực chất, súc tích, mang tính chỉ đạo/tham mưu cao. Tránh dùng từ ngữ sáo rỗng.
3. PHÁP LÝ: Sử dụng các căn cứ pháp lý của Đảng (Quy định 66, Điều lệ Đảng, các Nghị quyết, Chỉ thị liên quan) một cách phù hợp và chính xác.
4. ĐỊA PHƯƠNG: Ngôn ngữ phải sát với cấp cơ sở (phường/xã), không được quá vĩ mô.
5. KHÔNG bao gồm Quốc hiệu, Tiêu ngữ, Tên cơ quan (phần này đã được trình bày ở khung riêng).
6. TRẢ VỀ: Chỉ trả về nội dung văn bản dưới dạng Markdown.

DỮ LIỆU TRI THỨC THAM CHIẾU:
${aiKnowledge.slice(0, 5).map(k => `- ${k.title}: ${k.content}`).join('\n')}
`;

      const response = await generateContentWithRetry({
        model: 'gemini-2.0-flash-exp',
        contents: [{ parts: [{ text: prompt }] }]
      });

      setAiContent(response.text || '');
      setStep(3);
      showToast('Đã tạo nội dung AI thành công', 'success');
    } catch (error) {
      showToast('Lỗi khi tạo nội dung AI', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {/* Header Bar */}
      <div className="bg-[#b33a30] text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-xs font-medium bg-white/10 px-3 py-1.5 rounded-md hover:bg-white/20 transition-all">
            <ArrowLeft size={16} /> Trang chủ
          </button>
          <h1 className="text-lg font-bold tracking-tight uppercase">
            {metadata.loaiVanBan} - {metadata.ngayBanHanh}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#2c7a36] px-4 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={14} /> Chuẩn Quy định 66-QĐ/TW
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Live Preview */}
        <div className="flex-[1.2] p-8 overflow-y-auto custom-scrollbar flex flex-col items-center bg-[#ecedef]">
          <div className="relative group">
            <div className="absolute -right-12 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-blue-600">
                <Maximize2 size={20} />
               </button>
            </div>
            
            <button className="absolute -right-4 top-0 -translate-y-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all z-10 border border-slate-100">
              Đóng <X size={14} />
            </button>

            {/* A4 Paper Mockup */}
            <div className="bg-white w-[794px] min-h-[1123px] shadow-2xl p-[60px] flex flex-col font-serif text-[#141414] leading-normal animate-in fade-in duration-700">
              {/* Header section (Quốc hiệu, Cơ quan) */}
              <div className="flex justify-between items-start mb-8">
                <div className="text-center w-[40%] flex flex-col items-center">
                  <p className="text-[13px] font-bold uppercase mb-0 tracking-tight leading-tight">
                    {metadata.coQuanChuQuan}
                  </p>
                  <p className="text-[13px] font-bold uppercase border-b border-black pb-1 mb-2 tracking-tight leading-tight">
                    {metadata.coQuanBanHanh}
                  </p>
                  <p className="text-[12px] italic">
                    Số: {metadata.soHieu}
                  </p>
                </div>
                <div className="text-center w-[55%] flex flex-col items-center">
                  <p className="text-[13px] font-bold uppercase tracking-tight leading-tight">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="text-[14px] font-bold uppercase tracking-tight leading-tight">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <div className="w-1/2 h-[1px] bg-black my-2" />
                  <p className="text-[13px] italic mt-2">
                    {metadata.diaDanh}, ngày {metadata.ngayBanHanh.split('/')[0]} tháng {metadata.ngayBanHanh.split('/')[1]} năm {metadata.ngayBanHanh.split('/')[2]}
                  </p>
                </div>
              </div>

              {/* Title section */}
              <div className="text-center my-10 flex flex-col items-center">
                <h2 className="text-[18px] font-bold uppercase mb-1 tracking-wider">
                  {metadata.loaiVanBan}
                </h2>
                <p className="text-[15px] font-bold italic border-b border-black w-fit px-8 pb-1">
                  {metadata.veViec}
                </p>
              </div>

              {/* Content area */}
              <div className="flex-1 text-[14px] text-justify leading-relaxed space-y-4 prose prose-slate max-w-none prose-p:my-2 prose-p:indent-8 prose-li:my-1 font-serif text-black/90">
                {aiContent ? (
                  <ReactMarkdown>{aiContent}</ReactMarkdown>
                ) : (
                  <div className="space-y-6 opacity-40 select-none">
                    <p>[NỘI DUNG VĂN BẢN SẼ HIỂN THỊ TẠI ĐÂY]</p>
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-[90%]" />
                    <div className="h-4 bg-slate-100 rounded w-[95%]" />
                    <div className="h-4 bg-slate-100 rounded w-[40%]" />
                    <div className="h-4 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-[80%]" />
                  </div>
                )}
              </div>

              {/* Footer section (Signing) */}
              <div className="mt-16 flex justify-between">
                <div className="w-[35%] text-[12px] italic space-y-1">
                  <p className="font-bold underline">Nơi nhận:</p>
                  <p>- Như trên;</p>
                  <p>- Lưu: VT, {metadata.maDonVi}.</p>
                </div>
                <div className="w-[45%] text-center flex flex-col items-center">
                  <p className="text-[14px] font-bold uppercase tracking-tight">
                    [CHỨC VỤ]
                  </p>
                  <div className="h-24 flex items-center justify-center italic text-slate-300 text-xs">
                    (Ký tên, đóng dấu)
                  </div>
                  <p className="text-[14px] font-bold uppercase mt-4">
                    [Họ và tên]
                  </p>
                </div>
              </div>

              <div className="mt-auto text-center pt-10">
                <p className="text-[10px] text-slate-400 italic">
                  AI có thể mắc sai sót. Hãy kiểm tra lại thông tin quan trọng.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Control Panel */}
        <div className="flex-1 bg-white border-l border-slate-200 flex flex-col shadow-inner">
          {/* Progress Steps Tabs */}
          <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
            {progressSteps.map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex-1 py-4 text-[11px] font-bold uppercase tracking-wider transition-all relative",
                  step === s.id ? "text-[#b33a30]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s.label}
                {step === s.id && (
                  <motion.div 
                    layoutId="docStep" 
                    className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#b33a30]" 
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-slate-800">Thiết lập ban đầu</h3>
                  
                  {/* AI Learning Section */}
                  <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        <Brain size={14} /> AI đã học được từ đồng chí
                      </label>
                      <Sparkles size={12} className="text-blue-400 animate-pulse" />
                    </div>
                    
                    {learnedPreferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {learnedPreferences.map((pref, i) => (
                          <div key={i} className="group flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">
                            <span className="truncate max-w-[150px]">{pref}</span>
                            <button 
                              onClick={() => removePreference(i)} 
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">AI chưa ghi nhận sở thích nào. Hãy soạn thảo để AI bắt đầu học.</p>
                    )}

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newPreference}
                        onChange={(e) => setNewPreference(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (savePreference(newPreference), setNewPreference(''))}
                        placeholder="Thêm phong cách riêng..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs placeholder:text-slate-300"
                      />
                      <button 
                        onClick={() => { savePreference(newPreference); setNewPreference(''); }}
                        className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* AI Template Select */}
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                      <Sparkles size={14} /> Chọn mẫu AI (Tùy chọn)
                    </label>
                    <select 
                      value={selectedAiTemplate}
                      onChange={(e) => setSelectedAiTemplate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-200 transition-all cursor-pointer"
                    >
                      {AI_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        Hình thức văn bản
                        <Info size={12} className="text-slate-300" />
                      </label>
                      <select 
                        value={metadata.hinhThucVanBan}
                        onChange={(e) => handleMetadataChange('hinhThucVanBan', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700"
                      >
                        <option>Văn bản Đảng (QĐ 66-QĐ/TW)</option>
                        <option>Hành chính (NĐ 30/2020/NĐ-CP)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        Loại văn bản
                        <div className="bg-[#b33a30] text-white px-1.5 py-0.5 rounded text-[8px]">TB</div>
                      </label>
                      <select 
                        value={metadata.loaiVanBan}
                        onChange={(e) => handleMetadataChange('loaiVanBan', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700"
                      >
                        {DOCUMENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Issuing Unit Details */}
                  <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4">
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-[#b33a30] rounded-full" /> Đơn vị ban hành chính
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cơ quan chủ quản</label>
                        <input 
                          type="text"
                          value={metadata.coQuanChuQuan}
                          onChange={(e) => handleMetadataChange('coQuanChuQuan', e.target.value)}
                          placeholder="VD: UBND TỈNH ABC"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium placeholder:text-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã đơn vị</label>
                        <input 
                          type="text"
                          value={metadata.maDonVi}
                          onChange={(e) => handleMetadataChange('maDonVi', e.target.value)}
                          placeholder="VD: ABC"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium placeholder:text-slate-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cơ quan ban hành</label>
                      <input 
                        type="text"
                        value={metadata.coQuanBanHanh}
                        onChange={(e) => handleMetadataChange('coQuanBanHanh', e.target.value)}
                        placeholder="VD: SỞ NỘI VỤ"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium placeholder:text-slate-300"
                      />
                    </div>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={metadata.isLienTich}
                        onChange={(e) => handleMetadataChange('isLienTich', e.target.checked)}
                        className="w-4 h-4 text-[#b33a30] rounded border-slate-300 focus:ring-[#b33a30]/20"
                      />
                      <span className="text-sm font-medium text-slate-700">Là văn bản liên tịch (nhiều đơn vị)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa danh</label>
                      <input 
                        type="text"
                        value={metadata.diaDanh}
                        onChange={(e) => handleMetadataChange('diaDanh', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày ban hành</label>
                      <input 
                        type="text"
                        value={metadata.ngayBanHanh}
                        onChange={(e) => handleMetadataChange('ngayBanHanh', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-4 sticky bottom-0 bg-white">
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full py-4 bg-[#b33a30] text-white rounded-xl font-bold uppercase tracking-[0.2em] shadow-lg shadow-rose-900/10 hover:bg-[#a02f26] transition-all flex items-center justify-center gap-2 group"
                    >
                      Tiếp tục <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                   <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Tạo nội dung AI</h3>
                    <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600">
                      <ChevronLeft size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Về việc (Trích yếu nội dung)</label>
                      <textarea 
                        value={metadata.veViec}
                        onChange={(e) => handleMetadataChange('veViec', e.target.value)}
                        placeholder="VD: Về việc khen thưởng các đơn vị có thành tích xuất sắc..."
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Định hướng nội dung chi tiết <Sparkles size={12} className="text-amber-500" />
                      </label>
                      <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Nhập các ý chính bạn muốn đưa vào văn bản... AI sẽ giúp bạn diễn đạt chuyên nghiệp."
                        rows={8}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-slate-300 resize-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Info size={16} className="text-indigo-500" />
                      <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Mẹo nhỏ</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "Cung cấp các số liệu, tên đơn vị hoặc mốc thời gian cụ thể sẽ giúp AI tạo nội dung chính xác và bớt phải chỉnh sửa hơn."
                    </p>
                  </div>

                  <div className="pt-4 sticky bottom-0 bg-white flex gap-3">
                    <button 
                      onClick={() => setStep(1)}
                      className="px-6 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      Quay lại
                    </button>
                    <button 
                      onClick={generateAIContent}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" /> Đang soạn thảo...
                        </>
                      ) : (
                        <>
                          Tạo nội dung AI <Wand2 size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Tinh chỉnh AI</h3>
                    <div className="flex gap-2">
                       <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-600">
                        <ChevronLeft size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl border border-green-100 bg-green-50/30 border-dashed">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 size={20} className="text-green-500" />
                        <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Nội dung đã sẵn sàng</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Nội dung đã được AI soạn thảo và hiển thị ở khung xem trước. Bạn có thể sửa trực tiếp hoặc yêu cầu AI tinh chỉnh thêm.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yêu cầu tinh chỉnh thêm</p>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => {
                             savePreference("Ưu tiên văn phong trang trọng, chuẩn mực ngoại giao");
                             // Logic to re-generate with this preference would go here
                           }}
                           className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-[#b33a30] transition-all"
                         >
                           Viết lại trang trọng hơn
                         </button>
                         <button 
                           onClick={() => {
                             savePreference("Ưu tiên nội dung ngắn gọn, súc tích, đi thẳng vào vấn đề");
                           }}
                           className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-[#b33a30] transition-all"
                         >
                           Rút gọn bớt nội dung
                         </button>
                      </div>
                      <div className="relative">
                        <textarea 
                          placeholder="VD: Thêm phần căn cứ vào Nghị quyết Đại hội chi bộ..."
                          rows={3}
                          value={refinementInput}
                          onChange={(e) => setRefinementInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium resize-none focus:ring-2 focus:ring-[#b33a30]/10 transition-all"
                        />
                        <button 
                          onClick={() => {
                            if (refinementInput.trim()) {
                              savePreference(`Người dùng yêu cầu cụ thể: ${refinementInput}`);
                              setRefinementInput('');
                            }
                          }}
                          className="absolute bottom-2 right-2 p-2 bg-[#b33a30] text-white rounded-lg hover:bg-[#a02f26] shadow-md transition-colors"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-6 sticky bottom-0 bg-white">
                    <button 
                      onClick={() => {
                        const blob = new Blob([aiContent], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${metadata.veViec}.doc`;
                        a.click();
                        showToast('Đã chuẩn bị file Word để tải xuống', 'success');
                      }}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                    >
                      <Download size={20} />
                      <span className="text-[10px] font-bold uppercase">Xuất Word</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiContent);
                        showToast('Đã sao chép nội dung vào bộ nhớ tạm', 'success');
                      }}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                    >
                      <Copy size={20} />
                      <span className="text-[10px] font-bold uppercase">Sao chép</span>
                    </button>
                    <button 
                      onClick={() => showToast('Đã lưu văn bản vào hệ thống', 'success')}
                      className="col-span-2 py-4 bg-[#b33a30] text-white rounded-2xl font-bold uppercase tracking-[0.2em] shadow-lg shadow-rose-900/20 hover:bg-[#a02f26] transition-all flex items-center justify-center gap-3"
                    >
                      <Save size={20} /> Lưu & Ban hành
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
