import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { WEB_SOURCES } from '../constants';

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string;
  relevance: string;
  imageUrl?: string;
  fullContent?: string;
  sentiment?: 'Tích cực' | 'Tiêu cực' | 'Trung lập';
  publicInterest?: 'Thấp' | 'Trung bình' | 'Cao';
  isAlert?: boolean;
  alertReason?: string;
}

export const NEWS_SOURCES = [
  { id: 'tuoitre', label: 'Báo Tuổi Trẻ', url: 'https://tuoitre.vn', category: 'Toàn quốc' },
  { id: 'thanhnien', label: 'Báo Thanh Niên', url: 'https://thanhnien.vn', category: 'Toàn quốc' },
  { id: 'vnexpress', label: 'VnExpress', url: 'https://vnexpress.net', category: 'Toàn quốc' },
  { id: 'vietnamnet', label: 'VietNamNet', url: 'https://vietnamnet.vn', category: 'Toàn quốc' },
  { id: 'baochinhphu', label: 'Báo Chính phủ', url: 'https://baochinhphu.vn', category: 'Chính thống' },
  { id: 'nhandan', label: 'Báo Nhân Dân', url: 'https://nhandan.vn', category: 'Chính thống' },
  { id: 'qdnd', label: 'Báo Quân đội Nhân dân', url: 'https://qdnd.vn', category: 'Chính thống' },
  { id: 'binhduong', label: 'Báo Bình Dương', url: 'https://baobinhduong.vn', category: 'Địa phương' },
  { id: 'binhduong_portal', label: 'Cổng TTĐT Bình Dương', url: 'https://binhduong.gov.vn', category: 'Địa phương' },
  { id: 'thudaumot', label: 'Cổng TTĐT Thủ Dầu Một', url: 'https://thudaumot.binhduong.gov.vn', category: 'Địa phương' },
  { id: 'tphcm', label: 'Cổng TTĐT TP.HCM', url: 'https://hochiminhcity.gov.vn', category: 'Địa phương' },
  { id: 'hanoimoi', label: 'Báo Hà Nội Mới', url: 'https://hanoimoi.com.vn', category: 'Địa phương' }
];

export const ALL_SOURCES = [...NEWS_SOURCES];
WEB_SOURCES.forEach(ws => {
  if (!ALL_SOURCES.find(s => s.url === ws.url)) {
    ALL_SOURCES.push(ws);
  }
});

