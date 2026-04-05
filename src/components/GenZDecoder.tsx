import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, Search, BookOpen, Quote, Plus, X, Save, Trash2, Brain, Database, TrendingUp, Zap, Bookmark, Check } from 'lucide-react';
import { Type } from '@google/genai';
import { generateContentWithRetry } from '../lib/ai-utils';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
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

export const GenZDecoder: React.FC = () => {
  const { user, unitId } = useAuth();
  const { showToast } = useToast();
  const { addGenZTermToKnowledge } = useKnowledge(showToast);
  const [terms, setTerms] = useState<GenZTerm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [isSyncingToKnowledge, setIsSyncingToKnowledge] = useState(false);
  const [trendingTerms, setTrendingTerms] = useState<GenZTerm[]>([]);
  const [isFetchingTrending, setIsFetchingTrending] = useState(false);
  const [savingTermId, setSavingTermId] = useState<string | null>(null);
  const [savedTermIds, setSavedTermIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'learned' | 'unlearned'>('all');

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
      
      // Sort in memory
      loadedTerms.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setTerms(loadedTerms);
      
      // Also fetch trending terms from a specific collection or filter
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
        // If empty, trigger an initial fetch
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
      const prompt = `Bạn là chuyên gia ngôn ngữ học Gen Z. Hãy liệt kê 10 thuật ngữ Gen Z SIÊU HOT, MỚI NHẤT đang viral trên TikTok, Facebook, Threads tại Việt Nam hôm nay. 
      Yêu cầu:
      - Giải nghĩa ngắn gọn, súc tích, hài hước.
      - Trả về mảng JSON: [{ term, meaning, origin, example }].`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
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
        // Clear old trending and add new ones
        const batch = writeBatch(db);
        
        // Delete old trending (simplified: just add new ones for now, or we could query and delete)
        // For simplicity, we'll just add and the UI will show the latest
        
        for (const item of suggestions) {
          const docRef = doc(collection(db, "genz_trending"));
          batch.set(docRef, {
            ...item,
            unitId: unitId || '',
            authorId: 'system',
            createdAt: Timestamp.now()
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
        source: 'Gen Z Decoder - Trending',
        status: 'pending',
        priority: 'medium',
        createdAt: Timestamp.now(),
        unitId: unitId || '',
        authorId: user.uid
      });
      setSavedTermIds(prev => new Set(prev).add(term.term!));
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
    
    // Check for duplicates
    const isDuplicate = terms.some(t => t.term.toLowerCase() === newTerm.term.trim().toLowerCase());
    if (isDuplicate) {
      alert('Thuật ngữ này đã tồn tại trong bộ nhớ!');
      return;
    }
    
    setIsSaving(true);
    try {
      console.log("Adding term:", { ...newTerm, unitId, authorId: user.uid });
      await addDoc(collection(db, "genz_terms"), {
        ...newTerm,
        term: newTerm.term.trim(),
        unitId: unitId || '',
        authorId: user.uid,
        createdAt: Timestamp.now()
      });
      
      setNewTerm({ term: '', meaning: '', origin: '', example: '' });
      setShowAddForm(false);
      await fetchTerms();
    } catch (error) {
      console.error('Error adding Gen Z term:', error);
      alert('Có lỗi xảy ra khi lưu thuật ngữ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thuật ngữ này?')) return;
    try {
      await deleteDoc(doc(db, "genz_terms", id));
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
      Yêu cầu:
      - Các từ ngữ phải thực tế, đang được dùng nhiều trên TikTok, Facebook, Thread.
      - Giải nghĩa chính xác, hài hước nhưng dễ hiểu cho người lớn tuổi.
      - Cung cấp ví dụ thực tế.
      
      Trả về mảng JSON các đối tượng: { term, meaning, origin, example }.
      `;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
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
            createdAt: Timestamp.now()
          });
        }
        fetchTerms();
      } else if (suggestions.length > 0) {
        setNewTerm(suggestions[0]);
        setShowAddForm(true);
      }
    } catch (error) {
      console.error('AI Suggestion Error:', error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSyncToKnowledge = async () => {
    if (terms.length === 0 || !user) return;
    setIsSyncingToKnowledge(true);
    try {
      const batch = writeBatch(db);
      
      for (const term of terms) {
        const docRef = doc(collection(db, "party_documents"));
        batch.set(docRef, {
          title: `Thuật ngữ Gen Z: ${term.term}`,
          content: `Thuật ngữ: ${term.term}\nÝ nghĩa: ${term.meaning}\nNguồn gốc: ${term.origin}\nVí dụ: ${term.example}`,
          summary: `${term.term}: ${term.meaning}`,
          category: "Gen Z Slang",
          tags: ["GenZ", "Slang", "Ngôn ngữ"],
          isPublic: true,
          isImportant: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          authorId: user.uid,
          unitId: unitId || '',
          type: 'document'
        });
      }
      
      await batch.commit();
      alert(`Đã đồng bộ ${terms.length} thuật ngữ Gen Z vào Knowledge Core!`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('Có lỗi xảy ra khi đồng bộ kiến thức.');
    } finally {
      setIsSyncingToKnowledge(false);
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

  const filteredTerms = terms.filter(t => {
    const matchesSearch = t.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'learned') return t.learnedBy?.includes(user?.uid || '');
    if (activeTab === 'unlearned') return !t.learnedBy?.includes(user?.uid || '');
    if (activeTab === 'new') {
      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return t.createdAt?.toDate() > sevenDaysAgo;
    }
    
    return true;
  });

  const tabs = [
    { id: 'all', label: 'Tất cả', icon: BookOpen },
    { id: 'new', label: 'Mới nhất', icon: Sparkles },
    { id: 'learned', label: 'Đã học', icon: Brain },
    { id: 'unlearned', label: 'Chưa học', icon: Quote },
  ];

  return (
    <div className="space-y-8">
      {/* Trending Marquee Section - v5.0 PRO */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-50 via-white to-indigo-50 py-10 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 border-y border-sky-100/50">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-sky-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 animate-float">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Xu hướng Gen Z</h3>
              <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">Cập nhật thời gian thực từ TikTok & Threads</p>
            </div>
          </div>
          <button 
            onClick={handleUpdateTrending}
            disabled={isFetchingTrending}
            className="btn-pro btn-pro-secondary flex items-center gap-2 py-2 px-4"
          >
            {isFetchingTrending ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-500" />}
            Làm mới xu hướng
          </button>
        </div>

        <div className="relative flex overflow-hidden group/marquee">
          <div className="flex gap-6 whitespace-nowrap animate-marquee pause-on-hover py-4">
            {/* Double the items for seamless loop */}
            {[...trendingTerms, ...trendingTerms].map((item, idx) => (
              <div 
                key={`${item.id}-${idx}`}
                className="bento-card inline-block w-80 p-6 bg-white/80 backdrop-blur-md border-white/50 hover:border-sky-400 hover:shadow-2xl hover:shadow-sky-500/10 transition-all group cursor-pointer relative overflow-hidden"
                onClick={() => {
                  setNewTerm(item);
                  setShowAddForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-sky-500/10 transition-all" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sky-500 font-black text-2xl tracking-tighter italic">#{idx % trendingTerms.length + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleSaveTrendingTerm(e, item)}
                        disabled={savedTermIds.has(item.term!)}
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm",
                          savedTermIds.has(item.term!)
                            ? "bg-emerald-500 text-white"
                            : "bg-sky-50 text-sky-500 hover:bg-sky-500 hover:text-white"
                        )}
                        title="Lưu lại để học sau"
                      >
                        {savingTermId === item.term ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : savedTermIds.has(item.term!) ? (
                          <Check size={14} />
                        ) : (
                          <Bookmark size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  <h4 className="text-slate-900 font-black text-2xl mb-2 group-hover:text-sky-600 transition-colors tracking-tight italic">{item.term}</h4>
                  <p className="text-slate-600 text-xs line-clamp-2 whitespace-normal leading-relaxed font-medium">
                    {item.meaning}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Đang thịnh hành</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50 shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-tight",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-md scale-105" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 lg:max-w-3xl">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm thuật ngữ Gen Z..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => handleAISuggest(false)}
              disabled={isSuggesting}
              className="btn-pro btn-pro-secondary flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-4"
              title="Gợi ý 1 từ mới"
            >
              {isSuggesting ? <RefreshCw size={16} className="animate-spin" /> : <Brain size={16} className="text-amber-500" />}
              <span className="hidden xl:inline">Gợi ý 1 từ</span>
            </button>
            <button 
              onClick={() => handleAISuggest(true)}
              disabled={isSuggesting}
              className="btn-pro btn-pro-dark flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-4"
              title="Tự động cập nhật 10 từ mới nhất"
            >
              {isSuggesting ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} className="text-indigo-400" />}
              <span className="hidden xl:inline">Cập nhật 10 từ</span>
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-pro btn-pro-primary flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-6 shadow-lg shadow-indigo-500/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Thêm mới</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddTerm} className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={16} /> Thêm thuật ngữ mới
                </h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Thuật ngữ</label>
                  <input 
                    required
                    value={newTerm.term}
                    onChange={e => setNewTerm({...newTerm, term: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ví dụ: Trí thông minh bị giãn dị"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ý nghĩa (Giải ngố)</label>
                  <input 
                    required
                    value={newTerm.meaning}
                    onChange={e => setNewTerm({...newTerm, meaning: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ví dụ: Ngu/Ngốc"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nguồn gốc/Hoàn cảnh</label>
                <textarea 
                  value={newTerm.origin}
                  onChange={e => setNewTerm({...newTerm, origin: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 h-20"
                  placeholder="Mô tả nguồn gốc hoặc hoàn cảnh ra đời..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ví dụ sử dụng</label>
                <input 
                  value={newTerm.example}
                  onChange={e => setNewTerm({...newTerm, example: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Ví dụ: Thằng đó trí thông minh bị giãn dị lắm..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Lưu thuật ngữ
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Đang tải từ điển Gen Z...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTerms.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id || idx}
              className="bento-card group p-8 bg-white hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Quote size={64} className="text-indigo-900" />
              </div>
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-2xl transition-all shadow-lg",
                    item.learnedBy?.includes(user?.uid || '') 
                      ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                      : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20"
                  )}>
                    {item.term.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight italic">{item.term}</h4>
                      {item.learnedBy?.includes(user?.uid || '') && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-200">Mastered</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                      <Zap size={12} />
                      Giải ngố: {item.meaning}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 mt-0.5">
                    <BookOpen size={12} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Nguồn gốc & Hoàn cảnh</span>
                    {item.origin}
                  </p>
                </div>
                
                {item.example && (
                  <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 mt-auto relative group/example">
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm">
                      <Quote size={10} className="text-indigo-400" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
                      "{item.example}"
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => item.id && toggleLearned(item.id, item.learnedBy)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      item.learnedBy?.includes(user?.uid || '')
                        ? "text-emerald-600 bg-emerald-50 border border-emerald-100"
                        : "text-slate-400 bg-slate-50 border border-slate-100 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100"
                    )}
                  >
                    <Brain size={14} />
                    {item.learnedBy?.includes(user?.uid || '') ? "Đã thuộc" : "Chưa thuộc"}
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => addGenZTermToKnowledge(item)}
                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                    title="Lưu vào Knowledge Core"
                  >
                    <Database size={16} />
                  </button>
                  <button 
                    onClick={() => item.id && handleDeleteTerm(item.id)}
                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 opacity-0 group-hover:opacity-100"
                    title="Xóa thuật ngữ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && filteredTerms.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <BookOpen size={24} className="text-slate-200" />
          </div>
          <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Chưa có dữ liệu thuật ngữ</h3>
          <p className="text-sm text-slate-400 mt-2">Hãy bắt đầu bằng cách thêm mới hoặc nhờ AI gợi ý.</p>
        </div>
      )}
    </div>
  );
};
