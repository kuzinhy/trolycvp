import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { StatCard } from './UserManagementModule';
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  MoreVertical, 
  FileText, 
  Clock, 
  Award, 
  ShieldAlert,
  Loader2,
  Save,
  X,
  User,
  Building,
  Briefcase,
  Trash2,
  Edit2,
  UploadCloud,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import * as pdfjsLib from 'pdfjs-dist';
import { generateContentWithRetry } from '../lib/ai-utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ... (imports)

// --- Types ---
interface Officer {
  id: string;
  name: string;
  gender?: string;
  dob?: string;
  cccd?: string;
  unitId: string;
  position: string;
  authorUid: string;
  createdAt: any;
}

interface Evaluation {
  id: string;
  officerId: string;
  quarter: number;
  year: number;
  score: number;
  feedback: string;
  authorUid: string;
  createdAt: any;
}

// --- Components ---
const OfficerRow = memo(({ 
  officer, 
  evaluation, 
  onSelect, 
  onEdit, 
  onDelete, 
  canManage 
}: { 
  officer: Officer, 
  evaluation?: Evaluation, 
  onSelect: (officer: Officer) => void,
  onEdit: (officer: Officer) => void,
  onDelete: (id: string) => void,
  canManage: boolean
}) => (
  <tr className="hover:bg-slate-50 cursor-pointer group" onClick={() => onSelect(officer)}>
    <td className="px-6 py-4">
      <div className="font-medium text-slate-900">{officer.name}</div>
      <div className="text-[10px] text-slate-500 uppercase font-bold">{officer.position}</div>
    </td>
    <td className="px-6 py-4 text-slate-600 font-bold">{officer.unitId}</td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-black", 
          evaluation ? (evaluation.score >= 80 ? 'text-emerald-600' : evaluation.score >= 65 ? 'text-blue-600' : 'text-amber-600') : 'text-slate-300'
        )}>
          {evaluation?.score || '--'}
        </span>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={cn("px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", 
        evaluation ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
      )}>
        {evaluation ? 'Đã đánh giá' : 'Chưa có'}
      </span>
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {canManage && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(officer); }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Edit2 size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(officer.id); }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
        <ChevronRight size={16} className="text-slate-300" />
      </div>
    </td>
  </tr>
));

