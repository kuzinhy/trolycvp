import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { WEB_SOURCES } from '../constants';
import { useUserPreferences } from './UserPreferencesContext';
import axios from 'axios';

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
  const { preferences } = useUserPreferences();
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
    return saved ? JSON.parse(saved) : ['Chuyển đổi số', 'Cải cách hành chính', 'An ninh trật tự', 'Phát triển kinh tế', 'Phường Thủ Dầu Một, TP.HCM'];
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
      let combinedResults: NewsItem[] = [];

      const apiPromises = [];

      // Try NewsAPI if key exists
      if (preferences.apiKeys?.newsApi) {
        apiPromises.push(
          axios.post('/api/news/newsapi', { query: activeQuery, apiKey: preferences.apiKeys.newsApi })
            .then(res => {
              const articles = res.data.articles || [];
              return articles.slice(0, 5).map((a: any) => ({
                title: a.title,
                summary: a.description || a.content || 'Không có tóm tắt.',
                url: a.url,
                source: a.source?.name || 'NewsAPI',
                date: new Date(a.publishedAt).toLocaleDateString('vi-VN'),
                relevance: 'Trung bình',
                imageUrl: a.urlToImage,
                sentiment: 'Trung lập',
                publicInterest: 'Trung bình',
                isAlert: false
              } as NewsItem));
            }).catch(e => {
              console.warn("NewsAPI error", e);
              return [];
            })
        );
      }

      // Try SerpAPI if key exists
      if (preferences.apiKeys?.serpApi) {
        apiPromises.push(
          axios.post('/api/news/serpapi', { query: activeQuery, apiKey: preferences.apiKeys.serpApi })
            .then(res => {
              const articles = res.data.news_results || [];
              return articles.slice(0, 5).map((a: any) => ({
                title: a.title,
                summary: a.snippet || a.title,
                url: a.link,
                source: a.source || 'Google News',
                date: a.date || new Date().toLocaleDateString('vi-VN'),
                relevance: 'Cao',
                imageUrl: a.thumbnail,
                sentiment: 'Trung lập',
                publicInterest: 'Cao',
                isAlert: false
              } as NewsItem));
            }).catch(e => {
              console.warn("SerpAPI error", e);
              return [];
            })
        );
      }

      // We still use Gemini as fallback/primary if keys aren't provided, or just combined
      const selectedUrls = ALL_SOURCES
        .filter(s => activeSources.includes(s.id))
        .map(s => s.url);

      const prompt = `Bạn là một chuyên gia phân tích tin tức thông minh và cố vấn truyền thông cấp cao.
      NHIỆM VỤ: Sử dụng GOOGLE SEARCH để tổng hợp tin tức THỰC TẾ, CÓ THẬT liên quan đến: "${activeQuery}".
      NGUYÊN TẮC: 
      - TUYỆT ĐỐI KHÔNG BỊA CHUYỆN. Mọi tin tức phải có URL thật từ kết quả tìm kiếm Google.
      - TRÍCH XUẤT CHÍNH XÁC URL (đường link) từ kết quả tìm kiếm. Nếu không có URL thật, hãy BỎ QUA bài báo đó.
      
      Yêu cầu đặc biệt:
      - Tối ưu quét các nguồn báo chí (nếu có): ${selectedUrls.join(', ')}.
      - CHỈ LẤY TIN TỨC TRONG 7 NGÀY GẦN ĐÂY.
      - Ưu tiên tin bài về Thành phố Hồ Chí Minh và Phường Thủ Dầu Một.
      ${userLocation ? `- Vị trí hiện tại của người dùng: Vĩ độ ${userLocation.lat}, Kinh độ ${userLocation.lng}. Hãy ưu tiên các tin tức xảy ra gần đây.` : ''}
      
      PHÂN TÍCH NÂNG CAO:
      1. Đánh giá Sắc thái dư luận (Sentiment): Tích cực, Tiêu cực, hoặc Trung lập.
      2. Đánh giá Mức độ quan tâm của công chúng (PublicInterest): Thấp, Trung bình, Cao.
      3. Xác định Cảnh báo (IsAlert): Đánh dấu true nếu tin tức chứa nội dung chê trách chính quyền, cảnh báo an ninh, dịch bệnh, hoặc các vấn đề nhạy cảm cần xử lý ngay.
      4. Lý do cảnh báo (AlertReason): Nếu IsAlert là true, hãy tóm tắt lý do.

      Hãy trả về danh sách các tin tức tiêu biểu (khoảng 3-5 tin). 
      Với mỗi tin, hãy cung cấp MẢNG JSON các đối tượng gồm:
      - title: (string) Tiêu đề tin tức
      - summary: (string) Tóm tắt
      - source: (string) Nguồn tin
      - url: (string) URL BẮT BUỘC PHẢI CHÍNH XÁC VÀ TRUY CẬP ĐƯỢC từ kết quả Google Search
      - date: (string) Ngày đăng
      - relevance: (string) Thấp/Trung bình/Cao
      - imageUrl: (string) Để trống hoặc lấy url thật
      - fullContent: (string) Nội dung chi tiết
      - sentiment: (string) Tích cực/Tiêu cực/Trung lập
      - publicInterest: (string) Thấp/Trung bình/Cao
      - isAlert: (boolean)
      - alertReason: (string)
      `;

      const aiPromise = generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      }).then(response => {
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as NewsItem[];
      }).catch(e => {
        console.warn("Gemini Error", e);
        return [];
      });

      apiPromises.push(aiPromise);

      const allResults = await Promise.all(apiPromises);
      combinedResults = allResults.flat();

      if (combinedResults.length === 0) {
         throw new Error("Không lấy được kết quả tin tức nào từ các nguồn.");
      }

      // Deduplicate by URL
      const uniqueUrls = new Set();
      const finalResults: NewsItem[] = [];
      for (const item of combinedResults) {
        if (!uniqueUrls.has(item.url) && item.title) {
          uniqueUrls.add(item.url);
          finalResults.push(item);
        }
      }

      setResults(finalResults);
      setLastRefresh(new Date());
      setScanError(null);
    } catch (error: any) {
      console.error(`News scan failed:`, error);
      setScanError(error.message || "Đã xảy ra lỗi khi quét tin tức.");
    }
    
    setIsScanning(false);
  }, [searchQuery, selectedSources, userLocation, isScanning, newsTopics, preferences.apiKeys]);

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
