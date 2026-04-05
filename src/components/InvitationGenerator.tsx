import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Send, Loader2, Copy, User, MapPin, 
  Calendar, Clock, Info, List, Sparkles, 
  ChevronRight, CheckCircle2, Layout, Type
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { STAFF_LIST } from '../constants';

const INVITATION_SIGNERS = [
  'Nguyễn Thu Cúc',
  'Phạm Văn Nồng',
  'Nguyễn Minh Huy'
];

const TEMPLATES = [
  {
    id: 'hop_chi_bo',
    label: 'Họp Chi bộ',
    icon: 'Users',
    description: 'Mẫu mời họp Chi bộ định kỳ hoặc đột xuất',
    defaultData: {
      ten_su_kien_hoi_nghi: 'Họp Chi bộ định kỳ tháng ...',
      noi_dung_chi_tiet: 'Đánh giá kết quả thực hiện nhiệm vụ chính trị tháng ... và triển khai phương hướng, nhiệm vụ tháng ...',
      loi_ket: 'Rất mong đồng chí sắp xếp công việc đến tham dự đầy đủ, đúng giờ để cuộc họp đạt kết quả tốt./.'
    }
  },
  {
    id: 'hoi_nghi_so_ket',
    label: 'Hội nghị Sơ kết',
    icon: 'BarChart',
    description: 'Mẫu mời hội nghị sơ kết công tác 6 tháng/năm',
    defaultData: {
      ten_su_kien_hoi_nghi: 'Hội nghị sơ kết công tác Đảng 6 tháng đầu năm 2024',
      noi_dung_chi_tiet: 'Sơ kết tình hình thực hiện nhiệm vụ 6 tháng đầu năm và triển khai nhiệm vụ trọng tâm 6 tháng cuối năm 2024.',
      loi_ket: 'Sự hiện diện của đồng chí góp phần vào thành công của Hội nghị./.'
    }
  },
  {
    id: 'le_ky_niem',
    label: 'Lễ Kỷ niệm',
    icon: 'Award',
    description: 'Mẫu mời dự lễ kỷ niệm, ngày truyền thống',
    defaultData: {
      ten_su_kien_hoi_nghi: 'Lễ kỷ niệm ... năm Ngày thành lập Đảng Cộng sản Việt Nam',
      noi_dung_chi_tiet: 'Ôn lại truyền thống vẻ vang của Đảng và biểu dương các tập thể, cá nhân tiêu biểu.',
      loi_ket: 'Trân trọng kính mời đồng chí đến dự lễ./.'
    }
  },
  {
    id: 'dai_hoi',
    label: 'Đại hội',
    icon: 'Gavel',
    description: 'Mẫu mời dự Đại hội Chi bộ/Đảng bộ',
    defaultData: {
      ten_su_kien_hoi_nghi: 'Đại hội Chi bộ ... nhiệm kỳ 2025 - 2027',
      noi_dung_chi_tiet: 'Tổng kết nhiệm kỳ 2022 - 2025 và bầu Ban Chấp hành Chi bộ nhiệm kỳ mới.',
      loi_ket: 'Đề nghị đồng chí chuẩn bị nội dung thảo luận và tham dự đầy đủ./.'
    }
  }
];

const STYLES = [
  { id: 'trang_trong', label: 'Trang trọng', description: 'Văn phong hành chính chuẩn mực' },
  { id: 'hien_dai', label: 'Hiện đại', description: 'Gọn gàng, súc tích, chuyên nghiệp' },
  { id: 'than_mat', label: 'Thân mật', description: 'Ấm áp, gần gũi nhưng vẫn lịch sự' }
];

