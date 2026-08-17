import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Edit2, Trash2, Calendar, Filter, FileText, 
  CheckCircle2, Clock, X, AlertCircle, Download, FileSpreadsheet, 
  Bot, Loader2, Sparkles, Key, Cpu, Zap, Copy, RefreshCw, BarChart2, Award,
  Check, AlertTriangle, Printer, User, CheckSquare, Square, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import * as XLSX from 'xlsx';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { ConfirmationModal } from './ui/ConfirmationModal';

// Structure for KPI Q2/2026 based on official document
interface TaskKPIEntry {
  id: string;
  workName: string; // Tên công việc (Cột 2)
  output: string; // Kết quả đầu ra (Cột 3)
  deadline: string; // Thời hạn hoàn thành (Cột 4)
  workType: 'regular' | 'extraordinary'; // Loại công việc (Cột 5)
  standardScore: number; // Điểm chuẩn (Cột 6)
  difficulty: number; // Hệ số độ khó (Cột 7) - Lưu dạng %: 100, 110, 120
  maxScore: number; // Điểm quy đổi tối đa (Cột 8) = Điểm chuẩn * Hệ số độ khó
  proof: string; // Minh chứng (Cột 9)
  
  // Actual progress fields for Tab 2
  progressPercent: number; // Tiến độ % (Cột 6 bảng tính điểm) - mặc định 100
  qualityPercent: number; // Kết quả % (Cột 7 bảng tính điểm) - mặc định 100
  performanceScore: number; // Điểm thực hiện (Cột 8) = standardScore * {30% * progress + 70% * quality}
  actualScore: number; // Điểm quy đổi thực tế (Cột 9) = performanceScore * difficulty
  
  // Metadata & Multi-tenancy
  authorUid: string;
  unitId: string;
  year: number;
  quarter: number;
  month: number;
  createdAt: any;
  updatedAt: any;
}

// Criteria structure for Tab 3 (Mẫu 01)
interface CriteriaItem {
  id: string; // VD: "1.1", "2.1"
  group: 'politics' | 'thinking' | 'criticism';
  title: string;
  maxScore: number;
  score: number;
  isPassed: boolean; // Đảm bảo (true) hoặc Không đảm bảo (false)
}

