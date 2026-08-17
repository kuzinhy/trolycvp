import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ToastType } from '../components/ui/Toast';

export interface AnalysisScore {
  score: number;
  comment: string;
  status: 'Tốt' | 'Cần lưu ý' | 'Cần chỉnh sửa';
}

export interface AnalysisIssue {
  title: string;
  severity: 'Nghiêm trọng' | 'Quan trọng' | 'Trung bình' | 'Nhẹ';
  location: string;
  originalContent: string;
  explanation: string;
  suggestion: string;
}

export interface LanguageCorrection {
  original: string;
  issue: string;
  suggested: string;
  reason: string;
}

export interface PosterLayoutSuggestion {
  mainTitle?: string;
  subtitle?: string;
  organizer?: string;
  time?: string;
  location?: string;
  contentToRemove?: string[];
  contentToShorten?: string[];
  typographySuggestion?: string;
  colorSuggestion?: string;
  layoutSuggestion?: string;
}

export interface MediaAnalysisResult {
  documentType: string;
  detectedLanguage: string;
  extractedText: string;
  overallScore: number;
  classification: string;
  usageStatus: string;
  summary: string;
  scores: {
    content: AnalysisScore;
    spellingAndLanguage: AnalysisScore;
    layout: AnalysisScore;
    aesthetics: AnalysisScore;
    readability: AnalysisScore;
    appropriateness: AnalysisScore;
  };
  strengths: string[];
  issues: AnalysisIssue[];
  languageCorrections: LanguageCorrection[];
  urgentActions: string[];
  recommendedImprovements: string[];
  advancedSuggestions: string[];
  revisedContent: string;
  posterLayoutSuggestion?: PosterLayoutSuggestion;
}

export interface AnalysisHistoryItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  unitId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  purpose: string;
  requirements: string;
  overallScore: number;
  classification: string;
  usageStatus: string;
  analysis: MediaAnalysisResult;
  createdAt: any;
}

export function useMediaAnalysis(showToast: (msg: string, type?: ToastType) => void) {
  const { user, isAdmin, unitId } = useAuth();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Fetch history
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    setIsLoadingHistory(true);
    const currentUnitId = unitId || 'default_unit';

    // Query based on role: admins can see all within unit, normal users see their own
    let q = query(
      collection(db, 'media_analyses'),
      where('userId', '==', user.uid)
    );

    if (isAdmin) {
      q = query(
        collection(db, 'media_analyses'),
        where('unitId', '==', currentUnitId)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AnalysisHistoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          ...data,
        } as AnalysisHistoryItem);
      });

      // Sort by creation time desc
      items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return timeB - timeA;
      });

      setHistory(items);
      setIsLoadingHistory(false);
    }, (error) => {
      console.error("Error subscribing to media analyses:", error);
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin, unitId]);

  // Analyze API Call
  const runAnalysis = async (
    file: File | null,
    directText: string,
    purpose: string,
    requirements: string
  ): Promise<MediaAnalysisResult | null> => {
    if (!user) {
      showToast("Đồng chí vui lòng đăng nhập để sử dụng chức năng này.", "error");
      return null;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setProgressStatus("Đang khởi động tiến trình phân tích...");

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
        setAnalysisProgress(25);
        setProgressStatus("Đang tải tệp tin lên máy chủ...");
      } else {
        formData.append("text", directText);
        setAnalysisProgress(20);
        setProgressStatus("Đang xử lý nội dung văn bản đầu vào...");
      }

      formData.append("purpose", purpose);
      formData.append("requirements", requirements);

      // Check for custom configuration from localStorage
      const cachedConfig = localStorage.getItem('ai_preference_config');
      if (cachedConfig) {
        formData.append("configStr", cachedConfig);
        const parsed = JSON.parse(cachedConfig);
        if (parsed.aiProvider) {
          formData.append("provider", parsed.aiProvider);
        }
      }

      setAnalysisProgress(50);
      setProgressStatus("Máy chủ AI đang tiến hành đọc tài liệu và phân tích hình ảnh...");

      const response = await fetch("/api/media-analysis", {
        method: "POST",
        body: formData,
      });

      setAnalysisProgress(80);
      setProgressStatus("Đang xử lý kết quả đánh giá thông minh...");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Giao dịch với AI thất bại");
      }

      const responseData = await response.json();
      if (!responseData.success || !responseData.analysis) {
        throw new Error("Dữ liệu phân tích trả về không đúng định dạng.");
      }

      const result: MediaAnalysisResult = responseData.analysis;

      setAnalysisProgress(90);
      setProgressStatus("Đang lưu lịch sử phân tích vào cơ sở dữ liệu...");

      // Save to Firestore
      const historyPayload = {
        userId: user.uid,
        userName: user.displayName || "Cán bộ văn phòng",
        userEmail: user.email || "",
        unitId: unitId || "default_unit",
        fileName: file ? file.name : "Văn bản trực tiếp",
        fileSize: file ? file.size : directText.length,
        fileType: file ? file.type : "text/plain",
        purpose: purpose,
        requirements: requirements,
        overallScore: result.overallScore,
        classification: result.classification,
        usageStatus: result.usageStatus,
        analysis: result,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "media_analyses"), historyPayload);

      setAnalysisProgress(100);
      setProgressStatus("Phân tích hoàn tất!");
      showToast("Đã hoàn thành phân tích nội dung thành công!", "success");

      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setProgressStatus("");
      }, 800);

      return result;

    } catch (err: any) {
      console.error("Analysis Error:", err);
      showToast(err.message || "Không thể hoàn thành phân tích tài liệu.", "error");
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setProgressStatus("");
      return null;
    }
  };

  // Delete Analysis item
  const deleteAnalysis = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "media_analyses", id));
      showToast("Đã xoá lịch sử phân tích thành công.", "success");
    } catch (err) {
      console.error("Delete Error:", err);
      showToast("Không thể xoá lịch sử phân tích.", "error");
    }
  }, [showToast]);

  return {
    history,
    isLoadingHistory,
    isAnalyzing,
    analysisProgress,
    progressStatus,
    runAnalysis,
    deleteAnalysis,
  };
}