export const InvitationGenerator: React.FC = () => {
  const [formData, setFormData] = useState({
    ten_co_quan_cap_tren: 'ĐẢNG BỘ PHƯỜNG THỦ DẦU MỘT',
    ten_co_quan_ban_hanh: 'BAN THƯỜNG VỤ',
    so_hieu: '...-TM/ĐU',
    dia_danh: 'Thủ Dầu Một',
    ngay_thang_nam_van_ban: '',
    dong_co_quan_moi: '',
    cach_moi: 'Trân trọng kính mời',
    ho_ten_nguoi_duoc_moi: '',
    chuc_vu_nguoi_duoc_moi: '',
    don_vi_nguoi_duoc_moi: '',
    ten_su_kien_hoi_nghi: '',
    noi_dung_chi_tiet: '',
    can_cu_hoac_ke_hoach_lien_quan: '',
    gio: '',
    phut: '',
    ngay: '',
    thang: '',
    nam: new Date().getFullYear().toString(),
    thu_trong_tuan: '',
    dia_diem_chinh: 'Hội trường Đảng ủy phường',
    dia_chi_day_du: 'Số 01, đường Quang Trung, phường Thủ Dầu Một',
    loi_ket: 'Rất mong đồng chí sắp xếp công việc đến tham dự để hội nghị diễn ra thành công tốt đẹp./.',
    thay_mat: 'T/M BAN THƯỜNG VỤ',
    chuc_vu_nguoi_ky: 'PHÓ BÍ THƯ',
    ho_ten_nguoi_ky: INVITATION_SIGNERS[0],
    noi_nhan: '- Như trên;\n- Thường trực Đảng ủy (b/c);\n- Lưu Văn phòng.',
    kieu_thu_moi: 'Thư mời họp / hội nghị',
    loai_hinh_don_vi: 'Ban Thường vụ Đảng uỷ phường Thủ Dầu Một',
    phong_cach: 'trang_trong',
    mau_chon: ''
  });

  const [result, setResult] = useState<{ normalized: string, letter: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'edit'>('template');

  // Auto-update fields based on unit type
  useEffect(() => {
    if (formData.loai_hinh_don_vi === 'Ban Thường vụ Đảng uỷ phường Thủ Dầu Một') {
      setFormData(prev => ({
        ...prev,
        ten_co_quan_ban_hanh: 'BAN THƯỜNG VỤ',
        thay_mat: 'T/M BAN THƯỜNG VỤ',
        chuc_vu_nguoi_ky: 'PHÓ BÍ THƯ',
        so_hieu: prev.so_hieu.includes('/VP') ? prev.so_hieu.replace('/VP', '/ĐU') : prev.so_hieu
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        ten_co_quan_ban_hanh: 'VĂN PHÒNG',
        thay_mat: 'TL. BAN THƯỜNG VỤ',
        chuc_vu_nguoi_ky: 'CHÁNH VĂN PHÒNG',
        so_hieu: prev.so_hieu.includes('/ĐU') ? prev.so_hieu.replace('/ĐU', '/VP') : prev.so_hieu
      }));
    }
  }, [formData.loai_hinh_don_vi]);

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        ...template.defaultData,
        mau_chon: templateId
      }));
      setActiveTab('edit');
    }
  };

  const [smartInput, setSmartInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleSmartFill = async () => {
    if (!smartInput.trim()) return;
    setIsParsing(true);
    try {
      const prompt = `Bạn là trợ lý hành chính thông minh. Hãy phân tích câu lệnh sau và trích xuất thông tin để điền vào form thư mời.
      Câu lệnh: "${smartInput}"
      
      Hãy trả về một đối tượng JSON với các trường sau (nếu không có thông tin thì để trống):
      - ten_su_kien_hoi_nghi: Tên sự kiện
      - noi_dung_chi_tiet: Nội dung chi tiết
      - gio: Giờ (số)
      - phut: Phút (số)
      - ngay: Ngày (số)
      - thang: Tháng (số)
      - nam: Năm (số)
      - thu_trong_tuan: Thứ (ví dụ: Thứ Hai)
      - dia_diem_chinh: Địa điểm
      - ho_ten_nguoi_duoc_moi: Họ tên người được mời
      - chuc_vu_nguoi_duoc_moi: Chức vụ người được mời
      
      Lưu ý: Nếu người dùng nói "tuần sau", "mai", "mốt", hãy tính toán ngày chính xác dựa trên ngày hiện tại là ${new Date().toLocaleDateString('vi-VN')}.
      Trả về DUY NHẤT đối tượng JSON.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const parsedData = JSON.parse(response.text || '{}');
      setFormData(prev => ({
        ...prev,
        ...parsedData,
        // Ensure some defaults if missing
        ngay: parsedData.ngay || prev.ngay,
        thang: parsedData.thang || prev.thang,
        nam: parsedData.nam || prev.nam,
      }));
      setSmartInput('');
      setActiveTab('edit');
    } catch (error) {
      console.error("Smart fill error:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const style = STYLES.find(s => s.id === formData.phong_cach)?.label || 'Trang trọng';
      
      const prompt = `Bạn là chuyên gia soạn thảo văn bản Đảng cấp cao. Hãy tạo một THƯ MỜI chuyên nghiệp dựa trên các thông tin sau:

      PHONG CÁCH: ${style}
      LOẠI HÌNH ĐƠN VỊ: ${formData.loai_hinh_don_vi}
      DỮ LIỆU CHI TIẾT: ${JSON.stringify(formData)}

      YÊU CẦU VỀ THỂ THỨC (BẮT BUỘC):
      1. Quốc hiệu & Tiêu ngữ: ĐẢNG CỘNG SẢN VIỆT NAM (In hoa, đậm)
      2. Tên cơ quan: ${formData.ten_co_quan_cap_tren} / ${formData.ten_co_quan_ban_hanh} (In hoa, đậm)
      3. Số hiệu: Số ${formData.so_hieu} (Nghiêng)
      4. Địa danh, ngày tháng: ${formData.dia_danh}, ngày ... tháng ... năm ... (Nghiêng)
      5. Tiêu đề: THƯ MỜI (In hoa, đậm, căn giữa)
      6. Tên sự kiện: ${formData.ten_su_kien_hoi_nghi} (In hoa, đậm, căn giữa)
      7. Kính mời: ${formData.cach_moi} [Họ tên/Chức vụ/Đơn vị]
      8. Nội dung: Trình bày mạch lạc, trang trọng.
      9. Thời gian & Địa điểm: Rõ ràng, dễ nhìn.
      10. Ký tên: Đúng thẩm quyền (${formData.thay_mat}, ${formData.chuc_vu_nguoi_ky}, ${formData.ho_ten_nguoi_ky})
      11. Nơi nhận: Liệt kê đúng danh sách.

      YÊU CẦU VỀ VĂN PHONG:
      - Nếu phong cách là 'Trang trọng': Sử dụng từ ngữ chuẩn mực, cung kính.
      - Nếu phong cách là 'Hiện đại': Ngôn ngữ trực diện, chuyên nghiệp, tối giản.
      - Nếu phong cách là 'Thân mật': Sử dụng từ ngữ ấm áp, coi trọng mối quan hệ đồng chí.

      ĐỊNH DẠNG ĐẦU RA:
      PHẦN 1: DỮ LIỆU CHUẨN HÓA (Tóm tắt các trường chính)
      PHẦN 2: THƯ MỜI HOÀN CHỈNH (Trình bày đẹp mắt, font Serif, sẵn sàng in ấn)`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }]
      });

      const text = response.text || '';
      const parts = text.split('PHẦN 2: THƯ MỜI HOÀN CHỈNH');
      setResult({
        normalized: parts[0].replace('PHẦN 1: DỮ LIỆU CHUẨN HÓA', '').trim(),
        letter: parts[1] ? parts[1].trim() : ''
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.letter) {
      navigator.clipboard.writeText(result.letter);
    }
  };

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                <FileText className="text-white" size={28} />
              </div>
              HỆ THỐNG TẠO THƯ MỜI CHUYÊN NGHIỆP
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Soạn thảo văn bản Đảng chuẩn mực với sự hỗ trợ của AI</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('template')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'template' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Layout size={16} /> Chọn mẫu
            </button>
            <button 
              onClick={() => setActiveTab('edit')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'edit' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Type size={16} /> Tùy chỉnh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input Area */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'template' ? (
                <motion.div 
                  key="template-grid"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Smart Fill Input */}
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-indigo-600" size={20} />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Soạn nhanh bằng AI</h3>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={smartInput}
                        onChange={(e) => setSmartInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSmartFill()}
                        placeholder="VD: Mời họp chi bộ sáng thứ 2 tuần sau tại phòng họp A..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button 
                        onClick={handleSmartFill}
                        disabled={isParsing || !smartInput.trim()}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isParsing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        {isParsing ? 'Đang phân tích...' : 'Phân tích'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Nhập nội dung vắn tắt, AI sẽ tự động tính toán ngày giờ và điền vào form cho bạn.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className={cn(
                        "p-6 rounded-3xl border-2 text-left transition-all group relative overflow-hidden",
                        formData.mau_chon === template.id 
                          ? "bg-white border-indigo-500 shadow-xl shadow-indigo-100" 
                          : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg"
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                          <Sparkles className="text-indigo-600" size={24} />
                        </div>
                        {formData.mau_chon === template.id && (
                          <CheckCircle2 className="text-indigo-500" size={20} />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{template.label}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{template.description}</p>
                      <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Sử dụng mẫu này <ChevronRight size={14} />
                      </div>
                    </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="edit-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-8 space-y-8">
                    {/* Style & Unit Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <Sparkles size={14} className="text-indigo-500" /> PHONG CÁCH VĂN BẢN
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {STYLES.map(style => (
                            <button
                              key={style.id}
                              onClick={() => setFormData({...formData, phong_cach: style.id})}
                              className={cn(
                                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                formData.phong_cach === style.id 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                              )}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      </section>
                      <section>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <MapPin size={14} className="text-indigo-500" /> ĐƠN VỊ BAN HÀNH
                        </h3>
                        <div className="flex gap-2">
                          {['Ban Thường vụ', 'Văn phòng'].map(type => (
                            <button
                              key={type}
                              onClick={() => setFormData({...formData, loai_hinh_don_vi: type.includes('Thường vụ') ? 'Ban Thường vụ Đảng uỷ phường Thủ Dầu Một' : 'Văn phòng Đảng uỷ phường'})}
                              className={cn(
                                "flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                formData.loai_hinh_don_vi.includes(type) 
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100" 
                                  : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Main Form Fields */}
                    <div className="space-y-6">
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Info size={14} /> THÔNG TIN CƠ QUAN
                          </h3>
                          <div className="space-y-3">
                            <div className="relative">
                              <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Số hiệu văn bản</label>
                              <input value={formData.so_hieu} onChange={e => setFormData({...formData, so_hieu: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div className="relative">
                              <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Cơ quan cấp trên</label>
                              <input value={formData.ten_co_quan_cap_tren} onChange={e => setFormData({...formData, ten_co_quan_cap_tren: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <User size={14} /> THÔNG TIN NGƯỜI NHẬN
                          </h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="relative">
                                <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Cách mời</label>
                                <select value={formData.cach_moi} onChange={e => setFormData({...formData, cach_moi: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white">
                                  <option>Kính mời</option>
                                  <option>Trân trọng kính mời</option>
                                  <option>Kính mời đồng chí:</option>
                                </select>
                              </div>
                              <div className="relative">
                                <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Họ tên</label>
                                <input placeholder="VD: Đ/c Nguyễn Văn A" value={formData.ho_ten_nguoi_duoc_moi} onChange={e => setFormData({...formData, ho_ten_nguoi_duoc_moi: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                              </div>
                            </div>
                            <div className="relative">
                              <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Chức vụ / Đơn vị</label>
                              <input placeholder="VD: Bí thư Chi bộ Khu phố 1" value={formData.chuc_vu_nguoi_duoc_moi} onChange={e => setFormData({...formData, chuc_vu_nguoi_duoc_moi: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Calendar size={14} /> CHI TIẾT SỰ KIỆN
                        </h3>
                        <div className="space-y-4">
                          <div className="relative">
                            <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Tên sự kiện / Hội nghị</label>
                            <input value={formData.ten_su_kien_hoi_nghi} onChange={e => setFormData({...formData, ten_su_kien_hoi_nghi: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                          </div>
                          
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {['gio', 'phut', 'ngay', 'thang', 'nam', 'thu_trong_tuan'].map((field) => (
                              <div key={field} className="relative">
                                <label className="absolute -top-2 left-3 px-1 bg-white text-[8px] font-bold text-slate-400 uppercase">{field.replace('_trong_tuan', '')}</label>
                                <input 
                                  value={(formData as any)[field]} 
                                  onChange={e => setFormData({...formData, [field]: e.target.value})} 
                                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                              <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Địa điểm chính</label>
                              <input value={formData.dia_diem_chinh} onChange={e => setFormData({...formData, dia_diem_chinh: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm" />
                            </div>
                            <div className="relative">
                              <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Địa chỉ chi tiết</label>
                              <input value={formData.dia_chi_day_du} onChange={e => setFormData({...formData, dia_chi_day_du: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm" />
                            </div>
                          </div>

                          <div className="relative">
                            <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Nội dung chi tiết</label>
                            <textarea 
                              value={formData.noi_dung_chi_tiet} 
                              onChange={e => setFormData({...formData, noi_dung_chi_tiet: e.target.value})} 
                              className="w-full p-4 rounded-2xl border border-slate-200 text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                          </div>
                        </div>
                      </section>

                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Send size={14} /> THẨM QUYỀN KÝ
                          </h3>
                          <div className="space-y-3">
                            <div className="relative">
                              <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Thay mặt / Thừa lệnh</label>
                              <input value={formData.thay_mat} onChange={e => setFormData({...formData, thay_mat: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm bg-slate-50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="relative">
                                <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Chức vụ</label>
                                <input value={formData.chuc_vu_nguoi_ky} onChange={e => setFormData({...formData, chuc_vu_nguoi_ky: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm bg-slate-50" />
                              </div>
                              <div className="relative">
                                <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-slate-400 uppercase">Người ký</label>
                                <select value={formData.ho_ten_nguoi_ky} onChange={e => setFormData({...formData, ho_ten_nguoi_ky: e.target.value})} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm bg-white">
                                  {INVITATION_SIGNERS.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <List size={14} /> NƠI NHẬN
                          </h3>
                          <textarea 
                            value={formData.noi_nhan} 
                            onChange={e => setFormData({...formData, noi_nhan: e.target.value})} 
                            className="w-full p-4 rounded-2xl border border-slate-200 text-xs h-[108px] font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          />
                        </div>
                      </section>
                    </div>

                    <button 
                      onClick={handleGenerate} 
                      disabled={isGenerating}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[20px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18}/>} 
                      {isGenerating ? 'Đang soạn thảo...' : 'Tạo thư mời chuyên nghiệp'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Preview Area */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 space-y-6">
              {result ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bản thảo hoàn tất</span>
                      </div>
                      <button 
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                      >
                        <Copy size={12} /> SAO CHÉP
                      </button>
                    </div>
                    <div className="p-10 bg-white min-h-[500px] whitespace-pre-line font-serif text-slate-900 leading-[1.8] text-sm md:text-[15px] selection:bg-indigo-100">
                      {result.letter}
                    </div>
                  </div>
                  
                  <div className="p-5 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Info size={16} />
                      </div>
                      <h4 className="font-bold text-sm">Hướng dẫn sử dụng</h4>
                    </div>
                    <p className="text-xs text-indigo-100 leading-relaxed">
                      Văn bản đã được AI chuẩn hóa theo thể thức Đảng. Bạn có thể sao chép trực tiếp vào Microsoft Word và chọn font <b>Times New Roman</b>, cỡ chữ <b>14</b> để có kết quả tốt nhất.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-12 flex flex-col items-center justify-center text-center min-h-[600px]">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="text-slate-300" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa có bản thảo nào</h3>
                  <p className="text-sm text-slate-500 max-w-[240px] leading-relaxed">
                    Chọn một mẫu bên trái hoặc tùy chỉnh thông tin để AI bắt đầu soạn thảo thư mời cho bạn.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