// --- Officer Form Modal ---
const OfficerForm = ({ isOpen, onClose, onSave, initialData, defaultUnitId, isSuperAdmin }: any) => {
  const [formData, setFormData] = useState(initialData || { name: '', gender: '', dob: '', cccd: '', unitId: defaultUnitId || '', position: '' });

  useEffect(() => {
    if (initialData) setFormData(initialData);
    else setFormData({ name: '', gender: '', dob: '', cccd: '', unitId: defaultUnitId || '', position: '' });
  }, [initialData, isOpen, defaultUnitId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {initialData ? 'Cập nhật cán bộ' : 'Thêm cán bộ mới'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
            <input 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
              placeholder="VD: Nguyễn Văn A" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giới tính</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                value={formData.gender || ''} 
                onChange={e => setFormData({...formData, gender: e.target.value})} 
              >
                <option value="">Chọn giới tính</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày sinh</label>
              <input 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                placeholder="VD: 01/01/1990" 
                value={formData.dob || ''} 
                onChange={e => setFormData({...formData, dob: e.target.value})} 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CCCD</label>
            <input 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
              placeholder="VD: 079090000123" 
              value={formData.cccd || ''} 
              onChange={e => setFormData({...formData, cccd: e.target.value})} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị (Mã)</label>
            <input 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50" 
              placeholder="VD: VP, TC, ..." 
              value={formData.unitId} 
              onChange={e => setFormData({...formData, unitId: e.target.value.toUpperCase()})} 
              disabled={!isSuperAdmin && !!defaultUnitId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chức vụ</label>
            <input 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
              placeholder="VD: Chuyên viên, Trưởng phòng..." 
              value={formData.position} 
              onChange={e => setFormData({...formData, position: e.target.value})} 
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={() => onSave(formData)} 
            disabled={!formData.name || !formData.unitId}
            className="flex-1 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            Lưu thông tin
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface EvaluationModuleProps {
  aiKnowledge?: any[];
  isSuperAdmin?: boolean;
  unitId?: string;
  isAdmin?: boolean;
}

export const EvaluationModule: React.FC<EvaluationModuleProps> = ({ aiKnowledge = [], isSuperAdmin = false, unitId = '', isAdmin = false }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const currentYear = new Date().getFullYear();
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<string | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isAnalyzingTrend, setIsAnalyzingTrend] = useState(false);
  const [trendAnalysisResult, setTrendAnalysisResult] = useState<string | null>(null);

  const handleTrendAnalysis = async (officer: Officer) => {
    if (!user) return;
    setIsAnalyzingTrend(true);
    setTrendAnalysisResult(null);
    try {
      // Fetch all evaluations for this officer
      const allEvalsSnap = await getDocs(query(collection(db, 'evaluations'), where('officerId', '==', officer.id)));
      const allEvals = allEvalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
      
      // Sort evaluations by year and quarter
      const sortedEvals = allEvals.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.quarter - b.quarter;
      });

      const prompt = `Bạn là chuyên gia nhân sự và tâm lý tổ chức. Hãy phân tích xu hướng hiệu quả công tác của cán bộ sau:
      Họ tên: ${officer.name}
      Chức vụ: ${officer.position}
      Đơn vị: ${officer.unitId}
      
      Dữ liệu điểm số các quý:
      ${sortedEvals.map(s => `Quý ${s.quarter}/${s.year}: ${s.score} điểm - Nhận xét: ${s.feedback}`).join('\n')}
      
      Hãy cung cấp báo cáo phân tích:
      1. Đánh giá xu hướng chung (Tăng trưởng/Ổn định/Suy giảm)
      2. Nhận diện các điểm sáng và các vấn đề cần lưu ý trong quá trình công tác.
      3. Phân tích nguyên nhân tiềm ẩn dựa trên các nhận xét.
      4. Đề xuất lộ trình bồi dưỡng hoặc giải pháp nâng cao hiệu quả cho cán bộ này.
      5. Dự báo khả năng hoàn thành nhiệm vụ trong các quý tiếp theo.
      
      Yêu cầu: Ngôn ngữ khách quan, xây dựng, mang tính khích lệ và định hướng phát triển.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setTrendAnalysisResult(response.text || 'Không thể phân tích dữ liệu.');
    } catch (error: any) {
      console.error('Trend Analysis Error:', error);
      setTrendAnalysisResult('Lỗi khi phân tích: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setIsAnalyzingTrend(false);
    }
  };

  const [isSuggestingFeedback, setIsSuggestingFeedback] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonOfficer, setComparisonOfficer] = useState<Officer | null>(null);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  const handleSuggestFeedback = async () => {
    if (!selectedOfficer || !user) return;
    setIsSuggestingFeedback(true);
    try {
      const prompt = `Bạn là chuyên gia nhân sự. Hãy gợi ý 3-5 câu nhận xét công tác chuyên nghiệp, khách quan và mang tính xây dựng cho cán bộ sau:
      Họ tên: ${selectedOfficer.name}
      Chức vụ: ${selectedOfficer.position}
      Điểm đánh giá hiện tại: ${currentScore}/100
      
      Yêu cầu:
      - Nếu điểm cao (>85): Khen ngợi sự nỗ lực, tính tiên phong, hoàn thành xuất sắc nhiệm vụ.
      - Nếu điểm trung bình (65-85): Ghi nhận sự ổn định, chỉ ra một vài điểm cần cải thiện nhẹ.
      - Nếu điểm thấp (<65): Nhận xét nghiêm túc nhưng mang tính định hướng, chỉ ra các lỗ hổng cần khắc phục ngay.
      - Ngôn ngữ: Trang trọng, đúng chuẩn văn phong công chức.
      - Trả về danh sách các câu nhận xét để người dùng chọn.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      const suggestion = response.text || 'Không thể gợi ý nhận xét.';
      setCurrentFeedback(prev => prev ? prev + '\n\n--- Gợi ý từ AI ---\n' + suggestion : suggestion);
      showToast("Đã thêm gợi ý nhận xét từ AI.", "success");
    } catch (error: any) {
      console.error('Suggest Feedback Error:', error);
      showToast("Lỗi khi gợi ý nhận xét: " + (error.message || 'Lỗi không xác định'), "error");
    } finally {
      setIsSuggestingFeedback(false);
    }
  };

  const handleCompareOfficers = async (officer1: Officer, officer2: Officer) => {
    if (!user) return;
    setIsAnalyzingTrend(true);
    setComparisonResult(null);
    try {
      // Fetch evaluations for both officers
      const [evals1Snap, evals2Snap] = await Promise.all([
        getDocs(query(collection(db, 'evaluations'), where('officerId', '==', officer1.id))),
        getDocs(query(collection(db, 'evaluations'), where('officerId', '==', officer2.id)))
      ]);
      
      const evals1 = evals1Snap.docs.map(d => d.data() as Evaluation);
      const evals2 = evals2Snap.docs.map(d => d.data() as Evaluation);

      const prompt = `Hãy thực hiện so sánh hiệu quả công tác giữa hai cán bộ sau:
      
      Cán bộ 1: ${officer1.name} (${officer1.position})
      Dữ liệu: ${evals1.map(e => `Q${e.quarter}/${e.year}: ${e.score}`).join(', ')}
      
      Cán bộ 2: ${officer2.name} (${officer2.position})
      Dữ liệu: ${evals2.map(e => `Q${e.quarter}/${e.year}: ${e.score}`).join(', ')}
      
      Yêu cầu báo cáo so sánh:
      1. So sánh điểm số trung bình và tính ổn định.
      2. Phân tích thế mạnh tương đối của từng người dựa trên chức vụ (nếu có thông tin).
      3. Đánh giá mức độ đóng góp tương quan cho đơn vị.
      4. Đề xuất cách thức phối hợp hoặc phân công công việc tối ưu giữa hai cán bộ này.
      
      Ngôn ngữ: Khách quan, công tâm, chuyên nghiệp.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setComparisonResult(response.text || 'Không thể so sánh dữ liệu.');
    } catch (error: any) {
      console.error('Comparison Error:', error);
      setComparisonResult('Lỗi khi so sánh: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setIsAnalyzingTrend(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // This is a placeholder, the actual showToast comes from props or context
    // But in this module it's not passed, so I'll use a local alert or just console
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // --- Data Loading ---
  useEffect(() => {
    setIndexError(null);
    const unsubscribeOfficers = onSnapshot(
      query(collection(db, 'officers'), orderBy('name', 'asc')),
      (snap) => {
        let loadedOfficers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Officer));
        
        // Filter by unit if not super admin
        if (!isSuperAdmin && unitId) {
          loadedOfficers = loadedOfficers.filter(o => o.unitId === unitId);
        }
        
        setOfficers(loadedOfficers);
        setIsLoading(false);
      },
      (err) => {
        if (err.message.includes('index')) {
          setIndexError("Yêu cầu tạo Index cho 'officers' hoặc 'evaluations'.");
        }
        handleFirestoreError(err, OperationType.LIST, 'officers');
      }
    );

    const unsubscribeEvaluations = onSnapshot(
      query(collection(db, 'evaluations'), where('year', '==', selectedYear)),
      (snap) => {
        const allEvals = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
        setEvaluations(allEvals.filter(e => e.quarter === selectedQuarter));
      },
      (err) => {
        if (err.message.includes('index')) {
          setIndexError("Yêu cầu tạo Index cho 'evaluations'.");
        }
        handleFirestoreError(err, OperationType.LIST, 'evaluations');
      }
    );

    return () => {
      unsubscribeOfficers();
      unsubscribeEvaluations();
    };
  }, [isSuperAdmin, unitId, selectedYear, selectedQuarter]);

  // --- Sync evaluation data when evaluations or selected officer change ---
  useEffect(() => {
    if (selectedOfficer) {
      const evalRecord = evaluations.find(e => e.officerId === selectedOfficer.id);
      if (evalRecord) {
        setCurrentScore(evalRecord.score);
        setCurrentFeedback(evalRecord.feedback || '');
      } else {
        setCurrentScore(0);
        setCurrentFeedback('');
      }
    }
  }, [evaluations, selectedOfficer]);

  // --- Handlers ---
  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(' ') + '\n';
      }

      const prompt = `Trích xuất danh sách cán bộ từ văn bản sau. Trả về định dạng JSON array, mỗi object có các trường: name (Họ và tên), gender (Giới tính), dob (Ngày sinh), cccd (CCCD), position (Chức vụ). Nếu không có thông tin, để chuỗi rỗng. Không trả về markdown, chỉ trả về mảng JSON.\n\nVăn bản:\n${text}`;
      
      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const jsonStr = response.text.trim();
      const officersList = JSON.parse(jsonStr);

      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      for (const officer of officersList) {
        const newOfficerRef = doc(collection(db, 'officers'));
        batch.set(newOfficerRef, {
          name: officer.name || '',
          gender: officer.gender || '',
          dob: officer.dob || '',
          cccd: officer.cccd || '',
          position: officer.position || '',
          unitId: unitId || 'VP',
          authorUid: user.uid,
          createdAt: Timestamp.now()
        });
      }
      
      await batch.commit();
      
      alert('Đã nạp danh sách cán bộ thành công!');
    } catch (error) {
      console.error('Error parsing PDF:', error);
      alert('Có lỗi xảy ra khi nạp file PDF.');
    } finally {
      setIsUploadingPdf(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveOfficer = async (data: any) => {
    if (!user) return;
    try {
      if (editingOfficer) {
        await updateDoc(doc(db, 'officers', editingOfficer.id), {
          ...data,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'officers'), {
          ...data,
          authorUid: user.uid,
          createdAt: Timestamp.now()
        });
      }
      setIsFormOpen(false);
      setEditingOfficer(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'officers');
    }
  };

  const handleDeleteOfficer = async () => {
    if (!officerToDelete) return;
    try {
      await deleteDoc(doc(db, 'officers', officerToDelete));
      if (selectedOfficer?.id === officerToDelete) setSelectedOfficer(null);
      setIsDeleteModalOpen(false);
      setOfficerToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'officers');
    }
  };

  const confirmDelete = useCallback((id: string) => {
    setOfficerToDelete(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSelectOfficer = useCallback((officer: Officer) => {
    setSelectedOfficer(officer);
    const evalRecord = evaluations.find(e => e.officerId === officer.id);
    if (evalRecord) {
      setCurrentScore(evalRecord.score);
      setCurrentFeedback(evalRecord.feedback || '');
    } else {
      setCurrentScore(0);
      setCurrentFeedback('');
    }
    setIsEditing(false);
  }, [evaluations]);

  const handleSaveEvaluation = async () => {
    if (!selectedOfficer || !user) return;
    setIsSaving(true);
    try {
      const existingEval = evaluations.find(e => e.officerId === selectedOfficer.id);
      
      if (existingEval) {
        await updateDoc(doc(db, 'evaluations', existingEval.id), {
          score: currentScore,
          feedback: currentFeedback,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'evaluations'), {
          officerId: selectedOfficer.id,
          quarter: selectedQuarter,
          year: selectedYear,
          score: currentScore,
          feedback: currentFeedback,
          authorUid: user.uid,
          createdAt: Timestamp.now()
        });
      }
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'evaluations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOfficer = useCallback((officer: Officer) => {
    setEditingOfficer(officer);
    setIsFormOpen(true);
  }, []);

  const handleDeleteOfficerClick = useCallback((id: string) => {
    setOfficerToDelete(id);
    setIsDeleteModalOpen(true);
  }, []);

  // --- Memos ---
  const filteredOfficers = useMemo(() => {
    return officers.filter(o => 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [officers, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: officers.length,
      evaluated: evaluations.length,
      pending: officers.length - evaluations.length,
      avgScore: evaluations.length > 0 
        ? Math.round(evaluations.reduce((acc, e) => acc + e.score, 0) / evaluations.length) 
        : 0
    };
  }, [officers, evaluations]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-emerald-600" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Đang tải dữ liệu cán bộ...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      {indexError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-1">Yêu cầu cấu hình Firestore</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {indexError} Vui lòng kiểm tra console để lấy link tạo Index.
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CheckCircle className="text-emerald-600" size={32} />
            Đánh giá Cán bộ Định kỳ
          </h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý và ghi nhận kết quả công tác hàng quý</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2 bg-slate-50 border-r border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quý</div>
            <select 
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none appearance-none cursor-pointer"
            >
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <div className="px-3 py-2 bg-slate-50 border-l border-r border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">Năm</div>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none appearance-none cursor-pointer"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(isAdmin || isSuperAdmin) && (
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept=".pdf" 
                id="pdf-upload" 
                className="hidden" 
                onChange={handleUploadPdf} 
                disabled={isUploadingPdf}
              />
              <label 
                htmlFor="pdf-upload"
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isUploadingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                Nạp từ PDF
              </label>
              <button 
                onClick={() => { setEditingOfficer(null); setIsFormOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                <Plus size={18} />
                Thêm cán bộ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Tổng số cán bộ" value={stats.total} color="text-blue-600" bgColor="bg-blue-50" />
        <StatCard icon={CheckCircle} label="Đã đánh giá" value={stats.evaluated} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={Clock} label="Chưa đánh giá" value={stats.pending} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard icon={TrendingUp} label="Điểm TB Quý" value={stats.avgScore} color="text-purple-600" bgColor="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Officer List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Tìm kiếm cán bộ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Cán bộ</th>
                    <th className="px-6 py-3">Đơn vị</th>
                    <th className="px-6 py-3">Điểm</th>
                    <th className="px-6 py-3">Trạng thái</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfficers.map(o => (
                    <OfficerRow 
                      key={o.id} 
                      officer={o} 
                      evaluation={evaluations.find(e => e.officerId === o.id)}
                      onSelect={handleSelectOfficer}
                      onEdit={handleEditOfficer}
                      onDelete={confirmDelete}
                      canManage={isAdmin || isSuperAdmin}
                    />
                  ))}
                  {filteredOfficers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        Không tìm thấy cán bộ nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Evaluation Details */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedOfficer ? (
              <motion.div 
                key={selectedOfficer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6"
              >
                {/* Profile Header */}
                <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black border border-white/20">
                      {selectedOfficer.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black">{selectedOfficer.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1 opacity-70 text-[10px] font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Building size={12} /> {selectedOfficer.unitId}</span>
                        <span className="flex items-center gap-1"><Briefcase size={12} /> {selectedOfficer.position}</span>
                        {selectedOfficer.gender && <span className="flex items-center gap-1"><User size={12} /> {selectedOfficer.gender}</span>}
                        {selectedOfficer.dob && <span className="flex items-center gap-1"><Calendar size={12} /> {selectedOfficer.dob}</span>}
                        {selectedOfficer.cccd && <span className="flex items-center gap-1"><FileText size={12} /> {selectedOfficer.cccd}</span>}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOfficer(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Evaluation Content */}
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Award size={18} className="text-emerald-600" />
                      Kết quả đánh giá Quý {selectedQuarter}/{selectedYear}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsComparing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                      >
                        <Users size={14} />
                        So sánh
                      </button>
                      <button 
                        onClick={() => handleTrendAnalysis(selectedOfficer)}
                        disabled={isAnalyzingTrend}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-50"
                      >
                        {isAnalyzingTrend ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                        Phân tích xu hướng AI
                      </button>
                      {!isEditing && (isAdmin || isSuperAdmin) && (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                        >
                          <Edit2 size={14} />
                          Ghi nhận đánh giá
                        </button>
                      )}
                    </div>
                  </div>

                  {trendAnalysisResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <TrendingUp size={18} />
                          <h4 className="text-sm font-bold uppercase tracking-wider">Phân tích xu hướng AI</h4>
                        </div>
                        <button 
                          onClick={() => setTrendAnalysisResult(null)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                        >
                          Đóng phân tích
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none prose-emerald">
                        {trendAnalysisResult}
                      </div>
                    </motion.div>
                  )}

                  {comparisonResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Users size={18} />
                          <h4 className="text-sm font-bold uppercase tracking-wider">Kết quả so sánh AI</h4>
                        </div>
                        <button 
                          onClick={() => setComparisonResult(null)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                        >
                          Đóng so sánh
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none prose-blue">
                        {comparisonResult}
                      </div>
                    </motion.div>
                  )}

                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Điểm đánh giá (0-100)</label>
                          <span className="text-2xl font-black text-emerald-600">{currentScore}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={currentScore} 
                          onChange={(e) => setCurrentScore(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          <span>0 - Yếu</span>
                          <span>50 - Trung bình</span>
                          <span>70 - Khá</span>
                          <span>85 - Tốt</span>
                          <span>100 - Xuất sắc</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nhận xét & Phản hồi</label>
                          <button 
                            onClick={handleSuggestFeedback}
                            disabled={isSuggestingFeedback}
                            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                          >
                            {isSuggestingFeedback ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                            AI Gợi ý nhận xét
                          </button>
                        </div>
                        <textarea 
                          value={currentFeedback}
                          onChange={(e) => setCurrentFeedback(e.target.value)}
                          placeholder="Nhập nhận xét chi tiết về ưu điểm, khuyết điểm trong quý..."
                          rows={5}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                        >
                          Hủy bỏ
                        </button>
                        <button 
                          onClick={handleSaveEvaluation}
                          disabled={isSaving}
                          className="flex-1 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                          Lưu kết quả
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm số</p>
                          <p className="text-4xl font-black text-slate-900">{currentScore || '--'}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Xếp loại</p>
                          <p className={cn("text-xl font-black", 
                            currentScore >= 90 ? 'text-emerald-600' : 
                            currentScore >= 80 ? 'text-blue-600' : 
                            currentScore >= 65 ? 'text-amber-600' : 
                            currentScore > 0 ? 'text-rose-600' : 'text-slate-300'
                          )}>
                            {currentScore >= 90 ? 'Xuất sắc' : 
                             currentScore >= 80 ? 'Tốt' : 
                             currentScore >= 65 ? 'Khá' : 
                             currentScore > 0 ? 'Trung bình/Yếu' : 'Chưa xếp loại'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nhận xét chi tiết</label>
                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-600 italic leading-relaxed">
                          {currentFeedback || 'Chưa có nhận xét cho quý này.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-6">
                <div className="p-8 bg-white rounded-full shadow-2xl shadow-slate-200/50">
                  <User size={64} className="text-slate-200" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-xl font-black text-slate-900">Chọn cán bộ đánh giá</h3>
                  <p className="text-sm text-slate-500 font-medium mt-2">Vui lòng chọn một cán bộ từ danh sách bên trái để xem lịch sử và thực hiện đánh giá định kỳ.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <OfficerForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingOfficer(null); }} 
        onSave={handleSaveOfficer}
        initialData={editingOfficer}
        defaultUnitId={unitId}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isComparing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">Chọn cán bộ để so sánh</h3>
                <button onClick={() => setIsComparing(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {officers.filter(o => o.id !== selectedOfficer?.id).map(o => (
                  <button
                    key={o.id}
                    onClick={() => {
                      handleCompareOfficers(selectedOfficer!, o);
                      setIsComparing(false);
                    }}
                    className="w-full p-4 text-left bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-2xl transition-all group"
                  >
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700">{o.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{o.position} - {o.unitId}</div>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsComparing(false)}
                className="w-full mt-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
            </motion.div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Xác nhận xóa?</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">
                Bạn có chắc chắn muốn xóa cán bộ này? Mọi dữ liệu đánh giá liên quan sẽ không thể truy cập.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleDeleteOfficer}
                  className="flex-1 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
