import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Search, 
  ShieldAlert, 
  Loader2, 
  Download, 
  Copy, 
  Filter, 
  AlertTriangle, 
  Info, 
  EyeOff, 
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  Clock,
  Database,
  ShieldCheck,
  Facebook,
  Youtube,
  MessageSquare,
  Globe
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';

// Types based on the user request
interface DetectedArea {
  ward: string;
  district_or_city: string;
  province_or_city: string;
  formatted_address: string;
}

interface AreaProfile {
  aliases: string[];
  landmarks: string[];
  roads: string[];
  institutions: string[];
}

interface AlertEvent {
  event_id: string;
  title: string;
  summary: string;
  topic: 'an_ninh_trat_tu' | 'tai_nan' | 'chay_no' | 'khieu_nai_to_cao' | 'ha_tang_dan_sinh' | 'moi_truong' | 'y_te' | 'giao_duc' | 'du_luan_xa_hoi' | 'tin_gia_hoac_chua_kiem_chung' | 'khac';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source_name: string;
  source_type: 'official' | 'news_mainstream' | 'social_public' | 'forum_blog' | 'unknown';
  url: string;
  published_at: string;
  relevance_score: number;
  priority_score: number;
  verification_status: 'verified' | 'partially_verified' | 'unverified';
  location_evidence: string[];
  entities: string[];
  recommended_action: string;
}

interface WatchlistItem {
  title: string;
  reason: string;
  url: string;
  source_name: string;
  published_at: string;
}

interface IgnoredResult {
  title: string;
  url: string;
  reason: string;
}

interface ScanResponse {
  gps_input: { latitude: number; longitude: number };
  detected_area: DetectedArea;
  area_profile: AreaProfile;
  queries_used: string[];
  alerts: AlertEvent[];
  watchlist: WatchlistItem[];
  ignored_results_reasoning: IgnoredResult[];
}

const TOPICS = [
  { id: 'all', label: 'Tất cả chủ đề' },
  { id: 'an_ninh_trat_tu', label: 'An ninh trật tự' },
  { id: 'tai_nan', label: 'Tai nạn' },
  { id: 'chay_no', label: 'Cháy nổ' },
  { id: 'khieu_nai_to_cao', label: 'Khiếu nại tố cáo' },
  { id: 'ha_tang_dan_sinh', label: 'Hạ tầng dân sinh' },
  { id: 'moi_truong', label: 'Môi trường' },
  { id: 'y_te', label: 'Y tế' },
  { id: 'giao_duc', label: 'Giáo dục' },
  { id: 'du_luan_xa_hoi', label: 'Dư luận xã hội' },
  { id: 'tin_gia_hoac_chua_kiem_chung', label: 'Tin giả/Chưa kiểm chứng' },
];

const SEVERITIES = [
  { id: 'all', label: 'Tất cả mức độ' },
  { id: 'critical', label: 'Đặc biệt nghiêm trọng', color: 'bg-rose-600' },
  { id: 'high', label: 'Nghiêm trọng', color: 'bg-orange-500' },
  { id: 'medium', label: 'Trung bình', color: 'bg-yellow-500' },
  { id: 'low', label: 'Thấp', color: 'bg-blue-500' },
];

const SOURCE_TYPES = [
  { id: 'all', label: 'Tất cả nguồn' },
  { id: 'official', label: 'Chính thống' },
  { id: 'news_mainstream', label: 'Báo chí' },
  { id: 'social_public', label: 'Mạng xã hội' },
  { id: 'forum_blog', label: 'Diễn đàn/Blog' },
];

const VERIFICATION_STATUSES = [
  { id: 'all', label: 'Tất cả trạng thái' },
  { id: 'verified', label: 'Đã kiểm chứng' },
  { id: 'partially_verified', label: 'Kiểm chứng một phần' },
  { id: 'unverified', label: 'Chưa kiểm chứng' },
];

