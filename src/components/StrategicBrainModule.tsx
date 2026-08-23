import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Sparkles, 
  Search, 
  Link2, 
  Check, 
  ChevronRight, 
  AlertTriangle, 
  Rocket, 
  BookOpen, 
  Send,
  Loader2,
  FileText,
  Workflow,
  Compass,
  Layers,
  Activity,
  Award,
  Zap,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Flame,
  BookmarkCheck,
  Sliders,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { Task, Meeting } from '../constants';
import { generateContentWithRetry } from '../lib/ai-utils';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import Markdown from 'react-markdown';
import { useMainBrain, EvolvingWisdomItem } from '../context/MainBrainContext';

interface StrategicBrainModuleProps {
  tasks: Task[];
  aiKnowledge: any[];
  meetings?: Meeting[];
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const StrategicBrainModule: React.FC<StrategicBrainModuleProps> = ({
  tasks,
  aiKnowledge,
  meetings = [],
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'wisdom' | 'proactive' | 'console' | 'stresstest' | 'radar'>('wisdom');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [brainResponse, setBrainResponse] = useState<string | null>(null);
  const [approvedLinks, setApprovedLinks] = useState<string[]>([]);
  const [kpiEntries, setKpiEntries] = useState<any[]>([]);
  const [reasoningDepth, setReasoningDepth] = useState<'tactical' | 'cot' | 'strategic' | 'multi_agent'>('multi_agent');
  const [selectedMapNode, setSelectedMapNode] = useState<string | null>('brain');

  // Scenario Stress Testing State
  const [customScenario, setCustomScenario] = useState('');
  const [selectedPresetScenario, setSelectedPresetScenario] = useState<string | null>(null);
  const [scenarioResponse, setScenarioResponse] = useState<string | null>(null);
  const [isSimulatingScenario, setIsSimulatingScenario] = useState(false);

  // Main Brain Cognitive Memory Hook
  const {
    evolvingWisdom,
    isConsolidating,
    consolidationProgress,
    cognitiveMetrics,
    consolidateAndEvolveMemory,
    addCustomWisdom,
    deleteWisdomItem
  } = useMainBrain();

  const [wisdomCategoryFilter, setWisdomCategoryFilter] = useState<string>('all');
  const [isAddingWisdom, setIsAddingWisdom] = useState(false);
  const [newWisdomForm, setNewWisdomForm] = useState({
    title: '',
    insight: '',
    actionableGuideline: '',
    category: 'operational_principle' as any,
    tags: ''
  });

  // Đồng bộ thời gian thực các chỉ tiêu KPI từ Firestore
  useEffect(() => {
    const q = query(collection(db, 'task_journals'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setKpiEntries(data);
    }, (error) => {
      console.error("Lỗi đồng bộ KPI trong Bộ não Chiến lược:", error);
    });
    return () => unsubscribe();
  }, []);
  
  // Trợ lý thông tin mẫu nếu không có kết quả
  const quickPrompts = [
    {
      label: "🏛️ Thẩm định Thể thức & Pháp quy Đảng",
      prompt: "Hãy thẩm định tính tuân thủ pháp quy của toàn bộ kế hoạch công tác và nhiệm vụ văn phòng dựa theo Quy định 66-QĐ/TW. Chỉ ra các lỗi thể thức hoặc thẩm quyền ban hành cần điều chỉnh."
    },
    {
      label: "📊 Phân tích Rủi ro KPI & Tiến độ",
      prompt: "Hãy đối chiếu toàn bộ các đầu việc đang triển khai với các chỉ tiêu KPI của Văn phòng Quý II/2026. Chỉ rõ chỉ tiêu nào có nguy cơ bị chậm, nguyên nhân cốt lõi và đề xuất 3 giải pháp tham mưu đột phá cho Chánh Văn phòng."
    },
    {
      label: "🧪 Mô phỏng Kịch bản Tình huống Khẩn (24h)",
      prompt: "Mô phỏng tình huống: Thường trực Đảng ủy chỉ đạo đột xuất soạn thảo Tờ trình khẩn trong 24h tới. Hãy thiết lập Kế hoạch tác chiến 3 bước: Phân công nhân sự, Lộ trình thẩm định văn bản và Ma trận quản trị rủi ro."
    },
    {
      label: "📝 Dự thảo Thông báo Kết luận & Phân công",
      prompt: "Soạn thảo dự thảo Thông báo Kết luận cuộc họp Thường trực Đảng ủy gần nhất, tự động trích xuất các nhiệm vụ trọng tâm và phân công cán bộ phụ trách kèm mốc thời gian hoàn thành."
    }
  ];

  // Thuật toán tự động kết nối tri thức 3 chiều (Tasks ↔ Knowledge ↔ KPI)
  const knowledgeLinks = useMemo(() => {
    if (!tasks || !aiKnowledge) return [];
    
    const links: any[] = [];
    const keywordMap: { [key: string]: string[] } = {
      'đại hội': ['đại hội', 'chi bộ', 'bầu cử', 'nhân sự', 'đại biểu'],
      'tài sản': ['kê khai', 'tài sản', 'thu nhập', 'minh bạch', 'tài chính'],
      'học tập': ['học tập', 'làm theo', 'tư tưởng', 'đạo đức', 'hồ chí minh', 'chuyên đề'],
      'chỉ thị': ['chỉ thị', 'văn bản', 'triển khai', 'quán triệt', 'kế hoạch'],
      'nghị quyết': ['nghị quyết', 'chi bộ', 'đảng bộ', 'chương trình hành động', 'sinh hoạt'],
      'kiểm tra': ['kiểm tra', 'giám sát', 'kỷ luật', 'đảng viên', 'đảng ủy'],
      'văn phòng': ['văn phòng', 'tham mưu', 'tổng hợp', 'hành chính', 'báo cáo'],
    };

    // Tối ưu hóa hiệu năng: Lọc trước tập dữ liệu để tránh quá tải Main Thread khi dữ liệu lớn
    const activeTasks = tasks.filter(task => task.status !== 'Completed').slice(0, 15);
    const activeKnowledge = aiKnowledge.slice(0, 20);

    activeTasks.forEach(task => {
      const taskTitleLower = task.title.toLowerCase();
      const taskDescLower = (task.description || '').toLowerCase();

      activeKnowledge.forEach(knowledge => {
        const knowledgeTitleLower = (knowledge.title || '').toLowerCase();
        const knowledgeContentLower = (knowledge.content || '').toLowerCase();
        
        let matchScore = 0;
        let matchedKeywords: string[] = [];

        Object.entries(keywordMap).forEach(([key, synonyms]) => {
          const hasTaskMatch = synonyms.some(s => taskTitleLower.includes(s) || taskDescLower.includes(s));
          const hasKnowledgeMatch = synonyms.some(s => knowledgeTitleLower.includes(s) || knowledgeContentLower.includes(s));
          
          if (hasTaskMatch && hasKnowledgeMatch) {
            matchScore += 3;
            matchedKeywords.push(key.toUpperCase());
          }
        });

        if (matchScore > 0) {
          // Khớp với chỉ tiêu KPI thực tế
          const matchedKpi = kpiEntries.find(kpi => {
            const kpiTitleLower = (kpi.title || '').toLowerCase();
            return matchedKeywords.some(kw => kpiTitleLower.includes(kw.toLowerCase())) ||
                   keywordMap[matchedKeywords[0]?.toLowerCase()]?.some(syn => kpiTitleLower.includes(syn));
          });

          links.push({
            id: `${task.id}-${knowledge.id}-${matchedKpi?.id || 'none'}`,
            task,
            knowledge,
            kpi: matchedKpi || null,
            score: matchScore + (matchedKpi ? 2 : 0),
            reason: `Phát hiện giao thoa chủ đề chuyên môn: ${matchedKeywords.join(', ')}.${matchedKpi ? ` Khớp trực tiếp với Chỉ tiêu KPI: "${matchedKpi.title}"` : ''}`,
            status: 'pending'
          });
        }
      });
    });

    return links.sort((a, b) => b.score - a.score).slice(0, 4);
  }, [tasks, aiKnowledge, kpiEntries]);

  const handleApproveLink = (linkId: string, taskTitle: string, docTitle: string, kpiTitle?: string) => {
    setApprovedLinks(prev => [...prev, linkId]);
    showToast(`Đã ghi nhận kết nối tri thức: "${taskTitle}" ↔ "${docTitle}"${kpiTitle ? ` ↔ Chỉ tiêu KPI: "${kpiTitle}"` : ''}`, "success");
  };

  const handleRunPrompt = async (promptText: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setBrainResponse(null);

    const taskBrief = tasks.slice(0, 10).map(t => `- ${t.title} (${t.status}, Hạn: ${t.deadline || 'Không rõ'})`).join('\n');
    const knowledgeBrief = aiKnowledge.slice(0, 8).map(k => `- [${k.category}] ${k.title}: ${k.content.substring(0, 120)}...`).join('\n');
    const meetingsBrief = meetings.slice(0, 5).map(m => `- ${m.time} ${m.date}: ${m.name}`).join('\n');
    const kpiBrief = kpiEntries.length > 0 
      ? kpiEntries.slice(0, 10).map(k => `- Chỉ tiêu KPI: "${k.title}" | Tiến độ: ${k.progressPercent || 0}% | Chất lượng: ${k.qualityPercent || 0}% | Loại: ${k.workType === 'regular' ? 'Thường kỳ' : 'Đột xuất'}`).join('\n')
      : "- (Chưa nạp hoặc không tìm thấy chỉ số KPI trong hệ thống)";

    let reasoningGuideline = "";
    if (reasoningDepth === 'tactical') {
      reasoningGuideline = "HÃY PHÂN TÍCH NHANH (MỨC ĐỘ TÁC CHIẾN): Tập trung đưa ra các quyết định hành động lập tức, chỉ rõ cán bộ phụ trách, mốc thời gian hoàn thành cụ thể.";
    } else if (reasoningDepth === 'cot') {
      reasoningGuideline = "HÃY SỬ DỤNG PHƯƠNG PHÁP SUY LUẬN TỪNG BƯỚC (CHAIN-OF-THOUGHT):\nBước 1: Phân tích bối cảnh chung, đối chiếu tính tuân thủ pháp quy và các văn bản chỉ đạo của Đảng ủy cấp trên.\nBước 2: Xem xét trực tiếp ảnh hưởng đến các chỉ tiêu điểm số KPI của Văn phòng.\nBước 3: Dự báo các điểm nghẽn, lỗ hổng phối hợp hoặc nguy cơ trễ hạn.\nBước 4: Thiết lập phương án tham mưu chi tiết, có luận chứng sắc sảo.";
    } else if (reasoningDepth === 'strategic') {
      reasoningGuideline = "HÃY ÁP DỤNG TẦM NHÌN CHIẾN LƯỢC TOÀN CẢNH: Định vị mục tiêu trong lộ trình số hóa và quản trị tri thức của Đảng bộ. Đề xuất quy trình chuẩn hóa, kiến trúc kết nối thông tin đa chiều và cơ chế giám sát rủi ro tự động.";
    } else {
      reasoningGuideline = "HÃY KÍCH HOẠT ĐỘNG CƠ TƯ DUY ĐA ĐẶC NHIỆM (MULTI-AGENT COGNITIVE DEBATE & SYNTHESIS):\nHệ thống hãy đóng vai 3 Chuyên gia AI Tham mưu phản biện độc lập:\n1. 🏛️ Agent 1 (Chuyên gia Pháp quy & Thể thức Đảng): Thẩm định tính hợp hiến, hợp pháp, Quy định 66-QĐ/TW và Quy chế làm việc.\n2. 📊 Agent 2 (Thám tử Quản trị Tiến độ & KPI): Bóc tách nguy cơ trễ hạn, rủi ro KPI, lỗ hổng phối hợp cán bộ.\n3. 🚀 Agent 3 (Chuyên gia Chuyển đổi số & Tác chiến): Đề xuất quy trình số hóa, tối ưu biểu mẫu, tự động hóa phản hồi.\n4. ⚖️ TỔNG HỢP MA TRẬN QUYẾT ĐỊNH TỐI ƯU CHO CHÁNH VĂN PHÒNG NGUYỄN MINH HUY (Gồm: Đề xuất phương án tối ưu, Kịch bản dự phòng, Phân công công tác & Mốc thời gian).";
    }

    const fullPrompt = `Bạn là Trợ lý Chánh văn phòng chuyên trách về AI và Quản trị tri thức cho cơ quan Đảng ủy.
Người dùng là Nguyễn Minh Huy - Chánh Văn phòng Đảng ủy.
Xưng hô trang trọng: "Chánh Văn phòng", "Đồng chí", "Anh Huy". Văn văn phải súc tích, chuyên nghiệp, chính xác theo phong cách tham mưu văn phòng, lập luận sắc sảo, có tầm nhìn chiến lược.

Dưới đây là Bối cảnh thời gian thực của văn phòng:
DANH SÁCH NHIỆM VỤ ĐANG TRIỂN KHAI:
${taskBrief}

HỆ THỐNG KIẾN THỨC & VĂN BẢN CHỈ ĐẠO:
${knowledgeBrief}

LỊCH HỌP SẮP TỚI:
${meetingsBrief}

CHỈ TIÊU KPI CHỨC DANH HIỆN TẠI (Đồng bộ thời gian thực):
${kpiBrief}

YÊU CẦU CỦA CHÁNH VĂN PHÒNG:
"${promptText}"

CHỈ DẪN SUY LUẬN CỦA HỆ THỐNG:
${reasoningGuideline}

Hãy phân tích cực kỳ sâu sắc, đưa ra giải pháp thực tế, bám sát các văn bản chỉ đạo hiện có và đề xuất liên kết tri thức (Knowledge Linking) rõ ràng để giúp cơ quan xử lý nhanh và chính xác nhất. Trả về định dạng Markdown chuyên nghiệp.`;

    try {
      const result = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      });

      const text = result?.text || "Không tìm thấy phản hồi từ bộ não AI.";
      setBrainResponse(text);
    } catch (e) {
      console.error(e);
      showToast("Lỗi phân tích từ Bộ não thông minh.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTriggerConsolidation = async () => {
    try {
      showToast("Đang kích hoạt quy trình Tiến hóa Bộ não & Đúc kết Tri thức...", "info");
      const res = await consolidateAndEvolveMemory({
        tasks,
        knowledge: aiKnowledge,
        meetings,
        kpis: kpiEntries
      });
      showToast(res.summary, "success");
    } catch (e: any) {
      console.error(e);
      showToast("Lỗi trong quá trình tiến hóa bộ não. Vui lòng thử lại.", "error");
    }
  };

  const handleRunStressTest = async (scenarioText: string) => {
    if (isSimulatingScenario) return;
    setIsSimulatingScenario(true);
    setScenarioResponse(null);

    const taskBrief = tasks.slice(0, 10).map(t => `- ${t.title} (${t.status}, Hạn: ${t.deadline || 'Không rõ'})`).join('\n');
    const kpiBrief = kpiEntries.length > 0 
      ? kpiEntries.slice(0, 10).map(k => `- KPI: "${k.title}" (${k.progressPercent || 0}%)`).join('\n')
      : "- (Chưa có)";

    const fullPrompt = `Bạn là Trợ lý Chánh văn phòng chuyên trách về AI và Quản trị tri thức cho cơ quan Đảng ủy.
Người dùng là Nguyễn Minh Huy - Chánh Văn phòng Đảng ủy.
Xưng hô trang trọng: "Chánh Văn phòng", "Đồng chí", "Anh Huy".

MÔ PHỎNG & XỬ LÝ TÌNH HUỐNG GIẢ ĐỊNH KHẨN:
"${scenarioText}"

DỮ LIỆU HIỆN TẠI CỦA VĂN PHÒNG:
NHIỆM VỤ:
${taskBrief}
KPI CHỨC DANH:
${kpiBrief}

YÊU CẦU MÔ PHỎNG TÁC CHIẾN (SCENARIO STRESS TEST):
1. 🔴 ĐÁNH GIÁ MỨC ĐỘ RỦI RO & TÁC ĐỘNG: Phân tích mức độ ảnh hưởng đến tiến độ, pháp quy và chỉ tiêu KPI.
2. ⚡ PHƯƠNG ÁN PHẢN ỨNG NHANH 3 BƯỚC (RESOURCE & ACTION MATRIX):
   - Bước 1 (0 - 4h): Tái phân bổ lực lượng khẩn cấp, khoanh vùng điểm nghẽn.
   - Bước 2 (4 - 12h): Soạn thảo, thẩm định thể thức và trình Thường trực.
   - Bước 3 (12 - 24h): Phát hành văn bản, giám sát tiến độ hoàn tất.
3. 🏛️ BẢNG DỰ THẢO VĂN BẢN / TỜ TRÌNH ĐỀ XUẤT (Khung nội dung sẵn sàng phát hành).

Trình bày bằng Markdown chuyên nghiệp, súc tích và sắc bén.`;

    try {
      const result = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      });
      setScenarioResponse(result?.text || "Không tạo được kịch bản.");
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi mô phỏng kịch bản khẩn.", "error");
    } finally {
      setIsSimulatingScenario(false);
    }
  };

