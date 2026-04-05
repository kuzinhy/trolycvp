import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Globe, Newspaper, Check, Loader2, ExternalLink, RefreshCw, 
  ArrowUpDown, Calendar, X, Maximize2, Clock, Share2, Bookmark, 
  Printer, ChevronRight, MessageSquare, Filter, ChevronDown, Tag, 
  AlertTriangle, TrendingUp, ThumbsDown, Info, Download, List, 
  MapPin, Navigation, AlertCircle, Trash2, Sparkles 
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import { useNews, ALL_SOURCES, NEWS_SOURCES, NewsItem } from '../context/NewsContext';
import { WEB_SOURCES } from '../constants';

const LazyImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-300" size={24} />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-400">
          <Newspaper size={32} />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};

export const NewsScannerModule: React.FC = () => {
  const { 
    results, 
    isScanning, 
    scanError,
    lastRefresh, 
    handleScan, 
    searchQuery, 
    setSearchQuery, 
    selectedSources, 
    setSelectedSources,
    watchlist,
    toggleWatchlist,
    clearWatchlist,
    isInWatchlist,
    userLocation,
    setUserLocation,
    locationError,
    requestLocation
  } = useNews();

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'watchlist'>('all');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingNewsId, setAnalyzingNewsId] = useState<string | null>(null);

  const handleAiAnalysis = async (item: NewsItem) => {
    setIsAnalyzing(true);
    setAnalyzingNewsId(item.url);
    setAiAnalysisResult(null);
    
    try {
      const prompt = `Bạn là chuyên gia phân tích dư luận và tham mưu chiến lược. Hãy phân tích bài báo sau:
      Tiêu đề: ${item.title}
      Tóm tắt: ${item.summary}
      Nguồn: ${item.source}
      
      Hãy cung cấp phân tích theo cấu trúc:
      1. Tóm tắt cốt lõi (2-3 câu)
      2. Đánh giá tác động đến địa phương/đơn vị (Tích cực/Tiêu cực/Thách thức)
      3. Nhận diện các rủi ro tiềm ẩn (nếu có)
      4. Đề xuất nội dung tham mưu cho lãnh đạo (Hành động cụ thể)
      5. Dự báo diễn biến tiếp theo của dư luận.
      
      Yêu cầu: Ngôn ngữ chuyên nghiệp, sắc bén, mang tính tham mưu cao.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setAiAnalysisResult(response.text || 'Không thể phân tích bài báo này.');
    } catch (error: any) {
      console.error('AI Analysis Error:', error);
      setAiAnalysisResult('Lỗi khi phân tích: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Geolocation UI State
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });

  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setUserLocation({ lat, lng });
      setIsManualLocation(false);
    }
  };
  
  // Advanced Filters
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('week');
  const [filterRelevance, setFilterRelevance] = useState<'all' | 'Cao' | 'Trung bình' | 'Thấp'>('all');
  const [filterSourceType, setFilterSourceType] = useState<'all' | 'Địa phương' | 'Toàn quốc' | 'Chính thống'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const toggleSource = (id: string) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredResults = results.filter(item => {
    // Filter by Relevance
    if (filterRelevance !== 'all' && item.relevance !== filterRelevance) return false;
    
    // Filter by Source Type
    if (filterSourceType !== 'all') {
      const sourceInfo = ALL_SOURCES.find(s => s.label === item.source || s.id === item.source);
      if (sourceInfo && sourceInfo.category !== filterSourceType) return false;
    }

    // Filter by Date Range
    if (filterDateRange !== 'all') {
      const parts = item.date.split('/');
      if (parts.length === 3) {
        const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (filterDateRange === 'today' && diffDays > 1) return false;
        if (filterDateRange === 'week' && diffDays > 7) return false;
        if (filterDateRange === 'month' && diffDays > 30) return false;
      }
    }

    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    const partsA = a.date.split('/');
    const partsB = b.date.split('/');
    const dateA = partsA.length === 3 ? new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0])).getTime() : 0;
    const dateB = partsB.length === 3 ? new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0])).getTime() : 0;
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const displayResults = viewMode === 'all' ? sortedResults : watchlist;

  const toggleWatchlistHandler = (e: React.MouseEvent, item: NewsItem) => {
    e.stopPropagation();
    toggleWatchlist(item);
  };

  const handleShare = async (e: React.MouseEvent, item: NewsItem) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary,
          url: item.url,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${item.title}\n${item.url}`);
        // We don't have a toast here, but we can assume the user will see the feedback if we added one.
        // For now, just a console log or simple alert if needed, but the prompt didn't ask for Toast.
        // Actually, the component uses showToast if available in some places, but it's not in props here.
        // Wait, I should check if showToast is available.
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const exportToCSV = () => {
    const dataToExport = displayResults;
    if (dataToExport.length === 0) return;

    const headers = ['Tiêu đề', 'Nguồn', 'Ngày', 'Mức độ liên quan', 'Sắc thái', 'Mức độ quan tâm', 'URL'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(item => [
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.source}"`,
        `"${item.date}"`,
        `"${item.relevance}"`,
        `"${item.sentiment || ''}"`,
        `"${item.publicInterest || ''}"`,
        `"${item.url}"`
      ].join(','))
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tin_tuc_${viewMode === 'all' ? 'tong_hop' : 'theo_doi'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="bento-card p-8 space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-all duration-700" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <RefreshCw className={cn("text-emerald-600", isScanning && "animate-spin")} size={24} />
              </div>
              Quét tin tức liên quan v5.0
            </h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={12} className="text-emerald-500" />
              Tự động cập nhật 15 phút/lần
              {lastRefresh && (
                <span className="text-emerald-600">
                  • Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </p>
          </div>
          <button 
            onClick={() => handleScan()}
            disabled={isScanning || selectedSources.length === 0}
            className="btn-pro btn-pro-primary px-8 py-4 text-sm flex items-center gap-3 group/btn"
          >
            {isScanning ? <Loader2 className="animate-spin" size={20}/> : <Search className="group-hover/btn:scale-110 transition-transform" size={20}/>}
            <span>{isScanning ? 'Đang rà quét...' : 'Quét tin tức ngay'}</span>
          </button>
        </div>

        {scanError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3"
          >
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-900">Lỗi rà quét tin tức</p>
              <p className="text-xs text-rose-700 leading-relaxed">{scanError}</p>
            </div>
            <button 
              onClick={() => handleScan()}
              className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold hover:bg-rose-200 transition-all"
            >
              Thử lại
            </button>
          </motion.div>
        )}

        {/* Alert Panel for Critical News */}
        {results.some(r => r.isAlert) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle size={20} className="animate-pulse" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Cảnh báo dư luận & Nội dung nhạy cảm</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.filter(r => r.isAlert).map((alert, idx) => (
                <div key={idx} className="bg-white/60 p-3 rounded-xl border border-rose-100 flex gap-3">
                  <div className="w-1.5 h-auto bg-rose-500 rounded-full shrink-0" />
                  <div className="space-y-1 w-full">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1" title={alert.title}>{alert.title}</p>
                    <p className="text-[10px] text-rose-600 font-medium leading-tight mb-1">{alert.alertReason}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2 pt-2 border-t border-rose-100/50">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {alert.date}</span>
                      <span className="flex items-center gap-1 font-bold text-slate-700"><Globe size={10} /> {alert.source}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="relative group/search">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-emerald-500 transition-colors" size={22} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập từ khóa tìm kiếm chiến lược..."
                className="w-full pl-14 pr-6 py-4.5 bg-slate-50/50 border border-slate-200 rounded-[1.5rem] focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-sm font-bold placeholder:text-slate-400 placeholder:font-medium outline-none"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                  <Globe size={14} className="text-emerald-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn tin hệ thống ({selectedSources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {NEWS_SOURCES.map(source => (
                  <button
                    key={source.id}
                    onClick={() => toggleSource(source.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[11px] font-black transition-all border uppercase tracking-wider",
                      selectedSources.includes(source.id)
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {source.label}
                  </button>
                ))}
                <button 
                  onClick={() => setSelectedSources(ALL_SOURCES.map(s => s.id))}
                  className="px-4 py-2 rounded-xl text-[11px] font-black text-emerald-600 hover:bg-emerald-50 transition-all uppercase tracking-wider"
                >
                  Chọn tất cả
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest">
                  <MapPin size={16} className="text-emerald-600" />
                  Vùng rà quét
                </div>
                <button 
                  onClick={() => requestLocation()}
                  className="p-2 hover:bg-emerald-50 rounded-xl transition-all text-slate-400 hover:text-emerald-600"
                  title="Cập nhật vị trí"
                >
                  <Navigation size={16} />
                </button>
              </div>

              {userLocation ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                    <Check size={24} className="stroke-[3px]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">Đã định vị</p>
                    <p className="text-xs text-emerald-700 font-mono font-bold mt-0.5">
                      {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                    <Loader2 className="animate-spin" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Đang định vị</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Ưu tiên tin tức địa phương</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50">
            <button 
              onClick={() => setViewMode('all')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-wider",
                viewMode === 'all' ? "bg-white text-emerald-600 shadow-xl" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List size={14} />
              Tổng hợp ({results.length})
            </button>
            <button 
              onClick={() => setViewMode('watchlist')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-wider",
                viewMode === 'watchlist' ? "bg-white text-emerald-600 shadow-xl" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Bookmark size={14} />
              Theo dõi ({watchlist.length})
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === 'watchlist' && watchlist.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách theo dõi?')) {
                    clearWatchlist();
                  }
                }}
                className="btn-pro btn-pro-secondary px-4 py-2.5 text-rose-500 border-rose-100 hover:bg-rose-50 hover:border-rose-200"
              >
                <Trash2 size={14} className="mr-2" />
                Xóa tất cả
              </button>
            )}
            {displayResults.length > 0 && (
              <button 
                onClick={exportToCSV}
                className="btn-pro btn-pro-secondary px-4 py-2.5"
              >
                <Download size={14} className="mr-2" />
                Xuất báo cáo
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "btn-pro px-6 py-2.5 gap-3",
              showFilters ? "bg-emerald-600 text-white shadow-emerald-600/40" : "btn-pro-secondary"
            )}
          >
            <Filter size={16} />
            Bộ lọc nâng cao
            <ChevronDown size={14} className={cn("transition-transform duration-500", showFilters && "rotate-180")} />
          </button>

          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-2.5 shadow-sm">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-transparent text-[11px] font-black text-slate-700 uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'today', 'week', 'month'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setFilterDateRange(range)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      filterDateRange === range 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    {range === 'all' ? 'Tất cả' : range === 'today' ? 'Hôm nay' : range === 'week' ? 'Tuần này' : 'Tháng này'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mức độ liên quan</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'Cao', 'Trung bình', 'Thấp'] as const).map(rel => (
                  <button
                    key={rel}
                    onClick={() => setFilterRelevance(rel)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      filterRelevance === rel 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    {rel === 'all' ? 'Tất cả' : rel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loại nguồn tin</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'Địa phương', 'Toàn quốc', 'Chính thống'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterSourceType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                      filterSourceType === type 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    {type === 'all' ? 'Tất cả' : type}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayResults.length > 0 ? (
          displayResults.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedNews(item)}
              className="bento-card group border-l-8 border-l-emerald-500 flex flex-col h-full relative hover:scale-[1.02] active:scale-95"
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button 
                  onClick={(e) => handleShare(e, item)}
                  className="p-2.5 rounded-2xl backdrop-blur-md bg-white/90 text-slate-400 hover:text-emerald-500 transition-all shadow-xl border border-white/20"
                  title="Chia sẻ"
                >
                  <Share2 size={18} />
                </button>
                <button 
                  onClick={(e) => toggleWatchlistHandler(e, item)}
                  className={cn(
                    "p-2.5 rounded-2xl backdrop-blur-md transition-all shadow-xl border border-white/20",
                    isInWatchlist(item.url) 
                      ? "bg-emerald-500 text-white" 
                      : "bg-white/90 text-slate-400 hover:text-emerald-500"
                  )}
                  title={isInWatchlist(item.url) ? "Bỏ theo dõi" : "Theo dõi"}
                >
                  <Bookmark size={18} fill={isInWatchlist(item.url) ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="h-56 w-full relative overflow-hidden">
                <LazyImage 
                  src={item.imageUrl || `https://picsum.photos/seed/${item.title.length}/800/450`} 
                  alt={item.title}
                  className="h-full w-full group-hover:scale-110 duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                    {item.source}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} className="text-emerald-500" />
                    {item.date}
                  </div>
                </div>

                <h4 className="text-lg font-black text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight tracking-tight">
                  {item.title}
                </h4>
                
                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed flex-1 font-medium italic">
                  {item.summary}
                </p>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                      item.relevance === 'Cao' ? "bg-rose-50 text-rose-600 border border-rose-100" : 
                      item.relevance === 'Trung bình' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-slate-50 text-slate-600 border border-slate-100"
                    )}>
                      <TrendingUp size={10} />
                      {item.relevance}
                    </div>
                    {item.sentiment && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                        item.sentiment === 'Tích cực' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                        item.sentiment === 'Tiêu cực' ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 text-slate-600 border border-slate-100"
                      )}>
                        {item.sentiment}
                      </div>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              {item.isAlert && (
                <div className="absolute top-4 left-4 bg-rose-500 text-white p-2 rounded-xl shadow-2xl animate-pulse">
                  <AlertTriangle size={18} />
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
              <Newspaper size={48} className="text-slate-300" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-bold text-slate-700 text-lg">Chưa có tin tức nào để hiển thị</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Hệ thống đang rà quét hoặc không tìm thấy tin tức phù hợp với bộ lọc hiện tại. 
                Hãy thử thay đổi từ khóa, nguồn tin hoặc đợi vài phút để hệ thống cập nhật.
              </p>
            </div>
            <button 
              onClick={() => handleScan()}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 text-sm"
            >
              <RefreshCw size={16} />
              Quét tin tức ngay
            </button>
          </div>
        )}
      </div>

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-white/80 hover:bg-white rounded-full text-slate-600 transition-all shadow-sm"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="p-2 bg-white/80 hover:bg-white rounded-full text-slate-600 transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row h-full overflow-hidden">
                <div className="w-full md:w-1/2 h-64 md:h-auto shrink-0 relative">
                  <LazyImage 
                    src={selectedNews.imageUrl || `https://picsum.photos/seed/${selectedNews.title.length}/800/450`} 
                    alt={selectedNews.title}
                    className="h-full w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent md:hidden" />
                  <div className="absolute bottom-6 left-6 right-6 md:hidden">
                    <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full mb-2 inline-block">
                      {selectedNews.source}
                    </span>
                    <h3 className="text-xl font-bold text-white leading-tight">{selectedNews.title}</h3>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => toggleWatchlistHandler(e, selectedNews)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          isInWatchlist(selectedNews.url) 
                            ? "bg-emerald-50 text-emerald-600" 
                            : "bg-slate-50 text-slate-400 hover:text-emerald-600"
                        )}
                      >
                        <Bookmark size={18} fill={isInWatchlist(selectedNews.url) ? "currentColor" : "none"} />
                      </button>
                      <button 
                        onClick={(e) => handleShare(e, selectedNews)}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all"
                        title="Chia sẻ"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <Calendar size={14} />
                        {selectedNews.date}
                      </div>
                      <a 
                        href={selectedNews.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        Đọc bài gốc
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                          {selectedNews.source}
                        </span>
                        <span className={cn(
                          "px-3 py-1 text-[10px] font-bold rounded-full",
                          selectedNews.relevance === 'Cao' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                        )}>
                          Liên quan: {selectedNews.relevance}
                        </span>
                        {selectedNews.sentiment && (
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-full",
                            selectedNews.sentiment === 'Tích cực' ? "bg-emerald-50 text-emerald-600" : 
                            selectedNews.sentiment === 'Tiêu cực' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
                          )}>
                            Sắc thái: {selectedNews.sentiment}
                          </span>
                        )}
                        {selectedNews.publicInterest && (
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                            Quan tâm: {selectedNews.publicInterest}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight flex-1">
                          {selectedNews.title}
                        </h2>
                        <button 
                          onClick={() => handleAiAnalysis(selectedNews)}
                          disabled={isAnalyzing}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-xs font-bold hover:shadow-xl hover:shadow-emerald-600/20 transition-all disabled:opacity-50 shrink-0"
                        >
                          {isAnalyzing && analyzingNewsId === selectedNews.url ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          Phân tích AI Chuyên sâu
                        </button>
                      </div>
                    </div>

                    {aiAnalysisResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <Sparkles size={18} />
                            <h4 className="text-sm font-bold uppercase tracking-wider">Kết quả Phân tích AI</h4>
                          </div>
                          <button 
                            onClick={() => setAiAnalysisResult(null)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                          >
                            Đóng phân tích
                          </button>
                        </div>
                        <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none prose-emerald">
                          {aiAnalysisResult}
                        </div>
                      </motion.div>
                    )}

                    {selectedNews.isAlert && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4">
                        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-rose-900">Cảnh báo nội dung nhạy cảm</p>
                          <p className="text-xs text-rose-700 leading-relaxed font-medium">{selectedNews.alertReason}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                        "{selectedNews.summary}"
                      </div>

                      <div className="prose prose-slate max-w-none">
                        <p className="text-slate-700 leading-loose text-sm whitespace-pre-line">
                          {selectedNews.fullContent || "Nội dung chi tiết đang được cập nhật..."}
                        </p>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                          <TrendingUp size={14} className="text-emerald-600" />
                          Phân tích xu hướng
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Tin tức này có mức độ lan tỏa {selectedNews.publicInterest === 'Cao' ? 'rất mạnh' : 'vừa phải'} trên các nền tảng mạng xã hội.
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                          <Info size={14} className="text-emerald-600" />
                          Đề xuất xử lý
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {selectedNews.isAlert 
                            ? "Cần theo dõi sát sao phản ứng của dư luận và chuẩn bị phương án phản hồi." 
                            : "Tiếp tục cập nhật các diễn biến liên quan để đưa vào báo cáo tổng hợp."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {aiAnalysisResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl relative"
                        >
                          <button 
                            onClick={() => setAiAnalysisResult(null)}
                            className="absolute top-3 right-3 p-1 text-indigo-400 hover:text-indigo-600"
                          >
                            <X size={14} />
                          </button>
                          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-3">
                            <Sparkles size={14} className="text-indigo-600" />
                            Kết quả phân tích AI
                          </div>
                          <div className="text-xs text-indigo-800 leading-relaxed whitespace-pre-line">
                            {aiAnalysisResult}
                          </div>
                        </motion.div>
                      )}

                      <button 
                        onClick={async () => {
                          if (isAnalyzing) return;
                          setIsAnalyzing(true);
                          const prompt = `Phân tích sâu về tin tức này: "${selectedNews.title}". 
                          Nội dung: ${selectedNews.summary}. 
                          Hãy đưa ra 3 điểm quan trọng nhất cần lưu ý cho cán bộ quản lý.`;
                          
                          try {
                            const response = await generateContentWithRetry({
                              model: 'gemini-3-flash-preview',
                              contents: [{ parts: [{ text: prompt }] }]
                            });
                            setAiAnalysisResult(response.text || "Không có kết quả phân tích.");
                          } catch (error: any) {
                            console.error("Gemini API error:", error);
                            setAiAnalysisResult(error.message || "Có lỗi xảy ra khi phân tích với AI: Lỗi không xác định");
                          } finally {
                            setIsAnalyzing(false);
                          }
                        }}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        {isAnalyzing ? 'Đang phân tích...' : 'Phân tích chuyên sâu với AI'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