const SUGGESTED_TAGS = [
  'Khiếu nại',
  'Phản ánh',
  'Tụ tập',
  'Biểu tình',
  'Đình công',
  'Tranh chấp đất đai',
  'Ô nhiễm môi trường',
  'Tệ nạn xã hội',
  'Tai nạn giao thông',
  'Cháy nổ'
];

export const ToxicInfoDetection: React.FC = () => {
  // Input states
  const [latitude, setLatitude] = useState<string>('10.8231'); // Default to TP.HCM
  const [longitude, setLongitude] = useState<string>('106.6297');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [maxResults, setMaxResults] = useState<number>(20);
  const [isDeepScan, setIsDeepScan] = useState<boolean>(false);
  
  // App states
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist' | 'ignored'>('alerts');
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [detectedArea, setDetectedArea] = useState<DetectedArea | null>(null);
  
  // Filter states
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');

  // Get current location
  const handleGetLocation = () => {
    // Disable automatic geolocation to avoid policy violations
    alert("Tính năng định vị tự động đã bị tắt để đảm bảo tính ổn định. Vui lòng nhập tọa độ thủ công.");
  };

  // Identify Ward
  const handleIdentifyWard = async () => {
    if (!latitude || !longitude) return;
    
    setIsIdentifying(true);
    try {
      const response = await fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: Number(latitude), longitude: Number(longitude) })
      });
      
      if (!response.ok) throw new Error("Lỗi xác định địa bàn");
      
      const data = await response.json();
      setDetectedArea({
        ward: data.ward || "Không xác định",
        district_or_city: data.district_or_city || "Không xác định",
        province_or_city: data.province_or_city || "Không xác định",
        formatted_address: data.formatted_address
      });
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi xác định địa bàn.");
    } finally {
      setIsIdentifying(false);
    }
  };

  // Scan Sources using Gemini
  const handleScanSources = async () => {
    if (!latitude || !longitude) return;
    
    setIsScanning(true);
    try {
      // Step 1: Prepare scan data from backend
      const prepareRes = await fetch('/api/prepare-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          latitude: Number(latitude), 
          longitude: Number(longitude),
          customQuery: customQuery
        })
      });
      
      if (!prepareRes.ok) throw new Error("Lỗi chuẩn bị dữ liệu quét");
      const scanData = await prepareRes.json();
      
      // Step 2: Call Gemini on frontend
      const prompt = `Bạn là Chuyên gia An ninh mạng cao cấp và Giám sát thông tin chiến lược.
      
      Mục tiêu tối thượng:
      - KHÔNG BỎ SÓT bất kỳ tín hiệu nào liên quan đến địa bàn: ${scanData.detected_area.ward}, ${scanData.detected_area.district_or_city}, ${scanData.detected_area.province_or_city}.
      - Đặc biệt chú trọng các nền tảng mạng xã hội: TikTok, Facebook, Telegram, YouTube, Zalo, và các diễn đàn địa phương.
      - Phát hiện sớm các dấu hiệu: kích động, tin giả, tụ tập đông người, sự cố hạ tầng, tai nạn, hoặc các vấn đề gây bức xúc dư luận.

      Chế độ quét: ${isDeepScan ? "CHUYÊN SÂU (Deep Scan) - Phân tích mọi ngóc ngách, tìm kiếm cả các bài đăng nhỏ lẻ trên MXH" : "TIÊU CHUẨN"}

      Hồ sơ địa bàn (Area Profile):
      - Tên gọi/Bí danh: ${scanData.area_profile.aliases.join(", ")}
      - Địa danh/Công trình: ${scanData.area_profile.landmarks.join(", ")}
      - Tuyến đường: ${scanData.area_profile.roads.join(", ")}
      - Cơ quan/Tổ chức: ${scanData.area_profile.institutions.join(", ")}

      Các từ khóa tìm kiếm: ${scanData.queries_used.join(", ")}
      Khoảng thời gian: ${timeRange}
      Số lượng kết quả tối đa: ${maxResults}

      Nhiệm vụ của bạn:
      1. Sử dụng Google Search để truy quét các bài viết trên Facebook, TikTok, Telegram (t.me), YouTube và các trang tin.
      2. Phân tích sâu nội dung: Nếu là bài đăng MXH, hãy cố gắng xác định thái độ của cộng đồng (comment, tương tác).
      3. Đánh giá mức độ liên quan (relevance_score) cực kỳ khắt khe dựa trên bằng chứng địa lý.
      4. Phân loại mức độ nghiêm trọng (severity) từ góc nhìn an ninh:
         - Critical: Nguy cơ bạo động, cháy nổ lớn, tai nạn thảm khốc, tin giả gây hoang mang cực độ.
         - High: Sự cố hạ tầng nghiêm trọng, khiếu kiện đông người, tệ nạn công khai.
      5. Trả về JSON theo schema, đảm bảo trường 'source_type' phản ánh đúng nền tảng (ví dụ: 'social_public' cho FB/TikTok).

      QUY TẮC CHẤM ĐIỂM RELEVANCE:
      - +40 nếu tiêu đề/nội dung chứa chính xác tên phường/xã và quận/huyện.
      - +20 nếu đề cập đến các địa danh cụ thể trong Area Profile.
      - +20 nếu có bằng chứng hình ảnh/video mô tả đúng đặc điểm địa bàn.
      - -30 nếu thông tin quá chung chung cấp Tỉnh/Thành mà không có chi tiết cấp Phường.

      Trả về JSON:
      {
        "alerts": [
          {
            "event_id": "string",
            "title": "string",
            "summary": "string",
            "topic": "enum",
            "severity": "enum",
            "source_name": "string (ví dụ: Facebook - Nhóm Dân cư...)",
            "source_type": "enum",
            "url": "string",
            "published_at": "ISO date",
            "relevance_score": number,
            "priority_score": number,
            "verification_status": "enum",
            "location_evidence": ["string"],
            "entities": ["string"],
            "recommended_action": "string"
          }
        ],
        "watchlist": [...],
        "ignored_results_reasoning": [...]
      }`;

      const response = await generateContentWithRetry({
        model: "gemini-3.1-pro-preview",
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        },
        contents: prompt
      });

      const result = JSON.parse(response.text || '{}');
      
      setScanResult({
        ...scanData,
        alerts: result.alerts || [],
        watchlist: result.watchlist || [],
        ignored_results_reasoning: result.ignored_results_reasoning || []
      });
      
      if (result.alerts?.length > 0) setActiveTab('alerts');
      else if (result.watchlist?.length > 0) setActiveTab('watchlist');
      else setActiveTab('ignored');

    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi quét nguồn tin.");
    } finally {
      setIsScanning(false);
    }
  };

  // Filter filtered results
  const filteredAlerts = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.alerts.filter(alert => {
      const matchTopic = filterTopic === 'all' || alert.topic === filterTopic;
      const matchSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchSource = filterSource === 'all' || alert.source_type === filterSource;
      const matchVerification = filterVerification === 'all' || alert.verification_status === filterVerification;
      return matchTopic && matchSeverity && matchSource && matchVerification;
    });
  }, [scanResult, filterTopic, filterSeverity, filterSource, filterVerification]);

  // Export functions
  const copyJson = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(JSON.stringify(scanResult, null, 2));
    alert("Đã sao chép JSON vào bộ nhớ tạm.");
  };

  const exportCsv = () => {
    if (!scanResult || scanResult.alerts.length === 0) return;
    
    const headers = ["ID", "Tiêu đề", "Chủ đề", "Mức độ", "Nguồn", "Ngày đăng", "Điểm liên quan", "Điểm ưu tiên", "URL"];
    const rows = scanResult.alerts.map(a => [
      a.event_id,
      `"${a.title.replace(/"/g, '""')}"`,
      a.topic,
      a.severity,
      a.source_name,
      a.published_at,
      a.relevance_score,
      a.priority_score,
      a.url
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `alerts_${detectedArea?.ward || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSeverityDot = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  const getPlatformInfo = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('facebook.com')) return { label: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (lowerUrl.includes('tiktok.com')) return { label: 'TikTok', icon: Globe, color: 'text-slate-900', bg: 'bg-slate-100' };
    if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram')) return { label: 'Telegram', icon: MessageSquare, color: 'text-sky-500', bg: 'bg-sky-50' };
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return { label: 'YouTube', icon: Youtube, color: 'text-red-600', bg: 'bg-red-50' };
    if (lowerUrl.includes('zalo.me')) return { label: 'Zalo', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50' };
    return { label: 'Web', icon: Globe, color: 'text-slate-500', bg: 'bg-slate-50' };
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8">
      {/* v5.0 PRO Header */}
      <div className="bento-card bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-indigo-500/20 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl -ml-24 -mb-24 group-hover:bg-rose-500/20 transition-all duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-500/20 animate-pulse">
                <ShieldAlert className="text-rose-400" size={28} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">
                    Toxic Info <span className="text-indigo-400">Detection</span>
                  </h1>
                  <div className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-indigo-500/20">
                    <ShieldCheck size={10} />
                    v5.0 PRO
                  </div>
                </div>
                <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                  <Globe size={14} className="text-indigo-400" />
                  Hệ thống giám sát an ninh địa bàn & tin tức xấu độc đa nền tảng (FB, TikTok, Telegram)
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={copyJson}
              disabled={!scanResult}
              className="btn-pro btn-pro-dark flex items-center gap-2 group/btn"
              title="Copy JSON Data"
            >
              <Copy size={18} className="group-hover/btn:scale-110 transition-transform" />
              <span className="hidden sm:inline">Dữ liệu JSON</span>
            </button>
            <button 
              onClick={exportCsv}
              disabled={!scanResult}
              className="btn-pro btn-pro-primary flex items-center gap-2 group/btn"
              title="Export CSV Report"
            >
              <Download size={18} className="group-hover/btn:translate-y-0.5 transition-transform" />
              <span className="hidden sm:inline">Xuất báo cáo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Area Info (Bento Style) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Input Area */}
          <div className="bento-card p-6 space-y-6 bg-white/80 backdrop-blur-xl border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="heading-pro text-indigo-900 flex items-center gap-2">
                <Filter size={16} className="text-indigo-600" />
                Cấu hình giám sát
              </h3>
              <button 
                onClick={handleGetLocation}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <MapPin size={12} />
                Định vị GPS
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vĩ độ (Lat)</label>
                <input 
                  type="text" 
                  value={latitude} 
                  onChange={e => setLatitude(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kinh độ (Long)</label>
                <input 
                  type="text" 
                  value={longitude} 
                  onChange={e => setLongitude(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đối tượng/Sự kiện cần quét</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={customQuery} 
                    onChange={e => setCustomQuery(e.target.value)}
                    placeholder="Nhập từ khóa, sự kiện, đối tượng..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                  <Search className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setCustomQuery(prev => {
                      const terms = prev.split(',').map(t => t.trim()).filter(Boolean);
                      if (terms.includes(tag)) return prev;
                      return prev ? `${prev}, ${tag}` : tag;
                    })}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phạm vi thời gian</label>
                <select 
                  value={timeRange} 
                  onChange={e => setTimeRange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all appearance-none"
                >
                  <option value="24h">24 giờ qua</option>
                  <option value="3d">3 ngày qua</option>
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giới hạn kết quả</label>
                <input 
                  type="number" 
                  value={maxResults} 
                  onChange={e => setMaxResults(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-center justify-between group cursor-pointer" onClick={() => setIsDeepScan(!isDeepScan)}>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Deep Scan Mode</span>
                <p className="text-[9px] text-indigo-600/70 font-medium italic">Truy quét ngách trên TikTok, Telegram, Zalo</p>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full transition-all relative p-1",
                isDeepScan ? "bg-indigo-600" : "bg-slate-300"
              )}>
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  isDeepScan ? "translate-x-6" : "translate-x-0"
                )} />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={handleIdentifyWard}
                disabled={isIdentifying || !latitude || !longitude}
                className="btn-pro btn-pro-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                {isIdentifying ? <Loader2 className="animate-spin" size={16} /> : <MapIcon size={16} />}
                Xác định địa bàn
              </button>
              <button 
                onClick={handleScanSources}
                disabled={isScanning || !latitude || !longitude}
                className="btn-pro btn-pro-primary w-full py-4 flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20"
              >
                {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                Kích hoạt truy quét
              </button>
            </div>
          </div>

          {/* Detected Area Info */}
          <AnimatePresence>
            {detectedArea && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bento-card p-6 bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100 space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <MapPin className="text-white" size={20} />
                  </div>
                  <h3 className="heading-pro text-slate-900">Địa bàn mục tiêu</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Phường/Xã', value: detectedArea.ward },
                    { label: 'Quận/Huyện', value: detectedArea.district_or_city },
                    { label: 'Tỉnh/Thành', value: detectedArea.province_or_city }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/80">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                      <span className="text-xs font-black text-indigo-900">{item.value}</span>
                    </div>
                  ))}
                  <div className="p-3 bg-white/50 rounded-xl border border-white/80 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ chuẩn hóa</span>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">{detectedArea.formatted_address}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Results (Bento Grid Results) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Filters & Tabs Bento */}
          <div className="bento-card p-5 bg-white/90 backdrop-blur-xl border-slate-200 shadow-xl sticky top-4 z-20 space-y-5">
            <div className="flex items-center gap-6 border-b border-slate-100 overflow-x-auto no-scrollbar">
              {[
                { id: 'alerts', label: 'Cảnh báo an ninh', count: scanResult?.alerts.length, color: 'bg-rose-500' },
                { id: 'watchlist', label: 'Đối tượng theo dõi', count: scanResult?.watchlist.length, color: 'bg-orange-500' },
                { id: 'ignored', label: 'Dữ liệu loại bỏ', count: null, color: 'bg-slate-400' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "pb-4 px-2 text-sm font-black transition-all relative whitespace-nowrap uppercase tracking-tighter italic",
                    activeTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count !== null && tab.count > 0 && (
                    <span className={cn("ml-2 px-2 py-0.5 text-white text-[10px] rounded-full font-black", tab.color)}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[
                { icon: Filter, value: filterTopic, setter: setFilterTopic, options: TOPICS },
                { icon: AlertTriangle, value: filterSeverity, setter: setFilterSeverity, options: SEVERITIES },
                { icon: Database, value: filterSource, setter: setFilterSource, options: SOURCE_TYPES },
                { icon: CheckCircle2, value: filterVerification, setter: setFilterVerification, options: VERIFICATION_STATUSES }
              ].map((filter, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                  <filter.icon size={14} className="text-slate-400" />
                  <select 
                    value={filter.value} 
                    onChange={e => filter.setter(e.target.value)}
                    className="bg-transparent text-[11px] font-black text-slate-600 outline-none uppercase tracking-tight"
                  >
                    {filter.options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-5">
            {!scanResult && !isScanning && (
              <div className="bento-card p-20 bg-white border-dashed border-slate-300 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                  <Search className="text-slate-200" size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Sẵn sàng truy quét</h3>
                  <p className="text-slate-400 text-sm max-w-sm font-medium">Hệ thống đang chờ lệnh. Vui lòng xác định tọa độ mục tiêu và kích hoạt chế độ giám sát.</p>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="bento-card p-20 bg-white border-indigo-100 flex flex-col items-center justify-center text-center space-y-8">
                <div className="relative">
                  <div className="w-28 h-28 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-xl" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-indigo-600/10 rounded-full flex items-center justify-center">
                    <Database className="text-indigo-600 animate-pulse" size={32} />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Đang truy quét dữ liệu đa nền tảng...</h3>
                  <p className="text-slate-500 text-sm font-medium italic">Gemini PRO đang phân tích hàng nghìn tín hiệu từ MXH và Internet liên quan đến {detectedArea?.ward || 'địa bàn mục tiêu'}...</p>
                  <div className="flex items-center justify-center gap-6 pt-6">
                    {[
                      { label: 'Web Search', color: 'bg-indigo-600' },
                      { label: 'Social Analysis', color: 'bg-emerald-500' },
                      { label: 'Risk Scoring', color: 'bg-orange-500' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", step.color)} />
                        {step.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {scanResult && (
              <AnimatePresence mode="wait">
                {activeTab === 'alerts' && (
                  <motion.div 
                    key="alerts"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {filteredAlerts.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                        Không tìm thấy cảnh báo nào phù hợp với bộ lọc.
                      </div>
                    ) : (
                      filteredAlerts.map((alert) => (
                        <div key={alert.event_id} className="bento-card bg-white p-5 space-y-4 hover:border-indigo-300 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all" />
                          
                          <div className="relative z-10 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                    getSeverityColor(alert.severity)
                                  )}>
                                    {alert.severity}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    {TOPICS.find(t => t.id === alert.topic)?.label || alert.topic}
                                  </span>
                                </div>
                                <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight tracking-tighter italic">
                                  {alert.title}
                                </h4>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <Clock size={12} className="text-indigo-400" />
                                  {new Date(alert.published_at).toLocaleDateString('vi-VN')}
                                </div>
                                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  Score: {alert.priority_score.toFixed(0)}
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                              {alert.summary}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-50">
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                <CheckCircle2 size={12} className={alert.verification_status === 'verified' ? "text-emerald-500" : "text-slate-300"} />
                                {alert.verification_status === 'verified' ? 'Đã kiểm chứng' : 'Đang kiểm chứng'}
                              </div>
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold",
                                getPlatformInfo(alert.url).bg,
                                getPlatformInfo(alert.url).color
                              )}>
                                {React.createElement(getPlatformInfo(alert.url).icon, { size: 12 })}
                                {getPlatformInfo(alert.url).label}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                <Database size={12} />
                                {alert.source_name}
                              </div>
                              <a 
                                href={alert.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-auto flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                              >
                                Xem nguồn
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                          
                          {/* Recommended Action Bar */}
                          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldAlert size={14} className="text-indigo-600" />
                              <span className="text-[10px] font-bold text-slate-700">Khuyến nghị:</span>
                              <span className="text-[10px] text-slate-600">{alert.recommended_action}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === 'watchlist' && (
                  <motion.div 
                    key="watchlist"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {scanResult.watchlist.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                        Chưa có thông tin nào cần theo dõi thêm.
                      </div>
                    ) : (
                      scanResult.watchlist.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                              {new Date(item.published_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                            <span className="font-bold text-orange-700 mr-1">Lý do theo dõi:</span>
                            {item.reason}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-medium text-slate-400">{item.source_name}</span>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                              Xem chi tiết <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === 'ignored' && (
                  <motion.div 
                    key="ignored"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    {scanResult.ignored_results_reasoning.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                        Không có kết quả nào bị loại bỏ.
                      </div>
                    ) : (
                      scanResult.ignored_results_reasoning.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4 opacity-60 hover:opacity-100 transition-opacity">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-700 line-clamp-1">{item.title}</h4>
                            <p className="text-[10px] text-slate-500 italic">Lý do loại bỏ: {item.reason}</p>
                          </div>
                          <EyeOff size={14} className="text-slate-300 shrink-0" />
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