  const presetScenarios = [
    {
      title: "🚨 Thường trực Đảng ủy yêu cầu Tờ trình khẩn trong 12h",
      desc: "Phát sinh nhiệm vụ đột xuất cấp bách trình Thường trực về công tác nhân sự/kiểm tra.",
      scenario: "Thường trực Đảng ủy chỉ đạo đột xuất Văn phòng lập Tờ trình và dự thảo Nghị quyết trình gấp trong 12 giờ tới. Hãy lập kế hoạch tác chiến 3 bước và khung tờ trình khẩn."
    },
    {
      title: "⚠️ 2 Chỉ tiêu KPI có nguy cơ rớt điểm vào cuối tháng",
      desc: "Đã quá 70% thời gian nhưng chỉ tiêu 'Chuyển đổi số văn bản' mới đạt 40%.",
      scenario: "Chỉ tiêu KPI 'Chuyển đổi số văn bản Đảng' và 'Thẩm định nghị quyết chi bộ' đang chậm 30% so với kế hoạch. Hãy đề xuất giải pháp đột phá tháo gỡ điểm nghẽn trong 5 ngày."
    },
    {
      title: "📅 Trùng lịch họp Ban Thường vụ & Đoàn kiểm tra cấp trên",
      desc: "Lịch họp trùng giờ, lực lượng cán bộ văn phòng mỏng.",
      scenario: "Chiều thứ 5 phát sinh đồng thời 2 sự kiện: Cuộc họp Ban Thường vụ Đảng ủy và Buổi làm việc với Đoàn kiểm tra Tỉnh ủy. Hãy phân bổ nhân sự và kịch bản hậu cần."
    },
    {
      title: "🏛️ Tổng rà soát thể thức văn bản theo Quy định 66-QĐ/TW",
      desc: "Phát hiện một số văn bản chi bộ ban hành chưa đúng thẩm quyền ký.",
      scenario: "Cần kiểm tra nhanh toàn bộ thể thức 15 văn bản vừa ban hành của các chi bộ trực thuộc để chỉnh sửa theo Quy định 66-QĐ/TW. Hãy đề xuất quy trình tự động hóa kiểm định."
    }
  ];