interface NewsContextType {
  results: NewsItem[];
  isScanning: boolean;
  scanError: string | null;
  lastRefresh: Date | null;
  handleScan: (query?: string, sources?: string[]) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSources: string[];
  setSelectedSources: (sources: string[] | ((prev: string[]) => string[])) => void;
  watchlist: NewsItem[];
  toggleWatchlist: (item: NewsItem) => void;
  clearWatchlist: () => void;
  isInWatchlist: (url: string) => boolean;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  locationError: string | null;
  setLocationError: (err: string | null) => void;
  requestLocation: () => void;
  newsTopics: string[];
  setNewsTopics: (topics: string[]) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const NewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [results, setResults] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('news_results');
    return saved ? JSON.parse(saved) : [];
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(() => {
    const saved = localStorage.getItem('news_last_refresh');
    return saved ? new Date(JSON.parse(saved)) : null;
  });
  const [searchQuery, setSearchQuery] = useState('tình hình an ninh trật tự, phát triển kinh tế xã hội tại địa phương');
  const [selectedSources, setSelectedSources] = useState<string[]>(ALL_SOURCES.map(s => s.id));
  const [watchlist, setWatchlist] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('news_watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [newsTopics, setNewsTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('news_topics');
    return saved ? JSON.parse(saved) : ['Chuyển đổi số', 'Cải cách hành chính', 'An ninh trật tự', 'Phát triển kinh tế', 'Thủ Dầu Một'];
  });

  // Persist news topics
  useEffect(() => {
    localStorage.setItem('news_topics', JSON.stringify(newsTopics));
  }, [newsTopics]);

  // Persist watchlist
  useEffect(() => {
    localStorage.setItem('news_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Persist results
  useEffect(() => {
    localStorage.setItem('news_results', JSON.stringify(results));
  }, [results]);

  // Persist last refresh
  useEffect(() => {
    if (lastRefresh) {
      localStorage.setItem('news_last_refresh', JSON.stringify(lastRefresh.getTime()));
    }
  }, [lastRefresh]);

  const requestLocation = useCallback(() => {
    // Disable automatic geolocation to avoid policy violations
    console.log("Tính năng định vị tự động đã bị tắt để đảm bảo tính ổn định.");
    setLocationError("Tính năng định vị tự động đã bị tắt.");
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const handleScan = useCallback(async (query?: string, sources?: string[]) => {
    if (isScanning) return;
    
    // Check if we refreshed recently (e.g., within 10 minutes)
    if (lastRefresh && (Date.now() - lastRefresh.getTime() < 10 * 60 * 1000)) {
        return;
    }
    
    const activeQuery = query || (newsTopics.length > 0 ? newsTopics.join(', ') : searchQuery);
    const activeSources = sources || selectedSources;

    if (activeSources.length === 0) return;
    
    setIsScanning(true);
    setScanError(null);
    
    try {
      const selectedUrls = ALL_SOURCES
        .filter(s => activeSources.includes(s.id))
        .map(s => s.url);

      const prompt = `Bạn là một chuyên gia phân tích tin tức thông minh và cố vấn truyền thông. Hãy quét và tổng hợp các tin tức MỚI NHẤT TRONG 7 NGÀY GẦN ĐÂY từ TẤT CẢ các nguồn báo online được cung cấp liên quan đến yêu cầu tìm kiếm: "${activeQuery}".
      
      Yêu cầu đặc biệt:
      - QUÉT TOÀN BỘ các nguồn sau để không bỏ sót thông tin: ${selectedUrls.join(', ')}.
      - CHỈ LẤY TIN TỨC TRONG 7 NGÀY GẦN ĐÂY (từ ngày ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')} đến nay).
      - Phân tích ngữ cảnh của câu hỏi (ví dụ: "tuần này", "tháng này", "chuyển đổi số", "an ninh").
      - Ưu tiên các tin tức có tính thời sự và liên quan trực tiếp đến địa phương Thủ Dầu Một, Bình Dương.
      ${userLocation ? `- Vị trí hiện tại của người dùng: Vĩ độ ${userLocation.lat}, Kinh độ ${userLocation.lng}. Hãy đặc biệt ưu tiên các tin tức xảy ra trong bán kính 20km từ tọa độ này.` : ''}
      
      PHÂN TÍCH NÂNG CAO:
      1. Đánh giá Sắc thái dư luận (Sentiment): Tích cực, Tiêu cực, hoặc Trung lập.
      2. Đánh giá Mức độ quan tâm của công chúng (PublicInterest): Thấp, Trung bình, Cao.
      3. Xác định Cảnh báo (IsAlert): Đánh dấu true nếu tin tức chứa nội dung chê trách chính quyền, cảnh báo an ninh, dịch bệnh, hoặc các vấn đề nhạy cảm cần xử lý ngay.
      4. Lý do cảnh báo (AlertReason): Nếu IsAlert là true, hãy tóm tắt ngắn gọn lý do cần chú ý.

      Hãy trả về danh sách các tin tức tiêu biểu (khoảng 8-12 tin). 
      Với mỗi tin, hãy cung cấp:
      1. Tiêu đề tin tức (Title)
      2. Tóm tắt ngắn gọn (Summary - 2-3 câu)
      3. Nguồn tin (Source)
      4. Ngày đăng (Date - định dạng DD/MM/YYYY)
      5. Đánh giá mức độ liên quan đến địa phương (Relevance: Thấp/Trung bình/Cao)
      6. URL hình ảnh minh họa (ImageUrl: picsum.photos/seed/{keyword}/800/450)
      7. Nội dung chi tiết của tin tức (FullContent: 200-300 từ)
      8. Sắc thái (Sentiment)
      9. Mức độ quan tâm (PublicInterest)
      10. Cảnh báo (IsAlert: boolean)
      11. Lý do cảnh báo (AlertReason: string)
      
      Trả về kết quả dưới dạng mảng JSON các đối tượng:
      { "title": string, "summary": string, "url": string, "source": string, "date": string, "relevance": string, "imageUrl": string, "fullContent": string, "sentiment": string, "publicInterest": string, "isAlert": boolean, "alertReason": string }`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const parsedResults = JSON.parse(text);
      setResults(parsedResults);
      setLastRefresh(new Date());
      setScanError(null);
    } catch (error: any) {
      console.error(`News scan failed:`, error);
      setScanError(error.message || "Đã xảy ra lỗi khi quét tin tức.");
    }
    
    setIsScanning(false);
  }, [searchQuery, selectedSources, userLocation, isScanning, newsTopics]);

  // Auto-scan every 30 minutes (increased from 15 to reduce quota usage)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Background auto-scanning news (30 min interval)...");
      handleScan();
    }, 1800000); // 30 minutes

    return () => clearInterval(interval);
  }, [handleScan]);

  // Initial scan if results are empty
  useEffect(() => {
    if (results.length === 0 && !isScanning) {
      handleScan();
    }
  }, [results.length, isScanning, handleScan]);

  const toggleWatchlist = useCallback((item: NewsItem) => {
    setWatchlist(prev => {
      const exists = prev.find(i => i.url === item.url);
      if (exists) {
        return prev.filter(i => i.url !== item.url);
      }
      return [item, ...prev];
    });
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  const isInWatchlist = useCallback((url: string) => watchlist.some(i => i.url === url), [watchlist]);

  return (
    <NewsContext.Provider value={{
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
      setLocationError,
      requestLocation,
      newsTopics,
      setNewsTopics
    }}>
      {children}
    </NewsContext.Provider>
  );
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
};