export const TaskJournalModule: React.FC = () => {
  const { user, unitId } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'catalog' | 'pricing' | 'self_evaluation'>('catalog');
  
  // State
  const [entries, setEntries] = useState<TaskKPIEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'processing_ai' | 'generating_excel' | 'done' | 'error'>('idle');
  const [exportErrorMsg, setExportErrorMsg] = useState('');
  
  // Filtering
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(3);
  
  // Catalog Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TaskKPIEntry | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    workName: '',
    output: '',
    deadline: '',
    workType: 'regular' as 'regular' | 'extraordinary',
    standardScore: 10,
    difficulty: 100,
    proof: '',
    progressPercent: 100,
    qualityPercent: 100
  });

  // AI Configuration State
  const [isAIConfigModalOpen, setIsAIConfigModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('CUSTOM_AI_API_KEY') || '');
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('CUSTOM_AI_PROVIDER') || 'gemini');

  // Load sample data trigger
  const [isNapping, setIsNapping] = useState(false);

  // State for Custom Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  // Tab 3: Self evaluation criteria state (Mẫu 01)
  const [evaluatedCriteria, setEvaluatedCriteria] = useState<CriteriaItem[]>([
    // Nhóm 1: Về phẩm chất chính trị, đạo đức, lối sống, trách nhiệm nêu gương (18đ)
    { id: '1.1', group: 'politics', title: 'Tuyệt đối trung thành với Đảng, Tổ quốc và Nhân dân; kiên định chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.2', group: 'politics', title: 'Có tinh thần yêu nước sâu sắc, tận tuỵ phục vụ Nhân dân, sâu sát cơ sở, luôn hành động vì lợi ích chung...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.3', group: 'politics', title: 'Chấp hành nghiêm chủ trương, đường lối, nghị quyết, chỉ thị, nguyên tắc tổ chức, kỷ luật của Đảng...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.4', group: 'politics', title: 'Có tinh thần tự giác, trách nhiệm cao trong nghiên cứu, học tập chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.5', group: 'politics', title: 'Có phẩm chất đạo đức, lối sống trong sáng, trung thực, khiêm tốn, chân thành, giản dị; cần, kiệm, liêm, chính...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.6', group: 'politics', title: 'Không tham vọng quyền lực; không chạy chức, chạy quyền; không tham nhũng, lãng phí, cơ hội, vụ lợi...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.7', group: 'politics', title: 'Có uy tín cao, tiêu biểu về phẩm chất đạo đức và phong cách công tác; là trung tâm đoàn kết đồng chí...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.8', group: 'politics', title: 'Có tinh thần chủ động, đổi mới sáng tạo; phấn đấu vì mục tiêu phát triển của cơ quan, đơn vị...', maxScore: 2, score: 2, isPassed: true },
    { id: '1.9', group: 'politics', title: 'Thực hiện việc kê khai và công khai tài sản, thu nhập theo quy định. Báo cáo đầy đủ, trung thực, chính xác...', maxScore: 2, score: 2, isPassed: true },
    
    // Nhóm 2: Tư duy đổi mới, chiến lược, khát vọng cống hiến, dám nghĩ, dám làm (4đ)
    { id: '2.1', group: 'thinking', title: 'Có tư duy đổi mới, tầm nhìn chiến lược, khả năng lãnh đạo, chỉ đạo thích ứng với sự phát triển thời đại...', maxScore: 1, score: 1, isPassed: true },
    { id: '2.2', group: 'thinking', title: 'Luôn bám sát thực tiễn, có nhiều cách làm hay, sáng tạo, đạt hiệu quả cao trong lãnh đạo, chỉ đạo...', maxScore: 1, score: 1, isPassed: true },
    { id: '2.3', group: 'thinking', title: 'Nói đi đôi với làm, dám nghĩ, dám làm, dám chịu trách nhiệm, dám đột phá vì lợi ích chung, giải pháp kịp thời...', maxScore: 1, score: 1, isPassed: true },
    { id: '2.4', group: 'thinking', title: 'Có khát vọng phấn đấu, cống hiến; có khả năng quy tụ và phát huy được sức mạnh của tập thể...', maxScore: 1, score: 1, isPassed: true },
    
    // Nhóm 3: Về tự phê bình và phê bình, tự soi, tự sửa, khắc phục hạn chế, khuyết điểm (8đ)
    { id: '3.1', group: 'criticism', title: 'Chủ động, nghiêm túc thực hiện tự phê bình và phê bình, có tinh thần cầu thị và tiếp thu phản biện...', maxScore: 2, score: 2, isPassed: true },
    { id: '3.2', group: 'criticism', title: 'Có kế hoạch rõ ràng và quyết liệt trong khắc phục hạn chế, khuyết điểm đã được chỉ ra...', maxScore: 2, score: 2, isPassed: true },
    { id: '3.3', group: 'criticism', title: 'Kết quả khắc phục hoàn thành từ ≥ 80% nội dung, có tiến bộ rõ, được tổ chức đánh giá tốt...', maxScore: 2, score: 2, isPassed: true },
    { id: '3.4', group: 'criticism', title: 'Tự soi, tự sửa trên tinh thần trách nhiệm chính trị cao, không né tránh, không đổ lỗi...', maxScore: 2, score: 2, isPassed: true }
  ]);

  const [savingSelfEval, setSavingSelfEval] = useState(false);
  const [proposedRating, setProposedRating] = useState('Hoàn thành xuất sắc nhiệm vụ');

  // Load Criteria From DB when query changes
  useEffect(() => {
    if (!user) return;
    const fetchSelfEval = async () => {
      try {
        const q = query(
          collection(db, 'self_evaluations'),
          where('authorUid', '==', user.uid),
          where('year', '==', selectedYear),
          where('quarter', '==', selectedQuarter)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          if (docData.criteria) {
            setEvaluatedCriteria(docData.criteria);
          }
          if (docData.proposedRating) {
            setProposedRating(docData.proposedRating);
          }
        } else {
          // Reset to default criteria
          setEvaluatedCriteria(prev => prev.map(c => ({ ...c, isPassed: true, score: c.maxScore })));
          setProposedRating('Hoàn thành xuất sắc nhiệm vụ');
        }
      } catch (err) {
        console.error("Error loading self evaluation criteria:", err);
      }
    };
    fetchSelfEval();
  }, [user, selectedYear, selectedQuarter]);

  // Fetch data with backward compatibility parsing
  useEffect(() => {
    if (!user) return;
    
    let entriesQuery;
    if (unitId) {
      entriesQuery = query(
        collection(db, 'task_journals'),
        where('unitId', '==', unitId),
        where('year', '==', selectedYear)
      );
    } else {
      entriesQuery = query(
        collection(db, 'task_journals'),
        where('authorUid', '==', user.uid),
        where('year', '==', selectedYear)
      );
    }

    const unsubscribe = onSnapshot(entriesQuery, (snapshot) => {
      const data: TaskKPIEntry[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        
        // Backward compatibility mapping:
        const workName = item.workName || item.content || '';
        const output = item.output || item.progress || 'Báo cáo';
        const deadline = item.deadline || '';
        const workType = item.workType || (item.categoryId === 'arising_task' ? 'extraordinary' : 'regular');
        const standardScore = item.standardScore !== undefined ? item.standardScore : (workType === 'extraordinary' ? 12 : 10);
        const difficulty = item.difficulty !== undefined ? item.difficulty : 100;
        const maxScore = item.maxScore !== undefined ? item.maxScore : Math.round(standardScore * (difficulty / 100) * 10) / 10;
        const proof = item.proof || item.implementingDoc || '';
        
        // actual progress
        const progressPercent = item.progressPercent !== undefined ? item.progressPercent : 100;
        const qualityPercent = item.qualityPercent !== undefined ? item.qualityPercent : 100;
        
        // Formula: Điểm thực hiện = Cột 3 (standardScore) * {30% * progressPercent + 70% * qualityPercent}
        const performanceScore = Math.round(standardScore * (0.3 * (progressPercent / 100) + 0.7 * (qualityPercent / 100)) * 100) / 100;
        
        // Formula: Điểm quy đổi thực tế = Điểm thực hiện * Hệ số độ khó
        const actualScore = Math.round(performanceScore * (difficulty / 100) * 100) / 100;

        data.push({
          id: doc.id,
          workName,
          output,
          deadline,
          workType,
          standardScore,
          difficulty,
          maxScore,
          proof,
          progressPercent,
          qualityPercent,
          performanceScore,
          actualScore,
          authorUid: item.authorUid || user.uid,
          unitId: item.unitId || unitId || 'vp-dang-uy',
          year: item.year || selectedYear,
          quarter: item.quarter || selectedQuarter,
          month: item.month || currentMonth,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        } as TaskKPIEntry);
      });

      // Sort chronological
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });
      
      setEntries(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching task KPI journals:", error);
      handleFirestoreError(error, OperationType.LIST, 'task_journals');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, unitId, selectedYear]);

  // Handle workType changes to auto-calculate default standardScore
  const handleWorkTypeChange = (type: 'regular' | 'extraordinary') => {
    const defaultScore = type === 'extraordinary' ? 12 : 10;
    setFormData(prev => ({
      ...prev,
      workType: type,
      standardScore: defaultScore
    }));
  };

  const [isStandardizingWorkName, setIsStandardizingWorkName] = useState(false);
  const [isSuggestingProof, setIsSuggestingProof] = useState(false);

  const handleAIStandardizeWorkName = async () => {
    if (!formData.workName.trim()) {
      alert("Đồng chí vui lòng nhập ý tưởng công việc sơ lược trước.");
      return;
    }
    try {
      setIsStandardizingWorkName(true);
      const prompt = `Bạn là Trợ lý AI chuyên trách của Chánh Văn phòng Đảng ủy. Hãy biên tập hành chính hóa một cách cực kỳ trang trọng, sắc sảo và sắc nét tiêu đề công việc sau đây để đạt chuẩn văn phong chính trị, nghị quyết và chỉ đạo của Đảng ủy:
"${formData.workName}"
Yêu cầu:
- Diễn đạt trang trọng, súc tích, chuyên nghiệp.
- Không thêm chú thích hay kính ngữ thừa, chỉ trả về đúng 1 câu tiêu đề chuẩn hóa duy nhất.`;

      const responseData = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.15 },
      });
      const result = responseData.text.replace(/^["']|["']$/g, '').trim();
      if (result) {
        setFormData(prev => ({ ...prev, workName: result }));
      }
    } catch (e: any) {
      console.error(e);
      alert("Gặp lỗi khi kết nối AI: " + e.message);
    } finally {
      setIsStandardizingWorkName(false);
    }
  };

  const handleAISuggestProof = async () => {
    if (!formData.workName.trim()) {
      alert("Đồng chí vui lòng nhập tên công việc trước để gợi ý minh chứng tương ứng.");
      return;
    }
    try {
      setIsSuggestingProof(true);
      const prompt = `Bạn là Trợ lý AI của Chánh Văn phòng Đảng ủy. Dựa vào tên công việc sau: "${formData.workName}", hãy đề xuất một tên tài liệu minh chứng hành chính chuẩn duy nhất (ví dụ như số Báo cáo -BC/ĐU, Thông báo -TB/ĐU, Nghị quyết -NQ/ĐU, Lịch công tác -LCT/ĐU, Công văn -CV/ĐU, ...).
Yêu cầu: Chỉ trả về duy nhất tên tài liệu minh chứng được sinh ra, không thêm lời chào hay chú giải nào khác. Ví dụ: "Báo cáo số 312-BC/ĐU"`;

      const responseData = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      });
      const result = responseData.text.replace(/^["']|["']$/g, '').trim();
      if (result) {
        setFormData(prev => ({ ...prev, proof: result }));
      }
    } catch (e: any) {
      console.error(e);
      alert("Gặp lỗi khi kết nối AI: " + e.message);
    } finally {
      setIsSuggestingProof(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      workName: '',
      output: '',
      deadline: '',
      workType: 'regular',
      standardScore: 10,
      difficulty: 100,
      proof: '',
      progressPercent: 100,
      qualityPercent: 100
    });
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TaskKPIEntry) => {
    setFormData({
      workName: entry.workName,
      output: entry.output,
      deadline: entry.deadline,
      workType: entry.workType,
      standardScore: entry.standardScore,
      difficulty: entry.difficulty,
      proof: entry.proof,
      progressPercent: entry.progressPercent,
      qualityPercent: entry.qualityPercent
    });
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.workName.trim()) {
      alert("Vui lòng nhập tên công việc.");
      return;
    }

    try {
      setIsSaving(true);
      const computedMaxScore = Math.round(formData.standardScore * (formData.difficulty / 100) * 10) / 10;
      
      const pPercent = formData.progressPercent || 100;
      const qPercent = formData.qualityPercent || 100;
      const computedPerf = Math.round(formData.standardScore * (0.3 * (pPercent / 100) + 0.7 * (qPercent / 100)) * 100) / 100;
      const computedActual = Math.round(computedPerf * (formData.difficulty / 100) * 100) / 100;

      const payload: any = {
        workName: formData.workName.trim(),
        output: formData.output.trim() || 'Báo cáo',
        deadline: formData.deadline.trim(),
        workType: formData.workType,
        standardScore: formData.standardScore,
        difficulty: formData.difficulty,
        maxScore: computedMaxScore,
        proof: formData.proof.trim(),
        progressPercent: pPercent,
        qualityPercent: qPercent,
        performanceScore: computedPerf,
        actualScore: computedActual,
        
        authorUid: user.uid,
        unitId: unitId || 'vp-dang-uy',
        year: selectedYear,
        quarter: selectedQuarter,
        month: currentMonth,
        updatedAt: serverTimestamp()
      };

      if (editingEntry) {
        const docRef = doc(db, 'task_journals', editingEntry.id);
        await updateDoc(docRef, payload);
      } else {
        await addDoc(collection(db, 'task_journals'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsSaving(false);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving task KPI entry:", error);
      alert(`Lỗi khi lưu: ${error.message || "Vui lòng kiểm tra kết nối mạng."}`);
      setIsSaving(false);
    }
  };

  // Quick inline score update in Tab 2
  const handleInlineProgressUpdate = async (entry: TaskKPIEntry, field: 'progressPercent' | 'qualityPercent', val: number) => {
    try {
      const pPercent = field === 'progressPercent' ? val : entry.progressPercent;
      const qPercent = field === 'qualityPercent' ? val : entry.qualityPercent;
      
      const computedPerf = Math.round(entry.standardScore * (0.3 * (pPercent / 100) + 0.7 * (qPercent / 100)) * 100) / 100;
      const computedActual = Math.round(computedPerf * (entry.difficulty / 100) * 100) / 100;

      const docRef = doc(db, 'task_journals', entry.id);
      await updateDoc(docRef, {
        progressPercent: pPercent,
        qualityPercent: qPercent,
        performanceScore: computedPerf,
        actualScore: computedActual,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Lỗi cập nhật tiến độ thực tế:", err);
    }
  };

  const handleDelete = (id: string) => {
    setEntryToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDeleteId) return;
    try {
      await deleteDoc(doc(db, 'task_journals', entryToDeleteId));
    } catch (error) {
       console.error("Error deleting task KPI entry:", error);
       handleFirestoreError(error, OperationType.DELETE, `task_journals/${entryToDeleteId}`);
    } finally {
       setEntryToDeleteId(null);
    }
  };

  // Nạp 10 nhiệm vụ mẫu từ PDF Quý II/2026 của Chánh Văn phòng Đảng ủy
  const loadSampleQ2Data = async () => {
    if (!user) return;
    if (entries.length > 0) {
      const confirmLoad = window.confirm("Hệ thống phát hiện đã có dữ liệu KPI hiện hữu. Việc nạp dữ liệu mẫu sẽ thêm mới 10 nhiệm vụ chuẩn từ hướng dẫn Quý II/2026. Đồng chí có đồng ý tiếp tục?");
      if (!confirmLoad) return;
    }

    try {
      setIsNapping(true);
      const batchObj = writeBatch(db);
      
      const sampleItems = [
        {
          workName: "Báo cáo Về tình hình kinh tế, xã hội, công tác xây dựng Đảng, hệ thống chính trị tại phường Thủ Dầu Một (ngày 01/4/2026)",
          output: "Báo cáo",
          deadline: "1/4/2026",
          workType: "regular",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 100,
          qualityPercent: 80, // Sửa đổi nhỏ như PDF Mẫu: Điểm thực hiện 8.6
          proof: "Báo cáo số 287-BC/ĐU"
        },
        {
          workName: "Báo cáo Về tình hình kinh tế, xã hội, công tác xây dựng Đảng, hệ thống chính trị tại phường Thủ Dầu Một (ngày 02/4/2026)",
          output: "Báo cáo",
          deadline: "2/4/2026",
          workType: "regular",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 100,
          qualityPercent: 100, // Điểm thực tế 10.0
          proof: "Báo cáo số 290-BC/ĐU"
        },
        {
          workName: "Thông báo Kết luận của Thường trực Đảng ủy tại cuộc họp Thường trực Đảng ủy mở rộng ngày 02/4/2026",
          output: "Thông báo",
          deadline: "2/4/2026",
          workType: "regular",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 80, // trễ 1 ngày
          qualityPercent: 80, // Điểm thực tế 8.0
          proof: "Thông báo số 136-TB/ĐU"
        },
        {
          workName: "Lịch làm việc của Ban Thường vụ Đảng ủy, Thường trực Đảng ủy (Từ ngày 06/4/2026 - 12/4/2026)",
          output: "LCT",
          deadline: "5/4/2026",
          workType: "regular",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 100,
          qualityPercent: 100,
          proof: "Lịch công tác số 14-LCT/ĐU"
        },
        {
          workName: "Thông báo Kết luận của Thường trực Đảng ủy tại cuộc họp Thường trực Đảng ủy mở rộng ngày 06/4/2026",
          output: "Thông báo",
          deadline: "6/4/2026",
          workType: "regular",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 100,
          qualityPercent: 80,
          proof: "Thông báo số 138-TB/ĐU"
        },
        {
          workName: "Công văn V/v mời dự Hội nghị Ban Chấp hành Đảng bộ lần thứ 5, khóa I (mở rộng)",
          output: "Công văn",
          deadline: "7/4/2026",
          workType: "extraordinary",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 100,
          qualityPercent: 100,
          proof: "Công văn số 330-CV/ĐU"
        },
        {
          workName: "Thông báo Kết luận của Ban Thường vụ Đảng ủy phường tại cuộc họp Ban Thường vụ Đảng ủy lần thứ 14, ngày 07/4/2026",
          output: "Thông báo",
          deadline: "7/4/2026",
          workType: "regular",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 80,
          qualityPercent: 80,
          proof: "Thông báo số 139-TB/ĐU"
        },
        {
          workName: "Công văn Về việc thực hiện Công văn số 2618-CV/VPTU, ngày 03/4/2026 của Văn phòng Thành ủy Thành phố Hồ Chí Minh",
          output: "Công văn",
          deadline: "9/4/2026",
          workType: "extraordinary",
          standardScore: 10,
          difficulty: 100,
          progressPercent: 100,
          qualityPercent: 80,
          proof: "Công văn số 343-CV/ĐU"
        },
        {
          workName: "Tổng hợp các kiến nghị phục vụ Đoàn công tác Bộ Chính trị",
          output: "Công văn báo cáo",
          deadline: "Trước hội nghị",
          workType: "extraordinary",
          standardScore: 12,
          difficulty: 100,
          progressPercent: 80,
          qualityPercent: 80,
          proof: "Công văn báo cáo số ...-CV/ĐU"
        },
        {
          workName: "Đề xuất sửa chữa, mua sắm trang thiết bị phục vụ hoạt động Đảng ủy",
          output: "Tờ trình, dự toán",
          deadline: "Theo phát sinh",
          workType: "extraordinary",
          standardScore: 12,
          difficulty: 120,
          progressPercent: 80,
          qualityPercent: 60,
          proof: "Tờ trình số ...-TTr/VPĐU"
        }
      ];

      sampleItems.forEach(item => {
        const docRef = doc(collection(db, 'task_journals'));
        const computedMaxScore = Math.round(item.standardScore * (item.difficulty / 100) * 10) / 10;
        const computedPerf = Math.round(item.standardScore * (0.3 * (item.progressPercent / 100) + 0.7 * (item.qualityPercent / 100)) * 100) / 100;
        const computedActual = Math.round(computedPerf * (item.difficulty / 100) * 100) / 100;

        batchObj.set(docRef, {
          ...item,
          maxScore: computedMaxScore,
          performanceScore: computedPerf,
          actualScore: computedActual,
          authorUid: user.uid,
          unitId: unitId || 'vp-dang-uy',
          year: selectedYear,
          quarter: selectedQuarter,
          month: currentMonth,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batchObj.commit();
      setIsNapping(false);
      alert("Đã đồng bộ kết nối và nạp thành công 10 nhiệm vụ mẫu chuẩn từ tài liệu KPI Quý II/2026 vào hệ thống!");
    } catch (e: any) {
      console.error("Nạp dữ liệu mẫu thất bại:", e);
      setIsNapping(false);
      alert("Gặp lỗi khi nạp dữ liệu mẫu: " + e.message);
    }
  };

  // Filtered lists
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.output || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.proof || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter strictly by quarter
    const matchesQuarter = entry.quarter === selectedQuarter;
    
    return matchesSearch && matchesQuarter;
  });

  // Calculations for Tab 2
  // Giá trị A: Tổng Điểm quy đổi tối đa (Tổng cột 5)
  const totalMaxScore = filteredEntries.reduce((sum, item) => sum + (item.maxScore || 0), 0);
  
  // Giá trị B: Tổng Điểm quy đổi thực tế (Tổng cột 9)
  const totalActualScore = filteredEntries.reduce((sum, item) => sum + (item.actualScore || 0), 0);
  
  // KPI % (Trục 4) = B/A * 70 (Nếu B > A thì KPI là 70)
  const scoreRatio = totalMaxScore > 0 ? (totalActualScore / totalMaxScore) : 0;
  const computedKPIScore = Math.min(70, Math.round(scoreRatio * 70 * 100) / 100);

  const regularCount = filteredEntries.filter(e => e.workType === 'regular').length;
  const extraordinaryCount = filteredEntries.filter(e => e.workType === 'extraordinary').length;

  // Tab 3: Self Eval (Mẫu 01) calculations
  const totalApolitics = evaluatedCriteria
    .filter(c => c.group === 'politics')
    .reduce((sum, c) => sum + (c.isPassed ? c.maxScore : 0), 0);
    
  const totalAthinking = evaluatedCriteria
    .filter(c => c.group === 'thinking')
    .reduce((sum, c) => sum + (c.isPassed ? c.maxScore : 0), 0);

  const totalAcriticism = evaluatedCriteria
    .filter(c => c.group === 'criticism')
    .reduce((sum, c) => sum + (c.isPassed ? c.maxScore : 0), 0);

  // TỔNG ĐIỂM TIÊU CHÍ CHUNG (Tối đa 30đ)
  const totalCommonScore = totalApolitics + totalAthinking + totalAcriticism;

  // TỔNG CỘNG ĐIỂM (A + B) (Tối đa 100đ): A (tiêu chí chung - max 30) + B (nhiệm vụ chuyên môn - max 70)
  const grandTotalScore = Math.round((totalCommonScore + computedKPIScore) * 100) / 100;

  // Autoproposed ratings based on party handbook standards
  useEffect(() => {
    if (grandTotalScore >= 90) {
      setProposedRating('Hoàn thành xuất sắc nhiệm vụ');
    } else if (grandTotalScore >= 75) {
      setProposedRating('Hoàn thành tốt nhiệm vụ');
    } else if (grandTotalScore >= 50) {
      setProposedRating('Hoàn thành nhiệm vụ');
    } else {
      setProposedRating('Không hoàn thành nhiệm vụ');
    }
  }, [grandTotalScore]);

  // Toggle criteria evaluation in Tab 3
  const handleToggleCriteria = (id: string) => {
    setEvaluatedCriteria(prev => prev.map(c => {
      if (c.id === id) {
        const nextPassed = !c.isPassed;
        return {
          ...c,
          isPassed: nextPassed,
          score: nextPassed ? c.maxScore : 0
        };
      }
      return c;
    }));
  };

  // Save Self Evaluation Form to Firestore
  const saveSelfEvaluation = async () => {
    if (!user) return;
    try {
      setSavingSelfEval(true);
      
      const q = query(
        collection(db, 'self_evaluations'),
        where('authorUid', '==', user.uid),
        where('year', '==', selectedYear),
        where('quarter', '==', selectedQuarter)
      );
      const querySnapshot = await getDocs(q);
      
      const payload = {
        authorUid: user.uid,
        unitId: unitId || 'vp-dang-uy',
        year: selectedYear,
        quarter: selectedQuarter,
        criteria: evaluatedCriteria,
        proposedRating,
        commonScore: totalCommonScore,
        kpiScore: computedKPIScore,
        grandTotal: grandTotalScore,
        updatedAt: serverTimestamp()
      };

      if (!querySnapshot.empty) {
        // Update existing self eval doc
        const docRef = doc(db, 'self_evaluations', querySnapshot.docs[0].id);
        await updateDoc(docRef, payload);
      } else {
        // Create new self eval doc
        await addDoc(collection(db, 'self_evaluations'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setSavingSelfEval(false);
      alert("Đồng chí đã lưu bản tự đánh giá Mẫu 01 lên hệ thống thành công!");
    } catch (err: any) {
      console.error(err);
      setSavingSelfEval(false);
      alert("gặp lỗi khi lưu bản tự đánh giá: " + err.message);
    }
  };

  // Standard XLSX Export
  const generateExcelFile = (dataList: any[], isAi: boolean) => {
    const wsData = [
      ["DANH MỤC SẢN PHẨM CHUẨN QUÝ " + selectedQuarter + " NĂM " + selectedYear],
      ["Đơn vị: " + (unitId ? unitId.toUpperCase() : "VĂN PHÒNG ĐẢNG ỦY")],
      [],
      ["TT", "Tên công việc", "Kết quả đầu ra", "Thời hạn hoàn thành", "Loại công việc", "Điểm chuẩn", "Hệ số độ khó", "Điểm quy đổi tối đa", "Minh chứng", "Tiến độ %", "Kết quả %", "Điểm quy đổi thực tế"]
    ];

    dataList.forEach((item, index) => {
      wsData.push([
        (index + 1).toString(),
        item.workName || "",
        item.output || "",
        item.deadline || "",
        item.workType === 'extraordinary' ? "Đột xuất" : "Thường xuyên",
        (item.standardScore || 10).toString(),
        `${item.difficulty || 100}%`,
        (item.maxScore || 10).toString(),
        item.proof || "",
        `${item.progressPercent || 100}%`,
        `${item.qualityPercent || 100}%`,
        (item.actualScore || 10).toString()
      ]);
    });

    wsData.push([]);
    wsData.push([
      "TỔNG CỘNG",
      `Tổng số công việc: ${dataList.length}`,
      "", "", "", "", "",
      `Tổng điểm tối đa: ${totalMaxScore}`,
      "", "", "",
      `Tổng điểm thực tế: ${totalActualScore}`
    ]);
    wsData.push([
      "CHỈ SỐ KPI CHỨC DANH QUÝ " + selectedQuarter + ":",
      `${computedKPIScore} / 70 điểm (Đồng chí tự đánh giá xếp loại)`,
      "", "", "", "", "", "", "", "", "", ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 6 }, { wch: 45 }, { wch: 20 }, { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 12 },
      { wch: 12 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `KPI_Bieu_Chi_Tiet_Q${selectedQuarter}`);
    XLSX.writeFile(wb, `Bieu_KPI_Hieu_Suat_Q${selectedQuarter}_${selectedYear}.xlsx`);
  };

  const saveAIConfig = () => {
    localStorage.setItem('CUSTOM_AI_API_KEY', customApiKey);
    localStorage.setItem('CUSTOM_AI_PROVIDER', aiProvider);
    setIsAIConfigModalOpen(false);
  };

  const handleExport = async (isAi: boolean) => {
    setExportState(isAi ? 'processing_ai' : 'generating_excel');
    setExportErrorMsg('');
    
    try {
      if (!isAi) {
        generateExcelFile(filteredEntries, false);
      } else {
        if (filteredEntries.length === 0) {
           generateExcelFile([], true);
           setExportState('done');
           setTimeout(() => { setIsExportModalOpen(false); setExportState('idle'); }, 2000);
           return;
        }

        const dataForPrompt = filteredEntries.map(e => ({
          id: e.id,
          workName: e.workName || '',
          output: e.output || '',
          deadline: e.deadline || '',
          workType: e.workType,
          standardScore: e.standardScore,
          difficulty: e.difficulty,
          maxScore: e.maxScore,
          progressPercent: e.progressPercent,
          qualityPercent: e.qualityPercent,
          actualScore: e.actualScore,
          proof: e.proof || ''
        }));
        
        const prompt = `Tôi có danh sách sản phẩm nhiệm vụ chuẩn KPI của Văn phòng Đảng ủy:
${JSON.stringify(dataForPrompt, null, 2)}

Hãy đóng vai Chánh Văn phòng Đảng ủy, viết lại (chuẩn hóa chuyên nghiệp cực kỳ đẳng cấp, sắc sảo) nội dung của các cột "workName" (Tên công việc) và "output" (Kết quả đầu ra) để trình Thường trực duyệt ban hành.
Yêu cầu:
- Tuyệt đối giữ nguyên tính chân thực, định lượng, mốc ngày giờ và tên nội bộ.
- Diễn đạt trôi chảy, đúng chuẩn văn phong tham mưu chính trị - Đảng của Chánh Văn phòng.
- Định dạng ra đúng mảng JSON có cùng cấu trúc thuộc tính đầu vào.`;

        const responseData = await generateContentWithRetry({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.15 },
        });

        const rawText = responseData.text;
        const finalArray = parseAIResponse(rawText);
        
        if (Array.isArray(finalArray) && finalArray.length > 0) {
            setExportState('generating_excel');
            generateExcelFile(finalArray, true);
        } else {
            throw new Error("Dữ liệu trả về bị lỗi cấu trúc từ AI.");
        }
      }
      
      setExportState('done');
      setTimeout(() => {
        setIsExportModalOpen(false);
        setExportState('idle');
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setExportState('error');
      setExportErrorMsg(err.message || 'Không thể kết nối AI để xử lý. Vui lòng thử lại.');
    }
  };

  // Quick print self evaluation form
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="h-7 w-7 text-indigo-650 animate-pulse" />
            Quản trị & Thống Kê KPI 8.0
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Hệ thống quản lý chỉ tiêu, chấm điểm hiệu suất văn phòng & tự đánh giá xếp loại đảng viên tự động của Chánh Văn phòng
          </p>
        </div>
        
        {/* Navigation Tabs bar */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${activeTab === 'catalog' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Sản phẩm chuẩn (9 Cột)
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${activeTab === 'pricing' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Bảng chấm điểm KPI
          </button>
          <button
            onClick={() => setActiveTab('self_evaluation')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${activeTab === 'self_evaluation' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Bản tự đánh giá Mẫu 01
          </button>
        </div>
      </div>

      {/* Quarter picker & Global actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-3xl border border-slate-150/80 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Chu kỳ đánh giá:</span>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-8">
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="py-1 px-2 border-none focus:ring-0 text-xs font-black text-slate-700 bg-transparent cursor-pointer"
            >
              <option value={1}>Quý I</option>
              <option value={2}>Quý II</option>
              <option value={3}>Quý III</option>
              <option value={4}>Quý IV</option>
            </select>
            <div className="h-4 w-px bg-slate-200"></div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="py-1 px-2 border-none focus:ring-0 text-xs font-black text-slate-700 bg-transparent cursor-pointer"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>

          <button
            onClick={loadSampleQ2Data}
            disabled={isNapping}
            className="flex items-center gap-1.5 px-3 h-8 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 rounded-xl transition font-bold text-[11px] uppercase tracking-wider"
            title="Đồng bộ nạp các danh mục sản phẩm chuẩn từ tài liệu Quý II/2026 gửi lên"
          >
            {isNapping ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Nạp Mẫu Quý II
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAIConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3 h-8 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl transition font-bold text-[11px] uppercase tracking-wider"
          >
            <Cpu className="h-3.5 w-3.5" /> Trợ Lý AI
          </button>
          
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition font-black text-[11px] uppercase tracking-wider shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> Xuất Báo Cáo
          </button>

          {activeTab === 'catalog' && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition font-black text-[11px] uppercase tracking-wider shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm chỉ tiêu
            </button>
          )}

          {activeTab === 'self_evaluation' && (
            <>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-[11px] uppercase tracking-wider"
              >
                <Printer className="h-3.5 w-3.5" /> In Bản Tự Đánh Giá
              </button>
              <button
                onClick={saveSelfEvaluation}
                disabled={savingSelfEval}
                className="flex items-center gap-1.5 px-4 h-8 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition font-black text-[11px] uppercase tracking-wider shadow-sm disabled:opacity-50"
              >
                {savingSelfEval ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Lưu Bản Mẫu 01
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-24 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Hệ thống đang chỉ huy đồng bộ dữ liệu KPI...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* TAB 1: DANH MỤC SẢN PHẨM CHUẨN */}
          {activeTab === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Stats Panel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tổng Số Chỉ Tiêu</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">{filteredEntries.length}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Thường Xuyên</span>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{regularCount}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    {Math.round((regularCount / (filteredEntries.length || 1)) * 100)}%
                  </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nhiệm Vụ Đột Xuất</span>
                    <h3 className="text-2xl font-black text-rose-600 mt-1">{extraordinaryCount}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                    {Math.round((extraordinaryCount / (filteredEntries.length || 1)) * 100)}%
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Định mức Điểm chuẩn tối đa</span>
                    <h3 className="text-2xl font-black text-amber-300 mt-1">{totalMaxScore}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center font-black">
                    MAX
                  </div>
                </div>
              </div>

              {/* Core Table */}
              <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8 text-center border-b border-slate-100 bg-slate-50/40 relative">
                  <div className="static md:absolute top-8 right-8 text-right text-xs">
                    <p className="font-extrabold text-slate-800 tracking-wider">ĐẢNG CỘNG SẢN VIỆT NAM</p>
                    <p className="text-[10px] italic text-slate-500 mt-1 font-bold">Thủ Dầu Một, {selectedYear}</p>
                  </div>
                  <div className="static md:absolute top-8 left-8 text-left text-xs">
                    <p className="font-extrabold text-slate-800 uppercase tracking-widest">Đảng bộ: Phường Thủ Dầu Một</p>
                    <p className="font-semibold text-[10px] text-slate-500 mt-1">Văn phòng Đảng uỷ</p>
                  </div>
                  
                  <div className="mt-6 md:mt-4">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">DANH MỤC SẢN PHẨM CHUẨN QUÝ {selectedQuarter} NĂM {selectedYear}</h3>
                    <p className="text-[11px] font-black uppercase text-indigo-600 mt-1 tracking-widest">Chức vụ: Chánh Văn phòng Đảng ủy</p>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">Biểu thống kê sản phẩm đầu ra làm căn cứ tính hiệu suất công việc ban hành chuẩn chỉ</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse table-fixed">
                    <thead className="bg-slate-100/80 text-slate-700 uppercase font-black text-center align-middle border-b border-slate-200">
                      <tr>
                        <th className="border border-slate-200 py-3.5 px-2 w-[4%] text-center">TT</th>
                        <th className="border border-slate-200 py-3.5 px-3 w-[36%] text-left">Tên công việc (Sản phẩm nhiệm vụ)</th>
                        <th className="border border-slate-200 py-3.5 px-3 w-[12%] text-center">Kết quả đầu ra</th>
                        <th className="border border-slate-200 py-3.5 px-3 w-[10%] text-center">Thời hạn hoàn thành</th>
                        <th className="border border-slate-200 py-3.5 px-2.5 w-[9%] text-center">Loại công việc</th>
                        <th className="border border-slate-200 py-3.5 px-2 w-[6%] text-center">Điểm chuẩn</th>
                        <th className="border border-slate-200 py-3.5 px-2 w-[7%] text-center">Hệ số độ khó</th>
                        <th className="border border-slate-200 py-3.5 px-2 w-[8%] text-center bg-yellow-50/50 text-indigo-900">Điểm quy đổi tối đa</th>
                        <th className="border border-slate-200 py-3.5 px-3 w-[12%] text-left">Minh chứng</th>
                        <th className="border border-slate-200 py-3.5 px-2 w-[5%] text-center">Tác vụ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredEntries.length > 0 ? (
                        filteredEntries.map((entry, index) => (
                          <tr key={entry.id} className="hover:bg-slate-50/60 align-top group transition-colors">
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-500">({index + 1})</td>
                            <td className="border border-slate-200 p-3 text-slate-800 font-medium leading-relaxed">{entry.workName}</td>
                            <td className="border border-slate-200 p-3 text-center font-semibold text-slate-600">{entry.output}</td>
                            <td className="border border-slate-200 p-3 text-center">
                              <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-150">
                                {entry.deadline || '—'}
                              </span>
                            </td>
                            <td className="border border-slate-200 p-3 text-center">
                              {entry.workType === 'extraordinary' ? (
                                <span className="inline-block px-2 py-1 bg-rose-50 text-rose-750 rounded-lg text-[9px] font-black border border-rose-100 uppercase tracking-widest">
                                  Đột xuất
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-750 rounded-lg text-[9px] font-black border border-emerald-100 uppercase tracking-widest">
                                  Thường xuyên
                                </span>
                              )}
                            </td>
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-700">{entry.standardScore}</td>
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-600">{entry.difficulty}%</td>
                            <td className="border border-slate-200 p-3 text-center font-black bg-yellow-500/10 text-slate-900 text-[13px]">{entry.maxScore}</td>
                            <td className="border border-slate-200 p-3 text-slate-600 font-medium whitespace-pre-wrap leading-tight">{entry.proof || <span className="text-slate-300 italic">Chưa có minh chứng</span>}</td>
                            <td className="border border-slate-200 p-2 text-center align-middle whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(entry);
                                  }}
                                  className="p-1.5 text-indigo-650 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-100/60 shadow-sm"
                                  title="Chỉnh sửa chỉ tiêu"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(entry.id);
                                  }}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-100/60 shadow-sm"
                                  title="Xóa chỉ tiêu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="border border-slate-200 py-16 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <FileText className="h-10 w-10 text-slate-300 animate-bounce" />
                              <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chưa có sản phẩm chuẩn nào</div>
                              <p className="text-xs text-slate-400 max-w-sm">
                                {selectedQuarter === 2 ? (
                                  'Hãy nhấn nút "Nạp Mẫu Quý II" để đồng bộ nhanh 10 nhiệm vụ mẫu chuẩn từ hướng dẫn lên bảng biểu.'
                                ) : (
                                  `Hãy nhấn nút "Thêm chỉ tiêu" ở góc trên bên phải để bắt đầu cập nhật dữ liệu sản phẩm chuẩn cho chu kỳ Quý ${selectedQuarter} năm ${selectedYear} mới.`
                                )}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: BẢNG CHẤM ĐIỂM KPI CHI TIẾT */}
          {activeTab === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Calculations callout dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 text-white p-6 rounded-[32px] shadow-lg">
                <div className="space-y-2 border-r border-white/10 pr-6">
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Độ phức tạp chỉ tiêu (Giá trị A)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{totalMaxScore}</span>
                    <span className="text-xs font-medium text-slate-300">Điểm kiểm soát tối đa</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Tổng điểm quy đổi tối đa của toàn bộ nhiệm vụ chuẩn trong Quý</p>
                </div>
                
                <div className="space-y-2 border-r border-white/10 pr-6 pl-2">
                  <p className="text-[10px] uppercase font-black tracking-widest text-emerald-200">Điểm thực hiện thực tế (Giá trị B)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-400">{totalActualScore}</span>
                    <span className="text-xs font-medium text-slate-300">Điểm đạt sau quy đổi</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Chấm cụ thể dựa trên mốc Tiến độ (30%) và Kết quả chất lượng (70%)</p>
                </div>

                <div className="space-y-2 pl-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">KPI quy đổi tối đa 70 điểm</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3.5xl font-black text-amber-300">{computedKPIScore}</span>
                      <span className="text-xs font-medium text-slate-300">/ 70 điểm chuyên môn</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Công thức: KPI % = (B / A) * 70 điểm. Điểm này sẽ tự động cập nhật vào Nhóm B của Bản tự đánh giá Mẫu 01.</p>
                </div>
              </div>

              {/* Instructions on calculation */}
              <div className="bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4 flex gap-3 text-indigo-950 text-xs">
                <Info className="h-5 w-5 shrink-0 text-indigo-650" />
                <div className="space-y-1">
                  <p className="font-extrabold uppercase text-[10px] tracking-wider text-indigo-700">Quy tắc chấm thực tiễn văn phòng:</p>
                  <p className="leading-relaxed">
                    <strong>1. Tiến độ (30%):</strong> Hoàn thành đúng/trước hạn (100%), chậm 1-3 ngày (80%), chậm 4-5 ngày (60%), chậm trên 5 ngày (0%).
                  </p>
                  <p className="leading-relaxed">
                    <strong>2. Kết quả (70%):</strong> Đạt đầy đủ yêu cầu (100%), đạt yêu cầu cần chỉnh sửa nhỏ (80%), hoàn thành cơ bản (60%), không đạt yêu cầu (0%).
                  </p>
                  <p className="leading-relaxed">
                    <strong>3. Điểm Quy đổi thực tế</strong> = [Điểm chuẩn * (30% * Tiến độ% + 70% * Kết quả%)] * Hệ số độ khó.
                  </p>
                </div>
              </div>

              {/* Main table for scores */}
              <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">BẢNG TÍNH ĐIỂM KPI CHI TIẾT THEO SẢN PHẨM</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Vui lòng điều chỉnh Tiến độ % và Kết quả % trực tiếp trên dòng để hệ thống tự động tái tính toán điểm</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse table-fixed">
                    <thead className="bg-slate-100/80 text-slate-755 uppercase font-extrabold text-center border-b border-slate-200">
                      <tr>
                        <th className="border border-slate-200 py-3 px-1.5 w-[4%]">TT</th>
                        <th className="border border-slate-200 py-3 px-3 w-[30%] text-left">Tên công việc</th>
                        <th className="border border-slate-200 py-3 px-2 w-[7%]">Điểm chuẩn</th>
                        <th className="border border-slate-200 py-3 px-2 w-[8%]">Hệ số khó</th>
                        <th className="border border-slate-200 py-3 px-2 w-[8%] bg-yellow-50/30 text-indigo-900">Quy đổi Max</th>
                        <th className="border border-slate-200 py-3 px-3 w-[15%]">Tiến độ % (Cột 6)</th>
                        <th className="border border-slate-200 py-3 px-3 w-[15%]">Kết quả % (Cột 7)</th>
                        <th className="border border-slate-200 py-3 px-2.5 w-[7%]">Điểm thực hiện (8)</th>
                        <th className="border border-slate-200 py-3 px-3.5 w-[11%] bg-emerald-50 text-emerald-950">Quy đổi thực tế (9)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredEntries.length > 0 ? (
                        filteredEntries.map((entry, index) => (
                          <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors align-middle">
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-400">({index + 1})</td>
                            <td className="border border-slate-200 p-3 text-slate-800 font-medium leading-tight truncate-2-lines" title={entry.workName}>{entry.workName}</td>
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-650">({entry.standardScore})</td>
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-500">{entry.difficulty}%</td>
                            <td className="border border-slate-200 p-3 text-center font-bold bg-slate-50 text-slate-700">{entry.maxScore}</td>
                            
                            {/* Cột 6: Tiến độ % Dropdown */}
                            <td className="border border-slate-200 p-2 text-center">
                              <select
                                value={entry.progressPercent}
                                onChange={(e) => handleInlineProgressUpdate(entry, 'progressPercent', parseInt(e.target.value))}
                                className="w-full text-xs font-bold border border-slate-200 rounded-lg p-1 text-slate-700 bg-white cursor-pointer"
                              >
                                <option value={100}>Đúng / Trước hạn (100%)</option>
                                <option value={80}>Trễ 1-3 ngày (80%)</option>
                                <option value={60}>Trễ 4-5 ngày (60%)</option>
                                <option value={0}>Trễ trên 5 ngày (0%)</option>
                              </select>
                            </td>

                            {/* Cột 7: Kết quả % Dropdown */}
                            <td className="border border-slate-200 p-2 text-center">
                              <select
                                value={entry.qualityPercent}
                                onChange={(e) => handleInlineProgressUpdate(entry, 'qualityPercent', parseInt(e.target.value))}
                                className="w-full text-xs font-bold border border-slate-200 rounded-lg p-1 text-slate-700 bg-white cursor-pointer"
                              >
                                <option value={100}>Đạt đầy đủ (100%)</option>
                                <option value={80}>Sửa nhỏ (80%)</option>
                                <option value={60}>Sửa đổi cơ bản (60%)</option>
                                <option value={0}>Không đạt (0%)</option>
                              </select>
                            </td>

                            {/* Cột 8: Điểm thực hiện */}
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-700">{entry.performanceScore}</td>
                            
                            {/* Cột 9: Quy đổi thực tế */}
                            <td className="border border-slate-200 p-3 text-center font-black bg-emerald-500/10 text-emerald-800 text-[13px]">{entry.actualScore}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="border border-slate-200 py-16 text-center">
                            <p className="text-slate-400 font-bold">Chưa có chỉ tiêu để đánh giá điểm hiệu năng. Vui lòng thêm sản phẩm ở Tab 1.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Results */}
                {filteredEntries.length > 0 && (
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-extrabold text-slate-800">
                    <div>
                      <p className="text-slate-500 uppercase text-[10px] tracking-wider">Tổng hợp chỉ số KPI tính tự động:</p>
                      <p className="text-sm mt-1 text-slate-900 leading-relaxed">
                        Tổng điểm Tối đa Đề án (A): <span className="text-indigo-650">{totalMaxScore}</span> | Tổng điểm thực đạt (B): <span className="text-emerald-650">{totalActualScore}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 uppercase text-[10px] tracking-wider">Kết quả quy nạp 70 điểm làm căn cứ đề án:</p>
                      <p className="text-base mt-0.5 text-slate-900">
                        KPI quy đổi thực tế (Mẫu 01): <span className="text-amber-500 font-black text-xl ml-1">{computedKPIScore}</span> <span className="text-xs font-semibold">/ 70 điểm</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: BẢN TỰ ĐÁNH GIÁ, XẾP LOẠI CỦA CÁ NHÂN (MẪU 01) */}
          {activeTab === 'self_evaluation' && (
            <motion.div
              key="self_evaluation"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Personal Assesment Card layout prepared for print */}
              <div id="print-area" className="bg-white p-8 md:p-12 rounded-[32px] shadow-xl border border-slate-150/80 max-w-4xl mx-auto space-y-8 print:shadow-none print:border-none print:p-0">
                {/* Header of print */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6">
                  <div className="text-xs space-y-1.5 text-slate-800 font-bold">
                    <p className="uppercase tracking-widest">Đảng bộ Phường Thủ Dầu Một</p>
                    <p className="uppercase underline">Văn phòng Đảng uỷ</p>
                    <p className="text-[11px] italic font-medium mt-1">Đảng viên: Nguyễn Minh Huy</p>
                  </div>
                  <div className="text-center text-xs space-y-1 text-slate-850">
                    <p className="uppercase tracking-widest font-extrabold text-slate-900">Mẫu 01</p>
                    <p className="uppercase font-black">Đảng Cộng Sản Việt Nam</p>
                    <p className="italic text-slate-500 mt-1">Thành phố Hồ sắp xếp, ngày 18 tháng 6 năm 2026</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">BẢN TỰ ĐÁNH GIÁ, XẾP LOẠI CỦA CÁ NHÂN</h3>
                  <p className="text-xs font-extrabold text-indigo-650 uppercase tracking-widest">Quý {selectedQuarter}, Năm {selectedYear}</p>
                </div>

                {/* Info block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-slate-150 p-5 rounded-2xl bg-slate-50/50">
                  <div className="space-y-2">
                    <p className="text-slate-700"><strong className="text-slate-900">Họ và tên:</strong> Nguyễn Minh Huy. Ngày sinh: 06/8/1988</p>
                    <p className="text-slate-700"><strong className="text-slate-900">Chức vụ Đảng:</strong> ĐUV, Chánh Văn phòng Đảng ủy</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-700"><strong className="text-slate-900">Đơn vị công tác:</strong> Văn phòng Đảng ủy phường Thủ Dầu Một</p>
                    <p className="text-slate-700"><strong className="text-slate-900">Nhiệm vụ chuyên môn:</strong> Chỉ huy điều hành tổng hợp, tham mưu và quản trị hệ thống</p>
                  </div>
                </div>

                {/* Main Self assessing section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-l-4 border-indigo-600 pl-3">I. Tự đánh giá kết quả thực hiện nhiệm vụ (100 Điểm)</h4>
                  <p className="text-[11px] text-slate-500 italic">Cá nhân tự chấm điểm đạt được đối với từng nhóm tiêu chí (Tối đa 100 điểm, chia làm Nhóm Tiêu chí chung 30 điểm và Nhóm Nhiệm vụ chuyên môn 70 điểm)</p>

                  {/* Trực quan hoá liên kết Tri thức Văn bản chỉ đạo */}
                  <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-3xl p-5 space-y-3 text-xs shadow-xs">
                    <div className="flex items-center gap-2 text-indigo-950 font-black uppercase text-[10px] tracking-wider">
                      <FileText className="h-4 w-4 text-indigo-650" />
                      Hệ thống liên kết Tri thức quy định & Căn cứ Pháp lý chính bộ:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-slate-650 text-[11px] leading-relaxed">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                        <strong className="text-indigo-900 block mb-1">● Quy định số 366-QĐ/TW:</strong> 
                        Ban hành bộ tiêu chí thống nhất đánh giá hiệu năng hằng tháng, hằng quý của cán bộ chuyên trách tại Văn phòng Đảng uỷ.
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                        <strong className="text-indigo-900 block mb-1">● Quy định số 144-QĐ/TW:</strong> 
                        Tiêu chuẩn cốt lõi về phẩm chất đạo đức cách mạng, trách nhiệm nêu gương phục vụ nhân dân tối cao của đảng viên cán bộ quản lý.
                      </div>
                    </div>
                  </div>

                  {/* Section A: Nhóm tiêu chí chung */}
                  <div className="border border-slate-200 rounded-3xl overflow-hidden mt-6 bg-white shadow-sm">
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider">A. Nhóm Tiêu Chí Chung (Tối đa 30 Điểm) - Theo Quy định 366-QĐ/TW</span>
                      <span className="text-xs font-black text-amber-300">Tổng điểm đạt được: {totalCommonScore} / 30 đ</span>
                    </div>

                    <div className="divide-y divide-slate-150">
                      
                      {/* Nhóm 1. Phẩm chất chính trị */}
                      <div className="p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wider">1. Phẩm chất chính trị, đạo đức, lối sống, trách nhiệm nêu gương</span>
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">Đạt {totalApolitics} / 18 đ</span>
                        </div>
                        <div className="space-y-2.5">
                          {evaluatedCriteria.filter(c => c.group === 'politics').map((crit) => (
                            <div key={crit.id} className="flex justify-between items-start gap-4 text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-xs hover:border-indigo-100 transition-colors">
                              <span className="text-slate-600 leading-relaxed font-medium"><strong className="text-slate-800 mr-1.5">{crit.id}.</strong>{crit.title}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400">Tối đa: {crit.maxScore}đ</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCriteria(crit.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${crit.isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}
                                >
                                  {crit.isPassed ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                  {crit.isPassed ? 'Đảm bảo x' : 'Không đảm bảo'}
                                </button>
                                <span className={`font-black text-center w-8 text-xs ${crit.isPassed ? 'text-slate-900' : 'text-rose-600'}`}>{crit.score} đ</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nhóm 2. Tư duy đổi mới */}
                      <div className="p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wider">2. Tư duy đổi mới, chiến lược, khát vọng cống hiến, dám nghĩ, dám làm</span>
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">Đạt {totalAthinking} / 4 đ</span>
                        </div>
                        <div className="space-y-2.5">
                          {evaluatedCriteria.filter(c => c.group === 'thinking').map((crit) => (
                            <div key={crit.id} className="flex justify-between items-start gap-4 text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-xs hover:border-indigo-100 transition-colors">
                              <span className="text-slate-600 leading-relaxed font-medium"><strong className="text-slate-800 mr-1.5">{crit.id}.</strong>{crit.title}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400">Tối đa: {crit.maxScore}đ</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCriteria(crit.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${crit.isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}
                                >
                                  {crit.isPassed ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                  {crit.isPassed ? 'Đảm bảo x' : 'Không đảm bảo'}
                                </button>
                                <span className={`font-black text-center w-8 text-xs ${crit.isPassed ? 'text-slate-900' : 'text-rose-600'}`}>{crit.score} đ</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nhóm 3. Tự phê bình phê bình */}
                      <div className="p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wider">3. Về tự phê bình và phê bình, tự soi, tự sửa, khắc phục hạn chế</span>
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">Đạt {totalAcriticism} / 8 đ</span>
                        </div>
                        <div className="space-y-2.5">
                          {evaluatedCriteria.filter(c => c.group === 'criticism').map((crit) => (
                            <div key={crit.id} className="flex justify-between items-start gap-4 text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-xs hover:border-indigo-100 transition-colors">
                              <span className="text-slate-600 leading-relaxed font-medium"><strong className="text-slate-800 mr-1.5">{crit.id}.</strong>{crit.title}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400">Tối đa: {crit.maxScore}đ</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCriteria(crit.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${crit.isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}
                                >
                                  {crit.isPassed ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                  {crit.isPassed ? 'Đảm bảo x' : 'Không đảm bảo'}
                                </button>
                                <span className={`font-black text-center w-8 text-xs ${crit.isPassed ? 'text-slate-900' : 'text-rose-600'}`}>{crit.score} đ</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Section B: Kết quả thực hiện nhiệm vụ được giao (70 điểm) */}
                  <div className="border border-slate-200 rounded-3xl overflow-hidden mt-6 bg-white shadow-sm">
                    <div className="bg-emerald-750 text-white p-4 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider">B. KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO (Tối đa 70 Điểm)</span>
                      <span className="text-xs font-black text-amber-300">Điểm chấm: {computedKPIScore} / 70 đ</span>
                    </div>
                    <div className="p-4 space-y-1 bg-slate-50/40 text-xs text-slate-600">
                      <p className="font-extrabold text-slate-800">Liên kết KPI tự động chuẩn chỉnh:</p>
                      <p className="leading-relaxed">
                        Chỉ số điểm tự động lấy từ <strong>Bảng tính điểm KPI chi tiết (Tab 2)</strong> của Văn phòng gồm {filteredEntries.length} sản phẩm thực tế:
                        Tổng điểm tối đa (A): <strong className="text-slate-800">{totalMaxScore}</strong> | Tổng điểm quy đổi thực đạt (B): <strong className="text-slate-800">{totalActualScore}</strong>.
                      </p>
                      <p className="text-indigo-650 font-bold italic mt-2">Điểm đạt Nhóm B = (Tổng B / Tổng A) * 70 = {computedKPIScore} điểm.</p>
                    </div>
                  </div>

                  {/* GRAND TOTAL ROW */}
                  <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl flex justify-between items-center text-white mt-8 shadow-md">
                    <span className="text-xs uppercase tracking-widest font-black">TỔNG ĐIỂM TOÀN BỘ (A + B) = 100 ĐIỂM</span>
                    <div className="flex items-center gap-6">
                      <span className="text-xs text-slate-300 font-bold">Tự chấm:</span>
                      <span className="text-2xl font-black text-amber-300">{grandTotalScore} <span className="text-xs text-white">Điểm</span></span>
                    </div>
                  </div>

                  {/* Classification part II */}
                  <div className="border border-slate-200 rounded-3xl p-5 space-y-4 bg-white shadow-sm mt-8">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">II. Tự đề xuất xếp loại mức chất lượng:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                      {['Hoàn thành xuất sắc nhiệm vụ', 'Hoàn thành tốt nhiệm vụ', 'Hoàn thành nhiệm vụ', 'Không hoàn thành nhiệm vụ'].map((rating) => (
                        <div
                          key={rating}
                          onClick={() => setProposedRating(rating)}
                          className={`p-3 border rounded-xl text-xs font-bold text-center cursor-pointer transition ${proposedRating === rating ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs' : 'border-slate-200 text-slate-400 bg-slate-50/50'}`}
                        >
                          {rating}
                        </div>
                      ))}
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex gap-3 text-xs text-slate-800 mt-2 font-medium">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <p className="leading-relaxed">
                        Hệ thống tự động đề xuất dựa trên tổng điểm đạt được: <span className="font-extrabold text-indigo-650">"{proposedRating}"</span>. 
                        Đảng viên có thể ghi nhận hoặc tự đề xuất đúng theo chỉ huy văn phòng.
                      </p>
                    </div>
                  </div>

                  {/* Signature block of print */}
                  <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                    <div className="space-y-1">
                      <p className="font-extrabold uppercase text-slate-500 tracking-wider">III. Nhận xét của cấp ủy</p>
                      <p className="text-[10px] italic text-slate-450">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16"></div>
                      <p className="text-slate-400">........................................</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="font-extrabold uppercase text-slate-500 tracking-wider">Xác nhận của lãnh đạo</p>
                      <p className="text-[10px] italic text-slate-450">(Ký và đóng dấu)</p>
                      <div className="h-16"></div>
                      <p className="text-slate-400">........................................</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-extrabold uppercase text-slate-800 tracking-wider">Đảng viên tự đánh giá</p>
                      <p className="text-[10px] italic text-slate-550">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16"></div>
                      <p className="text-slate-900 font-extrabold text-[13px]">{user?.email === 'nguyenhuy.thudaumot@gmail.com' ? 'Nguyễn Minh Huy' : 'Nguyễn Minh Huy'}</p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* New KPI Form Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100"
          >
            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {editingEntry ? 'Biên Tập Sản Phẩm KPI' : 'Thiết Kế Sản Phẩm KPI Mới'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mẫu chuẩn theo đúng Quý {selectedQuarter} năm {selectedYear}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto w-full custom-scrollbar">
              <form id="task-journal-form" onSubmit={handleSave} className="space-y-5">
                
                {/* Information Callout */}
                <div className="bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4 flex gap-3 text-indigo-900 text-xs shadow-sm leading-relaxed">
                  <AlertCircle className="w-5 h-5 shrink-0 text-indigo-600" />
                  <div>
                    <p className="font-extrabold uppercase text-[10px] tracking-widest text-indigo-700">Công thức tính điểm đặc thù:</p>
                    <p className="mt-1 font-medium">
                      Hệ số độ khó ở Cột 7 quyết định mức nhân điểm quy đổi tối đa (Cột 8). Thường xuyên mặc định 10 điểm chuẩn. Đột xuất mặc định 12 điểm chuẩn. Công thức: <span className="underline italic">Điểm chuẩn × Hệ số độ khó %</span>.
                    </p>
                  </div>
                </div>

                {/* Tên công việc */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider">Tên công việc (Sản phẩm nhiệm vụ) *</label>
                    <button
                      type="button"
                      onClick={handleAIStandardizeWorkName}
                      disabled={isStandardizingWorkName || !formData.workName.trim()}
                      className="flex items-center gap-1.5 text-[10px] font-black text-indigo-650 hover:text-indigo-850 px-2.5 py-1 bg-indigo-50 rounded-xl transition border border-indigo-150 disabled:opacity-50 uppercase tracking-wider self-center shadow-xs"
                    >
                      {isStandardizingWorkName ? (
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-indigo-655 animate-pulse" />
                      )}
                      Chuẩn hoá văn phong Đảng
                    </button>
                  </div>
                  <textarea
                    name="workName"
                    value={formData.workName}
                    onChange={(e) => setFormData(prev => ({ ...prev, workName: e.target.value }))}
                    placeholder="Mô tả cụ thể tên công việc hoặc nội dung sản phẩm nghiệp vụ cần thống kê..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[90px] outline-none animate-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Loại công việc (Cột 5) */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider mb-2">Loại công việc (Cột 5)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleWorkTypeChange('regular')}
                        className={`py-3.5 px-4 rounded-xl text-xs font-bold transition border tracking-wider uppercase ${formData.workType === 'regular' ? 'bg-emerald-50 border-emerald-500 text-emerald-850 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                      >
                        Thường xuyên (10 đ)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWorkTypeChange('extraordinary')}
                        className={`py-3.5 px-4 rounded-xl text-xs font-bold transition border tracking-wider uppercase ${formData.workType === 'extraordinary' ? 'bg-rose-50 border-rose-500 text-rose-850 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                      >
                        Đột xuất (12 đ)
                      </button>
                    </div>
                  </div>

                  {/* Hệ số độ khó (Cột 7) */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider mb-2">Hệ số độ khó (Cột 7)</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={100}>Thông thường (100%)</option>
                      <option value={110}>Yêu cầu cao / Cần phối hợp (110%)</option>
                      <option value={120}>Chuyên môn rất cao (120%)</option>
                      <option value={130}>Đặc biệt phức tạp (130%)</option>
                    </select>
                  </div>

                  {/* Kết quả đầu ra (Cột 3) */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider mb-2">Kết quả đầu ra (Cột 3)</label>
                    <input
                      type="text"
                      placeholder="VD: Báo cáo, Thông báo, Công văn, LCT..."
                      name="output"
                      value={formData.output}
                      onChange={(e) => setFormData(prev => ({ ...prev, output: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Thời hạn hoàn thành (Cột 4) */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider mb-2">Thời hạn hoàn thành (Cột 4)</label>
                    <input
                      type="text"
                      placeholder="VD: 1/4/2026, 5/4/2026, hằng tuần..."
                      name="deadline"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Điểm chuẩn (Cột 6) */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider mb-2">Điểm chuẩn cơ bản (Cột 6)</label>
                    <input
                      type="number"
                      value={formData.standardScore}
                      onChange={(e) => setFormData(prev => ({ ...prev, standardScore: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Tự tính điểm quy đổi tối đa (Cột 8) */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider mb-2 text-indigo-600">Điểm tối đa tự tính (Cột 8)</label>
                    <div className="w-full px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs font-black text-slate-900 shadow-sm flex items-center justify-between">
                      {Math.round(formData.standardScore * (formData.difficulty / 100) * 10) / 10} điểm
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-white px-2 py-0.5 rounded-md">Tự động</span>
                    </div>
                  </div>
                </div>

                {/* Minh chứng (Cột 9) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black uppercase text-slate-650 tracking-wider">Minh chứng (Văn bản ban hành, hồ sơ... Cột 9)</label>
                    <button
                      type="button"
                      onClick={handleAISuggestProof}
                      disabled={isSuggestingProof || !formData.workName.trim()}
                      className="flex items-center gap-1.5 text-[10px] font-black text-emerald-650 hover:text-emerald-855 px-2.5 py-1 bg-emerald-50 rounded-xl transition border border-emerald-150 disabled:opacity-50 uppercase tracking-wider self-center shadow-xs"
                    >
                      {isSuggestingProof ? (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-emerald-650 animate-pulse" />
                      )}
                      Sinh Minh chứng chuẩn AI
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="VD: Báo cáo số 287-BC/ĐU, Lịch công tác số 14-LCT/ĐU..."
                    name="proof"
                    value={formData.proof}
                    onChange={(e) => setFormData(prev => ({ ...prev, proof: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

              </form>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-xs text-slate-755 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-bold tracking-wide uppercase transition shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-widest uppercase transition shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Đang thực thi...' : (editingEntry ? 'Lưu cập nhật' : 'Duyệt ban hành')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Export Modal Options */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] overflow-hidden shadow-2xl w-full max-w-md border border-slate-100"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Kết xuất tài liệu KPI
              </h3>
              <button 
                onClick={() => exportState === 'idle' && setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {exportState === 'idle' ? (
                <>
                  <div 
                    onClick={() => handleExport(false)}
                    className="p-4 border border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer transition-all group shadow-sm bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase">Xuất Excel Biểu Chuẩn</h4>
                        <p className="text-[10px] text-slate-450 mt-1">Sản sinh ra file Excel (.xlsx) cấu trúc chi tiết phục vụ in ấn nộp trực tiếp</p>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 transition" />
                    </div>
                  </div>

                  <div 
                    onClick={() => handleExport(true)}
                    className="p-4 border border-slate-200 rounded-2xl hover:border-violet-500 hover:bg-violet-50/50 cursor-pointer transition-all group shadow-sm bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1">
                          Chuẩn Hóa AI & Xuất Excel <Sparkles className="h-3 w-3 text-violet-500 animate-pulse" />
                        </h4>
                        <p className="text-[10px] text-slate-450 mt-1">Dùng trí tuệ nhân tạo Gemini biên dịch chuyên nghiệp hóa, trơn tru câu chữ văn phong Chánh Văn phòng trước khi xuất Excel</p>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-violet-600 transition" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  {exportState === 'processing_ai' && (
                    <>
                      <Loader2 className="h-10 w-10 text-violet-600 animate-spin" />
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">AI đang tinh lọc phong cách Chánh Văn phòng...</p>
                    </>
                  )}
                  {exportState === 'generating_excel' && (
                    <>
                      <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Đang khởi tạo cấu trúc bảng biểu Excel...</p>
                    </>
                  )}
                  {exportState === 'done' && (
                    <>
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Check className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-black uppercase text-emerald-500 tracking-wider">Xuất tệp tin thành công!</p>
                    </>
                  )}
                  {exportState === 'error' && (
                    <>
                      <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                        <X className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-black uppercase text-rose-500 tracking-wider">Thực thi thất bại</p>
                      <p className="text-[10px] text-slate-400 text-center max-w-xs">{exportErrorMsg}</p>
                      <button 
                        onClick={() => setExportState('idle')}
                        className="text-xs font-bold underline text-indigo-600"
                      >
                        Thử lại
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Config Modal */}
      {isAIConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-605" />
                Cấu hình Trợ Lý AI
              </h3>
              <button onClick={() => setIsAIConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1.5">Mô hình AI chủ huy</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-xs font-semibold rounded-xl bg-white"
                >
                  <option value="gemini">Google Gemini 3.5 (Tích hợp)</option>
                  <option value="custom_gemini">Google Gemini (API Key riêng)</option>
                </select>
              </div>

              {aiProvider === 'custom_gemini' && (
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1.5">API KEY riêng</label>
                  <input
                    type="password"
                    placeholder="Nhập API Key của đồng chí..."
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 text-xs font-semibold rounded-xl"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">API Key được lưu an toàn tại Client của đồng chí để bảo mật</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsAIConfigModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 uppercase tracking-wider"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={saveAIConfig}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-sm"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting KPI Task */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setEntryToDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Xác nhận xóa bản ghi KPI"
        message="Đồng chí có chắc chắn muốn xóa bản ghi chỉ tiêu KPI này khỏi hệ thống? Hành động này không thể hoàn tác."
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
        type="danger"
      />
    </div>
  );
};

// Simple Chevron for modal list
const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default TaskJournalModule;