  const handleSaveCustomWisdom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWisdomForm.title.trim() || !newWisdomForm.insight.trim() || !newWisdomForm.actionableGuideline.trim()) {
      showToast("Vui lòng nhập đầy đủ tiêu đề, nguyên lý đúc kết và chỉ dẫn hành động!", "warning");
      return;
    }

    try {
      await addCustomWisdom({
        title: newWisdomForm.title.trim(),
        insight: newWisdomForm.insight.trim(),
        actionableGuideline: newWisdomForm.actionableGuideline.trim(),
        category: newWisdomForm.category,
        tags: newWisdomForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      showToast("Đã bổ sung nguyên tắc điều hành mới vào Bộ não!", "success");
      setNewWisdomForm({
        title: '',
        insight: '',
        actionableGuideline: '',
        category: 'operational_principle',
        tags: ''
      });
      setIsAddingWisdom(false);
    } catch (e) {
      showToast("Lỗi khi thêm nguyên tắc điều hành.", "error");
    }
  };

  const filteredWisdom = useMemo(() => {
    if (wisdomCategoryFilter === 'all') return evolvingWisdom;
    return evolvingWisdom.filter(w => w.category === wisdomCategoryFilter);
  }, [evolvingWisdom, wisdomCategoryFilter]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'executive_habit':
        return { label: 'Phong cách Lãnh đạo', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'operational_principle':
        return { label: 'Nguyên tắc Điều hành', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' };
      case 'policy_guideline':
        return { label: 'Thể thức & Pháp quy', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'strategic_directive':
        return { label: 'Chỉ đạo Chiến lược', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
      default:
        return { label: 'Liên kết Tri thức', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' };
    }
  };

  return (
    <div className="xl:col-span-12 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 md:p-8 border border-slate-800 shadow-2xl">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
            <BrainCircuit size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-900/40 border border-indigo-500/40 text-[9px] font-black uppercase tracking-widest text-indigo-300 rounded-full">Elite Engine 8.0 CoT</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight italic text-slate-100 mt-1">BỘ NÃO CHIẾN LƯỢC TOÀN DIỆN</h3>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0 gap-1">
          <button 
            onClick={() => setActiveTab('wisdom')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'wisdom' ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Cpu size={14} className={activeTab === 'wisdom' ? 'animate-spin' : ''} />
            <span>Tiến Hóa Bộ Não (IQ {cognitiveMetrics.brainIQ})</span>
            <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded text-[9px] font-bold">
              {evolvingWisdom.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('proactive')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'proactive' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Zap size={14} className="text-amber-400 animate-bounce" />
            <span>Cảnh Báo Chủ Động</span>
          </button>
          <button 
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'console' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Compass size={14} />
            <span>AI Console & CoT</span>
          </button>
          <button 
            onClick={() => setActiveTab('stresstest')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'stresstest' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <AlertTriangle size={14} className="text-rose-400" />
            <span>Mô Phỏng Kịch Bản Khẩn</span>
          </button>
          <button 
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'radar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Workflow size={14} />
            <span>Radar Kết Nối KPI</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="py-6 min-h-[250px] relative z-10">
        <AnimatePresence mode="wait">
          
          {/* Wisdom & Self-Evolving Intelligence Tab */}
          {activeTab === 'wisdom' && (
            <motion.div
              key="wisdom"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Cognitive Scorecard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Brain IQ */}
                <div className="p-5 bg-gradient-to-br from-indigo-950/60 to-slate-950/80 rounded-2xl border border-indigo-500/30 relative overflow-hidden shadow-lg group hover:border-indigo-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Cpu size={14} className="text-indigo-400" />
                      Chỉ số IQ Bộ não
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded-full">
                      Tự tiến hóa
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">{cognitiveMetrics.brainIQ}</span>
                    <span className="text-xs text-indigo-400 font-bold">/ 200 Điểm</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">
                    Độ nhạy bén tham mưu & học hỏi đa chu kỳ
                  </p>
                </div>

                {/* Metric 2: Wisdom Items */}
                <div className="p-5 bg-gradient-to-br from-amber-950/40 to-slate-950/80 rounded-2xl border border-amber-500/30 relative overflow-hidden shadow-lg group hover:border-amber-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <BookmarkCheck size={14} className="text-amber-400" />
                      Bài học & Nguyên tắc
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold rounded-full">
                      Đã đúc kết
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">{cognitiveMetrics.totalWisdomCount}</span>
                    <span className="text-xs text-amber-400 font-bold">Quy luật</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">
                    Áp dụng tự động trong mọi văn bản & phản hồi
                  </p>
                </div>

                {/* Metric 3: Cross-domain Links */}
                <div className="p-5 bg-gradient-to-br from-cyan-950/40 to-slate-950/80 rounded-2xl border border-cyan-500/30 relative overflow-hidden shadow-lg group hover:border-cyan-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Workflow size={14} className="text-cyan-400" />
                      Liên kết Tri thức
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold rounded-full">
                      Đa chiều
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">{cognitiveMetrics.totalCrossLinks}</span>
                    <span className="text-xs text-cyan-400 font-bold">Mối nối</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">
                    Nhiệm vụ ↔ Văn bản Đảng ↔ KPI ↔ Lịch công tác
                  </p>
                </div>

                {/* Metric 4: Memory Integrity */}
                <div className="p-5 bg-gradient-to-br from-emerald-950/40 to-slate-950/80 rounded-2xl border border-emerald-500/30 relative overflow-hidden shadow-lg group hover:border-emerald-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Độ Toàn vẹn Bộ nhớ
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded-full">
                      Bảo mật
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">{cognitiveMetrics.memoryIntegrityScore}%</span>
                    <span className="text-xs text-emerald-400 font-bold">Chuẩn hóa</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">
                    Đồng bộ thời gian thực IndexedDB & Firestore
                  </p>
                </div>
              </div>

              {/* Action and Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                {/* Category Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'executive_habit', label: 'Phong cách Lãnh đạo' },
                    { id: 'operational_principle', label: 'Nguyên tắc Điều hành' },
                    { id: 'policy_guideline', label: 'Thể thức & Pháp quy' },
                    { id: 'strategic_directive', label: 'Chỉ đạo Chiến lược' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setWisdomCategoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        wisdomCategoryFilter === tab.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Evolution Trigger & Add Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsAddingWisdom(!isAddingWisdom)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus size={14} />
                    <span>Thêm Nguyên tắc</span>
                  </button>

                  <button
                    onClick={handleTriggerConsolidation}
                    disabled={isConsolidating}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 active:scale-95"
                  >
                    {isConsolidating ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <Sparkles size={14} className="text-amber-200" />
                    )}
                    <span>{isConsolidating ? 'Đang Tiến Hóa...' : 'Tiến Hóa Bộ Não (Deep AI)'}</span>
                  </button>
                </div>
              </div>

              {/* Real-time Consolidation Progress Banner */}
              {isConsolidating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl flex items-center gap-3 text-xs text-indigo-200"
                >
                  <Loader2 size={18} className="animate-spin text-indigo-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-white">{consolidationProgress || 'Đang quét toàn diện và tự tổng hợp quy luật...'}</p>
                    <p className="text-[11px] text-indigo-300 mt-0.5">Mô hình Gemini 3.7 Flash đang đúc kết bài học điều hành từ nhiệm vụ, KPI và tài liệu Đảng ủy.</p>
                  </div>
                </motion.div>
              )}

              {/* Collapsible Add Custom Wisdom Form */}
              {isAddingWisdom && (
                <motion.form
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handleSaveCustomWisdom}
                  className="p-5 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                      <Plus size={14} className="text-indigo-400" />
                      Bổ sung Nguyên tắc / Phong cách Chỉ đạo Mới
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingWisdom(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs font-bold"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300">Tên Nguyên tắc / Tiêu đề Bài học</label>
                      <input
                        type="text"
                        value={newWisdomForm.title}
                        onChange={e => setNewWisdomForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ví dụ: Quy tắc Rà soát Thể thức Văn bản Khẩn"
                        className="w-full bg-slate-900 text-xs text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300">Phân loại</label>
                      <select
                        value={newWisdomForm.category}
                        onChange={e => setNewWisdomForm(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full bg-slate-900 text-xs text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 outline-none"
                      >
                        <option value="executive_habit">Phong cách Lãnh đạo</option>
                        <option value="operational_principle">Nguyên tắc Điều hành</option>
                        <option value="policy_guideline">Thể thức & Pháp quy</option>
                        <option value="strategic_directive">Chỉ đạo Chiến lược</option>
                        <option value="cross_link">Liên kết Tri thức</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">Phát hiện / Quy luật Đúc kết (Insight)</label>
                    <textarea
                      rows={2}
                      value={newWisdomForm.insight}
                      onChange={e => setNewWisdomForm(prev => ({ ...prev, insight: e.target.value }))}
                      placeholder="Mô tả bối cảnh, lý do hoặc điểm nghẽn thực tế đã đúc kết được..."
                      className="w-full bg-slate-900 text-xs text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">Chỉ dẫn Hành động cụ thể cho Trợ lý AI (Actionable Guideline)</label>
                    <textarea
                      rows={2}
                      value={newWisdomForm.actionableGuideline}
                      onChange={e => setNewWisdomForm(prev => ({ ...prev, actionableGuideline: e.target.value }))}
                      placeholder="Khi tư vấn hoặc soạn thảo, Trợ lý AI bắt buộc phải thực hiện theo cách thức nào..."
                      className="w-full bg-slate-900 text-xs text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      value={newWisdomForm.tags}
                      onChange={e => setNewWisdomForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Thẻ tags phân loại (cách nhau bởi dấu phẩy: the_thuc, kpi, khan)"
                      className="flex-1 bg-slate-900 text-xs text-white px-3.5 py-2 rounded-xl border border-slate-800 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Lưu vào Bộ não
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Wisdom Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWisdom.map(item => {
                  const badge = getCategoryBadge(item.category);
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl relative overflow-hidden group transition-all space-y-3"
                    >
                      {/* Top Row: Category + Confidence + Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${badge.color}`}>
                          {badge.label}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                            <Flame size={12} />
                            Đã áp dụng: {item.timesApplied || 1} lần
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {item.confidenceScore || 95}% Độ tin cậy
                          </span>
                          <button
                            onClick={() => {
                              deleteWisdomItem(item.id);
                              showToast(`Đã xóa nguyên tắc: ${item.title}`, "info");
                            }}
                            className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                            title="Xóa nguyên tắc"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-black text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h4>

                      {/* Insight box */}
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quy luật & Đúc kết thực tế</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.insight}</p>
                      </div>

                      {/* Actionable Guideline box */}
                      <div className="p-3 bg-indigo-950/20 rounded-xl border border-indigo-500/20 space-y-1">
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-indigo-400" />
                          Chỉ dẫn Hành động cho AI
                        </p>
                        <p className="text-xs text-indigo-100/90 leading-relaxed font-medium">{item.actionableGuideline}</p>
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-bold px-2 py-0.5 bg-slate-900 text-slate-400 rounded-md border border-slate-800">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
          
          {/* Radar tab */}
          {activeTab === 'radar' && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* COGNITIVE RADAR INTERACTIVE MAP */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-[2rem] border border-slate-800 relative min-h-[280px]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">BẢN ĐỒ TƯ DUY LIÊN KẾT ĐA CHIỀU v8.0</h4>
                  
                  {/* SVG Map */}
                  <svg width="220" height="180" viewBox="0 0 220 180" className="relative">
                    {/* Animated connections */}
                    <g className="stroke-indigo-500/30" strokeWidth="2" strokeDasharray="4 4">
                      <line x1="110" y1="90" x2="110" y2="25" className="animate-[dash_10s_linear_infinite]" />
                      <line x1="110" y1="90" x2="40" y2="140" className="animate-[dash_10s_linear_infinite]" />
                      <line x1="110" y1="90" x2="180" y2="140" className="animate-[dash_10s_linear_infinite]" />
                      <line x1="40" y1="140" x2="180" y2="140" />
                      <line x1="40" y1="140" x2="110" y2="25" />
                      <line x1="180" y1="140" x2="110" y2="25" />
                    </g>
                    
                    {/* Central Brain Core */}
                    <g className="cursor-pointer" onClick={() => setSelectedMapNode('brain')}>
                      <circle cx="110" cy="90" r="24" className={`fill-indigo-950 stroke-indigo-500 transition-all ${selectedMapNode === 'brain' ? 'stroke-[3] r-[26]' : 'stroke-1'}`} />
                      <BrainCircuit x="98" y="78" className="text-indigo-400 w-6 h-6 absolute" style={{ transform: 'translate(98px, 78px)' }} />
                    </g>

                    {/* Node 1: Kho Tri thức */}
                    <g className="cursor-pointer" onClick={() => setSelectedMapNode('knowledge')}>
                      <circle cx="110" cy="25" r="18" className={`fill-slate-900 stroke-emerald-500 transition-all ${selectedMapNode === 'knowledge' ? 'stroke-[3]' : 'stroke-1'}`} />
                      <FileText x="101" y="16" className="text-emerald-400 w-[18px] h-[18px] absolute" style={{ transform: 'translate(101px, 16px)' }} />
                    </g>

                    {/* Node 2: Nhiệm vụ */}
                    <g className="cursor-pointer" onClick={() => setSelectedMapNode('tasks')}>
                      <circle cx="40" cy="140" r="18" className={`fill-slate-900 stroke-blue-500 transition-all ${selectedMapNode === 'tasks' ? 'stroke-[3]' : 'stroke-1'}`} />
                      <Activity x="31" y="131" className="text-blue-400 w-[18px] h-[18px] absolute" style={{ transform: 'translate(31px, 131px)' }} />
                    </g>

                    {/* Node 3: Chỉ số KPI */}
                    <g className="cursor-pointer" onClick={() => setSelectedMapNode('kpi')}>
                      <circle cx="180" cy="140" r="18" className={`fill-slate-900 stroke-amber-500 transition-all ${selectedMapNode === 'kpi' ? 'stroke-[3]' : 'stroke-1'}`} />
                      <Award x="171" y="131" className="text-amber-400 w-[18px] h-[18px] absolute" style={{ transform: 'translate(171px, 131px)' }} />
                    </g>
                  </svg>

                  {/* Node Description Panel */}
                  <div className="mt-4 text-center px-4">
                    {selectedMapNode === 'brain' && (
                      <div>
                        <p className="text-xs font-black text-indigo-300 uppercase">Hạt nhân Điều phối Elite AI</p>
                        <p className="text-[10px] text-slate-400 mt-1">Giải pháp kết nối chéo 3 chiều, tự động tham mưu dựa trên bối cảnh sâu.</p>
                      </div>
                    )}
                    {selectedMapNode === 'knowledge' && (
                      <div>
                        <p className="text-xs font-black text-emerald-300 uppercase">Kho tri thức & Văn bản Đảng</p>
                        <p className="text-[10px] text-slate-400 mt-1">Lưu trữ các chỉ thị, nghị quyết và quy định để đối chiếu tính tuân thủ.</p>
                      </div>
                    )}
                    {selectedMapNode === 'tasks' && (
                      <div>
                        <p className="text-xs font-black text-blue-300 uppercase">Tiến trình Nhiệm vụ văn phòng</p>
                        <p className="text-[10px] text-slate-400 mt-1">Các hành động thực tế của chi bộ và cán bộ cần được kiểm soát tiến độ.</p>
                      </div>
                    )}
                    {selectedMapNode === 'kpi' && (
                      <div>
                        <p className="text-xs font-black text-amber-300 uppercase">Sổ tay Chỉ tiêu KPI</p>
                        <p className="text-[10px] text-slate-400 mt-1">Các chỉ số đánh giá chức danh tích hợp tự động để xếp loại cán bộ.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Khuyến nghị Liên kết Đa chiều Tự động</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Phát hiện và kết nối chéo các đầu việc văn phòng với quy định gốc và mục tiêu KPI tương ứng.</p>
                    </div>
                    <span className="text-[10px] bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 font-bold px-3 py-1.5 rounded-xl shrink-0">
                      Hệ số tương thích cao
                    </span>
                  </div>

                  {knowledgeLinks.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-[2rem] border border-dashed border-slate-800">
                      <Link2 size={36} className="mx-auto text-slate-600 mb-2 animate-bounce" />
                      <p className="text-sm font-bold text-slate-400">Chưa phát hiện cặp liên kết nào khả thi</p>
                      <p className="text-xs text-slate-500 mt-1">Đồng chí hãy cập nhật mô tả chi tiết của nhiệm vụ và tài liệu chỉ đạo.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {knowledgeLinks.map((link) => {
                        const isApproved = approvedLinks.includes(link.id);
                        return (
                          <div 
                            key={link.id}
                            className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${isApproved ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'}`}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
                            
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 bg-indigo-950/50 px-2.5 py-1 rounded-md border border-indigo-900/50">
                                <Layers size={10} strokeWidth={2.5} />
                                Độ khớp: {link.score}/10
                              </span>
                              
                              {isApproved ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/40 border border-emerald-500/40 px-2.5 py-1 rounded-md flex items-center gap-1">
                                  <Check size={10} /> Đã phê duyệt
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApproveLink(link.id, link.task.title, link.knowledge.title, link.kpi?.title)}
                                  className="text-[10px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-indigo-600/15"
                                >
                                  Duyệt liên kết v8.0
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              {/* Task node */}
                              <div>
                                <div className="flex items-center gap-1.5 text-[9px] text-blue-400 font-bold uppercase tracking-wider">
                                  <span className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                                  Nhiệm vụ: {link.task.title}
                                </div>
                              </div>

                              {/* Knowledge node */}
                              <div className="pl-3 border-l border-slate-800">
                                <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                                  Quy chiếu: {link.knowledge.title}
                                </div>
                              </div>

                              {/* KPI target node */}
                              {link.kpi && (
                                <div className="pl-3 border-l-2 border-amber-500/40 bg-amber-500/5 p-2 rounded-lg">
                                  <div className="flex items-center justify-between text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                      <Award size={10} />
                                      KPI liên đới: "{link.kpi.title}"
                                    </span>
                                    <span className="text-amber-300 font-black">{link.kpi.progressPercent || 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                                    <div className="bg-amber-500 h-full" style={{ width: `${link.kpi.progressPercent || 0}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-900 flex items-start gap-2">
                              <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-slate-400 font-medium italic leading-normal">{link.reason}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Console tab */}
          {activeTab === 'console' && (
            <motion.div
              key="console"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Bộ chọn cấp độ suy luận & Đa Đặc nhiệm (CoT)</p>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setReasoningDepth('tactical')}
                    className={`text-center py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${reasoningDepth === 'tactical' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Tác chiến
                  </button>
                  <button 
                    onClick={() => setReasoningDepth('cot')}
                    className={`text-center py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${reasoningDepth === 'cot' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Chain-of-Thought
                  </button>
                  <button 
                    onClick={() => setReasoningDepth('strategic')}
                    className={`text-center py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${reasoningDepth === 'strategic' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Chiến lược
                  </button>
                  <button 
                    onClick={() => setReasoningDepth('multi_agent')}
                    className={`text-center py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${reasoningDepth === 'multi_agent' ? 'bg-gradient-to-r from-indigo-600 to-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Đa Đặc nhiệm
                  </button>
                </div>

                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-4">Kịch bản chỉ huy Elite</p>
                <div className="space-y-2.5">
                  {quickPrompts.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => handleRunPrompt(qp.prompt)}
                      className="w-full text-left p-4 bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl transition-all group flex items-start gap-3.5"
                    >
                      <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">{qp.label}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{qp.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8 flex flex-col h-[380px] bg-slate-950/80 border border-slate-800 rounded-[2rem] overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Bản phản hồi tham mưu (Chế độ: {reasoningDepth === 'tactical' ? 'Tác chiến' : reasoningDepth === 'cot' ? 'Chain-of-Thought' : 'Toàn cảnh'})
                    </span>
                  </div>
                  {isGenerating && <Loader2 size={14} className="text-indigo-400 animate-spin" />}
                </div>

                <div className="flex-1 p-5 overflow-y-auto text-xs leading-relaxed font-medium space-y-4 text-slate-300 select-text custom-scrollbar">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3">
                      <Loader2 size={28} className="text-indigo-500 animate-spin" />
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Bộ não AI đang tổng hợp, kết nối tri thức sâu...</p>
                    </div>
                  ) : brainResponse ? (
                    <div className="prose prose-invert prose-xs max-w-none text-slate-300">
                      <Markdown>{brainResponse}</Markdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <BrainCircuit size={40} className="stroke-[1] mb-2 text-indigo-400" />
                      <p className="text-[11px] font-bold text-slate-400">Vui lòng chọn kịch bản hoặc nhập câu hỏi cho Trợ lý</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 text-center px-6">Hệ thống sẽ đồng bộ và tham mưu dựa trên Tasks, Lịch công tác, Kho tài liệu Đảng ủy và danh sách Chỉ số KPI mới nhất.</p>
                    </div>
                  )}
                </div>

                {/* Input form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customPrompt.trim()) handleRunPrompt(customPrompt);
                  }}
                  className="p-3 bg-slate-900/40 border-t border-slate-800/80 flex gap-2"
                >
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Đồng chí cần phân tích hay thiết lập mối liên kết nào? Nhập tại đây..."
                    className="flex-1 bg-slate-950 text-xs text-white placeholder-slate-500 rounded-xl px-4 py-3 border border-slate-800 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl transition-all flex items-center justify-center shadow-lg shadow-indigo-600/15"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Proactive Insights Tab */}
          {activeTab === 'proactive' && (
            <motion.div
              key="proactive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Zap size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">TRUNG TÂM CẢNH BÁO & KHUYẾN NGHỊ THAM MƯU CHỦ ĐỘNG</h4>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">Tự động phát hiện điểm nghẽn, nguy cơ rủi ro KPI và đề xuất chỉ đạo trước khi phát sinh sự cố.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTriggerConsolidation()}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isConsolidating ? 'animate-spin' : ''} />
                  <span>Cập nhật Rà soát AI</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Proactive Alert 1 */}
                <div className="p-5 bg-slate-950/80 border border-rose-500/30 rounded-2xl relative overflow-hidden group hover:border-rose-500/50 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Cảnh báo Rủi ro KPI (Mức độ Cấp bách)
                    </span>
                    <button
                      onClick={() => {
                        addCustomWisdom({
                          title: "Kiểm soát Tiến độ KPI Chi bộ định kỳ 72h",
                          insight: "Các chỉ tiêu KPI có xu hướng tụt dốc nếu không có thông báo nhắc nhở 72h trước thời hạn.",
                          actionableGuideline: "Kích hoạt thông báo tự động và phân công Phó Văn phòng phụ trách giám sát trực tiếp các khâu bị trễ.",
                          category: "operational_principle",
                          tags: ["kpi", "canh bao", "phong chong"]
                        });
                        showToast("Đã ghi nhận bài học vào Bộ nhớ Tiến hóa!", "success");
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-lg transition-all"
                    >
                      + Lưu Bài học
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100">Rủi ro trễ hạn Chỉ tiêu "Số hóa & Thẩm định Nghị quyết Chi bộ"</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Hệ thống phát hiện còn 3 chi bộ trực thuộc chưa nộp báo cáo kết quả sinh hoạt chuyên đề Quý II. Nguy cơ ảnh hưởng trực tiếp đến 15% tổng điểm KPI Văn phòng.
                  </p>
                  <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-indigo-400 font-bold">Đề xuất Chánh Văn phòng:</span>
                    <span className="text-slate-300">Gửi Công văn đôn đốc khẩn trước 17h hôm nay.</span>
                  </div>
                </div>

                {/* Proactive Alert 2 */}
                <div className="p-5 bg-slate-950/80 border border-amber-500/30 rounded-2xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                      <ShieldCheck size={12} />
                      Thẩm định Thể thức Văn bản (Quy định 66)
                    </span>
                    <button
                      onClick={() => {
                        addCustomWisdom({
                          title: "Chuẩn hóa Thể thức Ký thừa lệnh & Ký thay",
                          insight: "Nhiều văn bản bị trả lại do dùng sai thẩm quyền ký T/M thay vì T/L hoặc K/T theo Quy định 66-QĐ/TW.",
                          actionableGuideline: "Kiểm tra kỹ bảng phân công thẩm quyền ký văn bản trước khi trình Thường trực.",
                          category: "policy_guideline",
                          tags: ["quy dinh 66", "the thuc", "tham dinh"]
                        });
                        showToast("Đã ghi nhận bài học vào Bộ nhớ Tiến hóa!", "success");
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-lg transition-all"
                    >
                      + Lưu Bài học
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100">Kiểm tra Thẩm quyền ký T/M và K/T trong dự thảo Kế hoạch mới</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Trợ lý đối chiếu dự thảo Kế hoạch Kiểm tra Giám sát và nhận thấy thẩm quyền ký ban hành thuộc Thường trực Đảng ủy (K/T), cần điều chỉnh ngay ở thể thức ban hành.
                  </p>
                  <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold">Khuyến nghị điều chỉnh:</span>
                    <span className="text-slate-300">Đổi thể thức từ T/M sang K/T T/M BTV.</span>
                  </div>
                </div>

                {/* Proactive Alert 3 */}
                <div className="p-5 bg-slate-950/80 border border-indigo-500/30 rounded-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                      <Workflow size={12} />
                      Tối ưu Phân công Nhân sự Tác nghiệp
                    </span>
                    <button
                      onClick={() => {
                        addCustomWisdom({
                          title: "Tối ưu Hậu cần Hội nghị Đảng bộ",
                          insight: "Lực lượng chuyên viên văn phòng bị quá tải khi diễn ra cùng lúc hội nghị và kỳ kiểm tra.",
                          actionableGuideline: "Phân công 1 Phó Văn phòng phụ trách tổng hợp nội dung và 1 cán bộ phụ trách công tác hậu cần số.",
                          category: "executive_habit",
                          tags: ["phan cong", "hau can", "hoi nghi"]
                        });
                        showToast("Đã ghi nhận bài học vào Bộ nhớ Tiến hóa!", "success");
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-lg transition-all"
                    >
                      + Lưu Bài học
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100">Trùng lịch Chuẩn bị Báo cáo Sơ kết & Lịch tiếp công dân</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Dự kiến tuần tới có 2 sự kiện lớn diễn ra đồng thời. Đề xuất giao Đồng chí Lê Thị Kiều Oanh chủ trì tổ tiếp công dân để Chánh Văn phòng tập trung điều hành báo cáo sơ kết.
                  </p>
                  <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-indigo-400 font-bold">Phân công tối ưu:</span>
                    <span className="text-slate-300">Giao Phó VP 1 điều hành Tiếp công dân.</span>
                  </div>
                </div>

                {/* Proactive Alert 4 */}
                <div className="p-5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                      <Sparkles size={12} />
                      Đột phá Số hóa Quản trị Tri thức
                    </span>
                    <button
                      onClick={() => {
                        addCustomWisdom({
                          title: "Tự động hóa Trích xuất Lịch & Nhắc việc",
                          insight: "Trích xuất lịch họp từ văn bản đến giúp giảm 90% thời gian nhập tay và tránh sót việc.",
                          actionableGuideline: "Luôn chạy trình quét OCR/AI cho mọi văn bản chỉ đạo mới nhận được.",
                          category: "strategic_directive",
                          tags: ["so hoa", "ocr", "tri thuc"]
                        });
                        showToast("Đã ghi nhận bài học vào Bộ nhớ Tiến hóa!", "success");
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-lg transition-all"
                    >
                      + Lưu Bài học
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100">Đã kết nối thành công 12 Văn bản Chỉ đạo Mới vào Ma trận Tri thức</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Các chỉ thị về xây dựng Đảng bộ "4 tốt" đã được trích xuất từ văn bản và liên kết trực tiếp với Bảng chấm điểm KPI chức danh của Văn phòng.
                  </p>
                  <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">Trạng thái:</span>
                    <span className="text-slate-300">Đã đồng bộ 100% vào AI Memory.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scenario Stress Testing Tab */}
          {activeTab === 'stresstest' && (
            <motion.div
              key="stresstest"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-black uppercase tracking-wider">
                    <AlertTriangle size={16} />
                    <span>MÔ PHỎNG KỊCH BẢN TÌNH HUỐNG GIẢ ĐỊNH KHẨN</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Thử nghiệm sức chịu tải và thiết lập ma trận phản ứng nhanh cho các tình huống khẩn cấp đột xuất.
                  </p>
                </div>

                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Chọn kịch bản tình huống mẫu</p>
                <div className="space-y-2.5">
                  {presetScenarios.map((sc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedPresetScenario(sc.scenario);
                        handleRunStressTest(sc.scenario);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 group ${
                        selectedPresetScenario === sc.scenario
                          ? 'bg-rose-950/40 border-rose-500/50 text-white'
                          : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 hover:border-rose-500/30 text-slate-300'
                      }`}
                    >
                      <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                        <Flame size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-rose-300 transition-colors">{sc.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{sc.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Hoặc tự tạo tình huống giả định khác</p>
                  <textarea
                    rows={3}
                    value={customScenario}
                    onChange={(e) => setCustomScenario(e.target.value)}
                    placeholder="Nhập tình huống giả định... (Ví dụ: Phát sinh kiểm tra khẩn trong 12h, mất dữ liệu cuộc họp,...)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500/50 resize-none"
                  />
                  <button
                    onClick={() => {
                      if (customScenario.trim()) {
                        setSelectedPresetScenario(customScenario);
                        handleRunStressTest(customScenario);
                      }
                    }}
                    disabled={!customScenario.trim() || isSimulatingScenario}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                  >
                    {isSimulatingScenario ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                    <span>Kích hoạt Mô phỏng Kịch bản</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col h-[480px] bg-slate-950/80 border border-slate-800 rounded-[2rem] overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      Ma trận Phản ứng Nhanh & Kế hoạch Tác chiến Khẩn
                    </span>
                  </div>
                  {isSimulatingScenario && <Loader2 size={14} className="text-rose-400 animate-spin" />}
                </div>

                <div className="flex-1 p-5 overflow-y-auto text-xs leading-relaxed font-medium space-y-4 text-slate-300 select-text custom-scrollbar">
                  {isSimulatingScenario ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3">
                      <Loader2 size={32} className="text-rose-500 animate-spin" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Bộ não AI đang mô phỏng kịch bản, tính toán ma trận phản ứng nhanh...</p>
                    </div>
                  ) : scenarioResponse ? (
                    <div className="prose prose-invert prose-xs max-w-none text-slate-300">
                      <Markdown>{scenarioResponse}</Markdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <ShieldAlert size={44} className="stroke-[1] mb-2 text-rose-500/80" />
                      <p className="text-[11px] font-bold text-slate-400">Chọn hoặc nhập kịch bản để kích hoạt Mô phỏng Tác chiến</p>
                      <p className="text-[10px] text-slate-500 mt-1 text-center px-6">Trợ lý AI sẽ phân tích rủi ro, đưa ra ma trận phân công 3 bước và dự thảo văn bản phản ứng nhanh khẩn cấp.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
