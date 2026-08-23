import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RefreshCw, 
  Search, 
  BookOpen, 
  Quote, 
  Plus, 
  X, 
  Save, 
  Trash2, 
  Brain, 
  Database, 
  TrendingUp, 
  Zap, 
  Bookmark, 
  Check,
  FileSpreadsheet,
  Keyboard,
  Award,
  Copy,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Terminal,
  Laptop,
  Flame,
  Star,
  Layers,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Type } from '@google/genai';
import { generateContentWithRetry } from '../lib/ai-utils';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp, orderBy, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useKnowledge } from '../hooks/useKnowledge';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

interface GenZTerm {
  id?: string;
  term: string;
  meaning: string;
  origin: string;
  example: string;
  unitId?: string;
  authorId?: string;
  learnedBy?: string[];
  createdAt?: any;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const PRESET_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Phím tắt nào trong Microsoft Excel dùng để cố định ô (Thêm ký hiệu $) trong công thức?",
    options: ["F2", "F4", "F9", "Alt + Enter"],
    correctAnswer: 1,
    explanation: "Nhấn F4 khi đang chọn tham chiếu ô để chuyển đổi giữa tham chiếu tương đối và tuyệt đối ($A$1)."
  },
  {
    id: 2,
    question: "Hàm nào trong Excel giúp tìm kiếm dữ liệu theo hàng dọc hiện đại thay thế cho VLOOKUP?",
    options: ["INDEX MATCH", "XLOOKUP", "HLOOKUP", "LOOKUP_FAST"],
    correctAnswer: 1,
    explanation: "XLOOKUP là hàm thế hệ mới, hỗ trợ tìm kiếm trái/phải, mặc định khớp chính xác mà không cần sắp xếp cột."
  },
  {
    id: 3,
    question: "Từ GenZ 'Flex' có nghĩa là gì trong giao tiếp văn phòng và đời sống?",
    options: ["Làm việc quá sức", "Khoe khoang thành tích một cách tinh tế hoặc hài hước", "Từ chối cuộc họp", "Đi làm muộn"],
    correctAnswer: 1,
    explanation: "Flex xuất phát từ việc khoe cơ bắp, GenZ dùng để chỉ hành động thể hiện thành quả, kỹ năng hay đồ dùng."
  },
  {
    id: 4,
    question: "Phím tắt tổ hợp nào trong Windows 11 dùng để mở nhanh bảng chọn Emoji và Ký tự đặc biệt?",
    options: ["Win + Shift + S", "Win + . (Dấu chấm)", "Ctrl + Alt + E", "Alt + Tab"],
    correctAnswer: 1,
    explanation: "Nhấn Windows + Dấu chấm (.) sẽ kích hoạt cửa sổ Emoji, GIF và biểu tượng đặc biệt ngay lập tức."
  },
  {
    id: 5,
    question: "Chứng chỉ MOS (Microsoft Office Specialist) công nhận cấp độ nào cho bài thi Excel Expert?",
    options: ["Chuyên gia nâng cao", "Cơ bản", "Sơ cấp", "Thực tập sinh"],
    correctAnswer: 0,
    explanation: "MOS Excel Expert xác nhận năng lực quản trị dữ liệu phức tạp, VBA nâng cao và phân tích chuyên sâu."
  }
];

const OFFICE_SHORTCUTS = [
  { key: "Ctrl + Shift + L", desc: "Bật / Tắt bộ lọc Filter siêu tốc trong Excel", cat: "Excel" },
  { key: "Alt + = ", desc: "Tự động chèn hàm tính tổng SUM cực nhanh", cat: "Excel" },
  { key: "Ctrl + E", desc: "Flash Fill tự động tách/gộp họ tên và dữ liệu", cat: "Excel" },
  { key: "Win + Shift + S", desc: "Chụp ảnh màn hình vùng chọn chuyên nghiệp", cat: "Windows" },
  { key: "Ctrl + Shift + V", desc: "Dán văn bản thuần không dính định dạng gốc", cat: "Word" },
  { key: "Shift + F3", desc: "Chuyển đổi chữ hoa / chữ thường tức thì", cat: "Word" },
  { key: "Alt + F1", desc: "Tạo biểu đồ tự động từ bảng dữ liệu được chọn", cat: "Excel" },
  { key: "Ctrl + D", desc: "Nhân bản Slide hoặc đối tượng thiết kế trong PowerPoint", cat: "PowerPoint" }
];

export const GenZDecoder: React.FC = () => {
  const { user, unitId } = useAuth();
  const { showToast } = useToast();
  const { addGenZTermToKnowledge } = useKnowledge(showToast);
  
  // Navigation Modules
  const [hubTab, setHubTab] = useState<'slang' | 'excel_ai' | 'quiz' | 'tech_radar'>('slang');

  // Terminology State
  const [terms, setTerms] = useState<GenZTerm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [trendingTerms, setTrendingTerms] = useState<GenZTerm[]>([]);
  const [isFetchingTrending, setIsFetchingTrending] = useState(false);
  const [savingTermId, setSavingTermId] = useState<string | null>(null);
  const [savedTermIds, setSavedTermIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'learned' | 'unlearned'>('all');

  // Excel AI Generator State
  const [excelRequirement, setExcelRequirement] = useState('');
  const [excelFormulaResult, setExcelFormulaResult] = useState<{ formula: string; explanation: string; example: string } | null>(null);
  const [isGeneratingFormula, setIsGeneratingFormula] = useState(false);
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);

  // Quiz State
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});

  const [newTerm, setNewTerm] = useState<GenZTerm>({
    term: '',
    meaning: '',
    origin: '',
    example: ''
  });

  const fetchTerms = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "genz_terms"), 
        where("unitId", "==", unitId || '')
      );
      const querySnapshot = await getDocs(q);
      const loadedTerms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GenZTerm[];
      
      loadedTerms.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setTerms(loadedTerms);
      
      const trendingQ = query(
        collection(db, "genz_trending"),
        where("unitId", "==", unitId || '')
      );
      const trendingSnapshot = await getDocs(trendingQ);
      if (!trendingSnapshot.empty) {
        const trending = trendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GenZTerm[];
        trending.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setTrendingTerms(trending);
      } else {
        handleUpdateTrending();
      }
    } catch (error) {
      console.error('Error fetching Gen Z terms:', error);
      handleFirestoreError(error, OperationType.GET, 'genz_terms/genz_trending');
    } finally {
      setIsLoading(false);
    }
  }, [unitId, handleFirestoreError]);

  const handleUpdateTrending = async () => {
    if (!user) return;
    setIsFetchingTrending(true);
    try {
      const prompt = `Bạn là chuyên gia ngôn ngữ học Gen Z và Tin học công sở. Hãy liệt kê 10 thuật ngữ Gen Z SIÊU HOT, MỚI NHẤT đang viral trên TikTok, Threads, Facebook tại Việt Nam hôm nay. 
      Yêu cầu:
      - Giải nghĩa ngắn gọn, súc tích, hài hước.
      - Trả về mảng JSON: [{ term, meaning, origin, example }].`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.7-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                meaning: { type: Type.STRING },
                origin: { type: Type.STRING },
                example: { type: Type.STRING }
              },
              required: ['term', 'meaning', 'origin', 'example']
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text || '[]');
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const batch = writeBatch(db);
        for (const item of suggestions) {
          const docRef = doc(collection(db, "genz_trending"));
          batch.set(docRef, {
            ...item,
            unitId: unitId || '',
            authorId: 'system',
            createdAt: serverTimestamp()
          });
        }
        await batch.commit();
        setTrendingTerms(suggestions);
      }
    } catch (error) {
      console.error('Error updating trending terms:', error);
      handleFirestoreError(error, OperationType.WRITE, 'genz_trending');
    } finally {
      setIsFetchingTrending(false);
    }
  };

  const handleSaveTrendingTerm = async (e: React.MouseEvent, term: Partial<GenZTerm>) => {
    e.stopPropagation();
    if (!term.term || savingTermId || !user) return;

    setSavingTermId(term.term);
    try {
      const pendingRef = collection(db, 'pending_knowledge');
      await addDoc(pendingRef, {
        title: `Thuật ngữ Gen Z: ${term.term}`,
        content: `Thuật ngữ: ${term.term}\nÝ nghĩa: ${term.meaning}\nNguồn gốc: ${term.origin || 'N/A'}\nVí dụ: ${term.example || 'N/A'}`,
        source: 'Tin Học GenZ - Trending',
        status: 'pending',
        priority: 'medium',
        createdAt: serverTimestamp(),
        unitId: unitId || '',
        authorId: user.uid
      });
      setSavedTermIds(prev => new Set(prev).add(term.term!));
      showToast(`Đã lưu "${term.term}" vào Kho tri thức!`, "success");
    } catch (error) {
      console.error("Error saving trending term:", error);
      handleFirestoreError(error, OperationType.CREATE, 'pending_knowledge');
    } finally {
      setSavingTermId(null);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTerm.term || !newTerm.meaning) return;
    
    const isDuplicate = terms.some(t => t.term.toLowerCase() === newTerm.term.trim().toLowerCase());
    if (isDuplicate) {
      showToast('Thuật ngữ này đã tồn tại trong bộ nhớ!', 'warning');
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, "genz_terms"), {
        ...newTerm,
        term: newTerm.term.trim(),
        unitId: unitId || '',
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      
      setNewTerm({ term: '', meaning: '', origin: '', example: '' });
      setShowAddForm(false);
      showToast('Đã lưu thuật ngữ Gen Z mới!', 'success');
      await fetchTerms();
    } catch (error) {
      console.error('Error adding Gen Z term:', error);
      showToast('Có lỗi xảy ra khi lưu thuật ngữ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thuật ngữ này?')) return;
    try {
      await deleteDoc(doc(db, "genz_terms", id));
      showToast('Đã xóa thuật ngữ thành công', 'info');
      fetchTerms();
    } catch (error) {
      console.error('Error deleting Gen Z term:', error);
    }
  };

  const handleAISuggest = async (isBulk = false) => {
    setIsSuggesting(true);
    try {
      const context = terms.slice(0, 20).map(t => t.term).join(', ');
      
      const prompt = `Bạn là chuyên gia ngôn ngữ học Gen Z tại Việt Nam.
      Danh sách hiện tại đã có: ${context}
      
      Hãy ${isBulk ? 'liệt kê 10' : 'gợi ý 1'} thuật ngữ Gen Z thịnh hành nhất hiện nay mà CHƯA có trong danh sách trên.
      Yêu cầu: Trả về mảng JSON các đối tượng: { term, meaning, origin, example }.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.7-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                meaning: { type: Type.STRING },
                origin: { type: Type.STRING },
                example: { type: Type.STRING }
              },
              required: ['term', 'meaning', 'origin', 'example']
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text || '[]');
      
      if (isBulk && Array.isArray(suggestions)) {
        for (const item of suggestions) {
          await addDoc(collection(db, "genz_terms"), {
            ...item,
            unitId: unitId || '',
            authorId: user?.uid,
            createdAt: serverTimestamp()
          });
        }
        showToast('Đã tự động nạp 10 thuật ngữ Gen Z mới nhất!', 'success');
        fetchTerms();
      } else if (suggestions.length > 0) {
        setNewTerm(suggestions[0]);
        setShowAddForm(true);
      }
    } catch (error) {
      console.error('AI Suggestion Error:', error);
      showToast('Lỗi khi gợi ý thuật ngữ AI', 'error');
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleLearned = async (termId: string, currentLearnedBy: string[] = []) => {
    if (!user) return;
    const isLearned = currentLearnedBy.includes(user.uid);
    const newLearnedBy = isLearned 
      ? currentLearnedBy.filter(id => id !== user.uid)
      : [...currentLearnedBy, user.uid];
    
    try {
      await updateDoc(doc(db, "genz_terms", termId), {
        learnedBy: newLearnedBy
      });
      fetchTerms();
    } catch (error) {
      console.error('Error toggling learned status:', error);
    }
  };

  // Generate Excel Formula with AI
  const handleGenerateExcelFormula = async () => {
    if (!excelRequirement.trim() || isGeneratingFormula) return;
    setIsGeneratingFormula(true);
    setExcelFormulaResult(null);

    try {
      const prompt = `Bạn là Chuyên gia Tin học Văn phòng & Thi MOS Excel bậc cao (GenZ Teacher).
Người dùng yêu cầu viết công thức Excel cho nhu cầu: "${excelRequirement}"

Hãy phân tích và viết công thức tối ưu nhất (Ưu tiên XLOOKUP, SUMIFS, COUNTIFS, INDEX MATCH, VLOOKUP, FILTER,...).
Trả về dạng JSON chuẩn:
{
  "formula": "Tên công thức Excel bằng tiếng Anh viết hoa",
  "explanation": "Giải thích chi tiết các đối số và cách hoạt động bằng tiếng Việt dễ hiểu phong cách Gen Z sắc bén",
  "example": "Ví dụ cụ thể ô dữ liệu và kết quả đạt được"
}`;

      const res = await generateContentWithRetry({
        model: 'gemini-3.7-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              formula: { type: Type.STRING },
              explanation: { type: Type.STRING },
              example: { type: Type.STRING }
            },
            required: ['formula', 'explanation', 'example']
          }
        }
      });

      const parsed = JSON.parse(res.text || '{}');
      setExcelFormulaResult(parsed);
      showToast('Đã tạo công thức Excel thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi sinh công thức Excel AI', 'error');
    } finally {
      setIsGeneratingFormula(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedShortcut(text);
    showToast(`Đã sao chép ${label}: ${text}`, 'success');
    setTimeout(() => setCopiedShortcut(null), 2000);
  };

  // Quiz Handling
  const handleAnswerQuiz = (optionIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);
    setUserAnswers(prev => ({ ...prev, [currentQuizIdx]: optionIdx }));

    if (optionIdx === PRESET_QUIZ_QUESTIONS[currentQuizIdx].correctAnswer) {
      setScore(prev => prev + 20);
    }
  };

  const handleNextQuiz = () => {
    if (currentQuizIdx < PRESET_QUIZ_QUESTIONS.length - 1) {
      setCurrentQuizIdx(prev => prev + 1);
      setSelectedOption(userAnswers[currentQuizIdx + 1] ?? null);
    } else {
      setQuizFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuizIdx(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
    setUserAnswers({});
  };

  const filteredTerms = terms.filter(t => {
    const matchesSearch = t.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'learned') return t.learnedBy?.includes(user?.uid || '');
    if (activeTab === 'unlearned') return !t.learnedBy?.includes(user?.uid || '');
    if (activeTab === 'new') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return t.createdAt?.toDate ? t.createdAt.toDate() > sevenDaysAgo : true;
    }
    
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Cyber Hero Header - Inspired by tinhocgenz.io.vn */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-[2.5rem] p-6 sm:p-10 border border-indigo-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <Sparkles size={14} className="text-amber-400 animate-spin" />
              <span>Học Viện & Giải Mã Tin Học Gen Z (TinHocGenZ Hub)</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white italic">
              Năng Lượng Số & Kỹ Năng Văn Phòng <span className="bg-gradient-to-r from-amber-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">Thế Hệ Mới</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Giải mã thuật ngữ Gen Z, làm chủ công thức Excel AI thần tốc, tra cứu phím tắtMOS và tham gia đấu trường trắc nghiệm công nghệ chuẩn phong cách <strong className="text-indigo-300">Tin Học GenZ</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <span className="block text-2xl font-black text-amber-400">{terms.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thuật Ngữ Gen Z</span>
            </div>
            <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <span className="block text-2xl font-black text-emerald-400">100%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Excel AI Ready</span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <span className="block text-2xl font-black text-indigo-400">{PRESET_QUIZ_QUESTIONS.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đề MOS Mockup</span>
            </div>
          </div>
        </div>

        {/* Hub Navigation Tabs */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/10">
          <button
            onClick={() => setHubTab('slang')}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200",
              hubTab === 'slang'
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            )}
          >
            <TrendingUp size={16} className="text-amber-400" />
            <span>Giải Mã Thuật Ngữ Gen Z</span>
          </button>

          <button
            onClick={() => setHubTab('excel_ai')}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200",
              hubTab === 'excel_ai'
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            )}
          >
            <FileSpreadsheet size={16} className="text-emerald-400" />
            <span>Mẹo Excel AI & Phím Tắt</span>
          </button>

          <button
            onClick={() => setHubTab('quiz')}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200",
              hubTab === 'quiz'
                ? "bg-gradient-to-r from-rose-500 to-amber-600 text-white shadow-lg shadow-rose-500/30 scale-105"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            )}
          >
            <Award size={16} className="text-rose-400" />
            <span>Đấu Trường Trắc Nghiệm MOS</span>
          </button>

          <button
            onClick={() => setHubTab('tech_radar')}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200",
              hubTab === 'tech_radar'
                ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30 scale-105"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            )}
          >
            <Laptop size={16} className="text-sky-400" />
            <span>Radar Xu Hướng Số</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SLANG & TERMINOLOGY DECODER */}
      {hubTab === 'slang' && (
        <div className="space-y-8">
          {/* Marquee Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/10 via-slate-900/5 to-purple-900/10 p-6 rounded-[2rem] border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Flame size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Hot Trend TikTok & Threads</h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Tự động quét thuật ngữ Gen Z mới nhất</p>
                </div>
              </div>

              <button 
                onClick={handleUpdateTrending}
                disabled={isFetchingTrending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 disabled:opacity-50"
              >
                {isFetchingTrending ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-400" />}
                <span>Quét Trend Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trendingTerms.slice(0, 3).map((item, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between"
                  onClick={() => {
                    setNewTerm(item);
                    setShowAddForm(true);
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-md">Trending #{idx + 1}</span>
                      <button
                        onClick={(e) => handleSaveTrendingTerm(e, item)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Lưu vào Kho tri thức"
                      >
                        <Bookmark size={14} />
                      </button>
                    </div>
                    <h4 className="text-base font-black text-slate-900 italic">{item.term}</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.meaning}</p>
                  </div>
                  <span className="text-[10px] text-indigo-500 font-bold mt-3 block">Bấm để dùng mẫu này &rarr;</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
              {['all', 'new', 'learned', 'unlearned'].map(tabId => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-tight",
                    activeTab === tabId 
                      ? "bg-white text-indigo-600 shadow-md" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tabId === 'all' && 'Tất cả'}
                  {tabId === 'new' && 'Mới nhất'}
                  {tabId === 'learned' && 'Đã thuộc'}
                  {tabId === 'unlearned' && 'Chưa thuộc'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tra từ Gen Z..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>

              <button 
                onClick={() => handleAISuggest(true)}
                disabled={isSuggesting}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0"
              >
                {isSuggesting ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} className="text-amber-400" />}
                <span>AI Nạp 10 Từ</span>
              </button>

              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
              >
                <Plus size={16} />
                <span>Thêm Từ</span>
              </button>
            </div>
          </div>

          {/* Add Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddTerm} 
                className="p-6 bg-indigo-50/50 border border-indigo-200 rounded-3xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} /> Thêm Thuật Ngữ Gen Z Mới
                  </h4>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    required
                    value={newTerm.term}
                    onChange={e => setNewTerm({...newTerm, term: e.target.value})}
                    placeholder="Thuật ngữ (Ví dụ: Trí thông minh bị giãn dị)"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <input 
                    required
                    value={newTerm.meaning}
                    onChange={e => setNewTerm({...newTerm, meaning: e.target.value})}
                    placeholder="Ý nghĩa (Giải ngố)"
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <textarea 
                  value={newTerm.origin}
                  onChange={e => setNewTerm({...newTerm, origin: e.target.value})}
                  placeholder="Nguồn gốc / Hoàn cảnh..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 h-20"
                />

                <input 
                  value={newTerm.example}
                  onChange={e => setNewTerm({...newTerm, example: e.target.value})}
                  placeholder="Ví dụ câu thoại sử dụng..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Lưu Từ Điển</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Term Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTerms.map((item, idx) => (
              <motion.div 
                key={item.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
                      {item.term.charAt(0).toUpperCase()}
                    </div>

                    <button 
                      onClick={() => item.id && toggleLearned(item.id, item.learnedBy)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                        item.learnedBy?.includes(user?.uid || '')
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
                      )}
                    >
                      {item.learnedBy?.includes(user?.uid || '') ? "✓ Đã thuộc" : "+ Đánh dấu thuộc"}
                    </button>
                  </div>

                  <h4 className="text-xl font-black text-slate-900 italic group-hover:text-indigo-600 transition-colors">{item.term}</h4>
                  <p className="text-xs font-bold text-indigo-600 mt-1">💡 Giải ngố: {item.meaning}</p>
                  
                  {item.origin && (
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      <strong className="text-slate-400 font-bold uppercase text-[9px] block">Nguồn gốc:</strong>
                      {item.origin}
                    </p>
                  )}

                  {item.example && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs italic text-slate-600 border border-slate-100">
                      "{item.example}"
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => addGenZTermToKnowledge(item)}
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                  >
                    <Database size={13} />
                    <span>Lưu Knowledge</span>
                  </button>

                  {item.id && (
                    <button 
                      onClick={() => handleDeleteTerm(item.id!)}
                      className="text-xs text-slate-300 hover:text-rose-500 transition-colors p-1"
                      title="Xóa thuật ngữ"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: EXCEL AI & SHORTCUTS (Tin Học GenZ Style) */}
      {hubTab === 'excel_ai' && (
        <div className="space-y-8">
          {/* AI Excel Generator Card */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-[2.5rem] border border-emerald-500/30 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight italic">Trợ Lý Viết Công Thức Excel AI Thần Tốc</h3>
                <p className="text-xs text-emerald-300/80">Nhập yêu cầu bằng tiếng Việt thuần túy, AI sẽ sinh công thức Excel tối ưu nhất kèm giải thích.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={excelRequirement}
                onChange={(e) => setExcelRequirement(e.target.value)}
                placeholder="Ví dụ: Tính tổng doanh thu của sản phẩm 'Laptop' trong tháng 5 khi số lượng lớn hơn 10..."
                className="flex-1 px-5 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-400"
              />
              <button
                onClick={handleGenerateExcelFormula}
                disabled={isGeneratingFormula || !excelRequirement.trim()}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 shrink-0"
              >
                {isGeneratingFormula ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Sinh Công Thức</span>
              </button>
            </div>

            {excelFormulaResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-slate-900/90 rounded-2xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Công thức Excel gợi ý:</span>
                  <button
                    onClick={() => handleCopyText(excelFormulaResult.formula, 'Công thức Excel')}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    {copiedShortcut === excelFormulaResult.formula ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    <span>{copiedShortcut === excelFormulaResult.formula ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div className="p-3 bg-black/60 rounded-xl font-mono text-sm text-amber-300 font-bold overflow-x-auto select-all">
                  {excelFormulaResult.formula}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed"><strong className="text-emerald-400">Giải thích:</strong> {excelFormulaResult.explanation}</p>
                <p className="text-xs text-slate-400"><strong className="text-emerald-400">Ví dụ áp dụng:</strong> {excelFormulaResult.example}</p>
              </motion.div>
            )}
          </div>

          {/* Keyboard Shortcuts Bank */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard size={20} className="text-indigo-600" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Ngân Hàng Phím Tắt Thần Tốc Tin Học GenZ</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {OFFICE_SHORTCUTS.map((sc, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleCopyText(sc.key, 'Phím tắt')}
                  className="p-5 bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-md mb-2 inline-block">{sc.cat}</span>
                    <h4 className="text-xs font-medium text-slate-700 leading-relaxed">{sc.desc}</h4>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-xs font-extrabold text-slate-900 text-center group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                    <span>{sc.key}</span>
                    {copiedShortcut === sc.key && <CheckCircle2 size={14} className="text-emerald-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GAMIFIED MOS QUIZ */}
      {hubTab === 'quiz' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Đấu Trường Trắc Nghiệm Tin Học Văn Phòng MOS</h3>
                  <p className="text-xs text-slate-500">Thử thách kiến thức Excel, Word & Thủ thuật Gen Z</p>
                </div>
              </div>

              <div className="px-4 py-2 bg-rose-50 text-rose-600 font-black text-sm rounded-xl border border-rose-100">
                Điểm: {score} / 100
              </div>
            </div>

            {!quizFinished ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                  <span>Câu hỏi {currentQuizIdx + 1} / {PRESET_QUIZ_QUESTIONS.length}</span>
                  <span>Chủ đề MOS Excel & Office</span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {PRESET_QUIZ_QUESTIONS[currentQuizIdx].question}
                </h4>

                <div className="space-y-3">
                  {PRESET_QUIZ_QUESTIONS[currentQuizIdx].options.map((opt, oIdx) => {
                    const isSelected = selectedOption === oIdx;
                    const isCorrect = oIdx === PRESET_QUIZ_QUESTIONS[currentQuizIdx].correctAnswer;
                    let btnStyle = "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100";

                    if (selectedOption !== null) {
                      if (isCorrect) btnStyle = "bg-emerald-500 text-white border-emerald-600 font-bold";
                      else if (isSelected) btnStyle = "bg-rose-500 text-white border-rose-600 font-bold";
                    }

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleAnswerQuiz(oIdx)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between",
                          btnStyle
                        )}
                      >
                        <span>{opt}</span>
                        {selectedOption !== null && isCorrect && <CheckCircle2 size={18} />}
                      </button>
                    );
                  })}
                </div>

                {selectedOption !== null && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 space-y-1">
                    <strong className="font-black uppercase block text-[10px] text-indigo-600">Giải thích đáp án:</strong>
                    <p>{PRESET_QUIZ_QUESTIONS[currentQuizIdx].explanation}</p>
                  </motion.div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNextQuiz}
                    disabled={selectedOption === null}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    <span>{currentQuizIdx < PRESET_QUIZ_QUESTIONS.length - 1 ? "Câu tiếp theo" : "Xem kết quả"}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Star size={40} className="fill-amber-500" />
                </div>
                <h4 className="text-2xl font-black text-slate-900">Hoàn Thành Thử Thách MOS Gen Z!</h4>
                <p className="text-sm text-slate-600">Tổng điểm đạt được: <strong className="text-indigo-600 font-black text-xl">{score} / 100 điểm</strong></p>
                <button
                  onClick={handleResetQuiz}
                  className="px-6 py-3 bg-indigo-600 text-white text-xs font-bold uppercase rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                >
                  Làm lại đề trắc nghiệm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TECH RADAR */}
      {hubTab === 'tech_radar' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
            <span className="px-2.5 py-1 bg-sky-100 text-sky-700 font-black text-[10px] uppercase rounded-md">Xu hướng #1</span>
            <h4 className="text-base font-black text-slate-900">Ứng dụng Generative AI trong làm slide PowerPoint</h4>
            <p className="text-xs text-slate-600 leading-relaxed">Tự động dựng layout thiết kế chuẩn nhận diện thương hiệu công sở trong 30 giây.</p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 font-black text-[10px] uppercase rounded-md">Xu hướng #2</span>
            <h4 className="text-base font-black text-slate-900">Tự động hóa báo cáo tuần với Python & Excel</h4>
            <p className="text-xs text-slate-600 leading-relaxed">Tích hợp dữ liệu từ nhiều file Excel chỉ với 1 lệnh script duy nhất.</p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase rounded-md">Xu hướng #3</span>
            <h4 className="text-base font-black text-slate-900">Chuẩn MOS GS6 Quốc tế trong tuyển dụng</h4>
            <p className="text-xs text-slate-600 leading-relaxed">Bộ kỹ năng công nghệ số hàng đầu dành cho nhân sự văn phòng thế hệ Gen Z.</p>
          </div>
        </div>
      )}
    </div>
  );
};
