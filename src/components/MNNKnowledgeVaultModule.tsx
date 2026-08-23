import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Sparkles, 
  Search, 
  Link2, 
  Check, 
  ChevronRight, 
  AlertTriangle, 
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
  Cpu, 
  Network,
  Share2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Eye,
  SlidersHorizontal,
  Bot,
  Sliders,
  FolderGit2,
  Download,
  Copy,
  ExternalLink,
  Target
} from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai-utils';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

export interface MNNModuleProps {
  aiKnowledge: any[];
  onNavigate?: (tab: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  addManualKnowledge?: (category: string, title: string, content: string, tags: string[]) => Promise<void>;
}

// 6 Mô-đun Nơ-ron Chuyên gia trong MNN
export interface MNNExpertModule {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  accentColor: string;
  bgLight: string;
  glowColor: string;
  iconName: string;
  primaryKeywords: string[];
  neuronsCount: number;
  synapticStrength: number; // 0 - 100%
  stabilityScore: number;
}

export interface MNNNeuron {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  fullContent?: string;
  weight: number; // 0.1 - 1.0
  firingCount: number;
  activationThreshold: number;
  tags: string[];
  connections: string[]; // IDs of connected neurons
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  isSynthesized?: boolean;
}

export interface MNNSynapse {
  source: string;
  target: string;
  weight: number;
  type: 'intra_module' | 'cross_module' | 'emergent_reasoning';
}

export interface MNNReasoningStep {
  step: number;
  moduleCode: string;
  moduleName: string;
  status: 'pending' | 'firing' | 'completed';
  insight: string;
}

// Danh mục 6 Mô-đun chuyên gia chuẩn hóa
const MNN_EXPERT_MODULES: MNNExpertModule[] = [
  {
    id: 'mod-ideology',
    code: 'MOD_IDEOLOGY',
    name: 'Cương lĩnh & Điều lệ Đảng',
    shortName: 'Cương lĩnh & Điều lệ',
    description: 'Nền tảng tư tưởng, nguyên tắc tập trung dân chủ, chuẩn mực sinh hoạt cấp ủy và tổ chức Đảng.',
    color: '#dc2626', // Red-600
    accentColor: '#ef4444',
    bgLight: 'bg-red-50 text-red-700 border-red-200',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    iconName: 'Award',
    primaryKeywords: ['điều lệ', 'cương lĩnh', 'nguyên tắc', 'đảng viên', 'tập trung dân chủ', 'chính trị', 'tư tưởng'],
    neuronsCount: 0,
    synapticStrength: 96,
    stabilityScore: 99
  },
  {
    id: 'mod-strategy',
    code: 'MOD_STRATEGY',
    name: 'Chỉ đạo Chiến lược & Nghị quyết',
    shortName: 'Nghị quyết & Chỉ đạo',
    description: 'Cụ thể hóa Nghị quyết Đại hội, chương trình hành động trọng tâm, đề án phát triển kinh tế - xã hội.',
    color: '#2563eb', // Blue-600
    accentColor: '#3b82f6',
    bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    iconName: 'Compass',
    primaryKeywords: ['nghị quyết', 'chỉ thị', 'kế hoạch', 'đề án', 'chương trình', 'chiến lược', 'mục tiêu', 'chỉ tiêu'],
    neuronsCount: 0,
    synapticStrength: 93,
    stabilityScore: 97
  },
  {
    id: 'mod-governance',
    code: 'MOD_GOVERNANCE',
    name: 'Quy chế & Thẩm quyền Tác nghiệp',
    shortName: 'Quy chế & Thẩm quyền',
    description: 'Quy chế làm việc Ban Chấp hành, phân công nhiệm vụ Thường trực, thẩm quyền ký duyệt và phát hành văn bản.',
    color: '#7c3aed', // Purple-600
    accentColor: '#8b5cf6',
    bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
    glowColor: 'rgba(124, 58, 237, 0.4)',
    iconName: 'Workflow',
    primaryKeywords: ['quy chế', 'thẩm quyền', 'nhiệm vụ', 'thường trực', 'ban thường vụ', 'chánh văn phòng', 'phê duyệt', 'quy trình'],
    neuronsCount: 0,
    synapticStrength: 91,
    stabilityScore: 96
  },
  {
    id: 'mod-inspection',
    code: 'MOD_INSPECTION',
    name: 'Kiểm tra, Giám sát & Kỷ luật',
    shortName: 'Kiểm tra & Giám sát',
    description: 'Chương trình kiểm tra giám sát, phòng ngừa sai phạm, giải quyết đơn thư, bảo vệ chính trị nội bộ.',
    color: '#d97706', // Amber-600
    accentColor: '#f59e0b',
    bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    iconName: 'ShieldCheck',
    primaryKeywords: ['kiểm tra', 'giám sát', 'kỷ luật', 'đơn thư', 'khiếu nại', 'tố cáo', 'nội bộ', 'sai phạm', 'phòng chống'],
    neuronsCount: 0,
    synapticStrength: 89,
    stabilityScore: 94
  },
  {
    id: 'mod-mobilization',
    code: 'MOD_MOBILIZATION',
    name: 'Dân vận, Tuyên giáo & Dư luận',
    shortName: 'Dân vận & Tuyên giáo',
    description: 'Công tác quần chúng, nắm bắt tình hình dư luận địa bàn, tuyên truyền chuyển đổi số và các phong trào thi đua.',
    color: '#059669', // Emerald-600
    accentColor: '#10b981',
    bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    iconName: 'Flame',
    primaryKeywords: ['dân vận', 'tuyên giáo', 'dư luận', 'nhân dân', 'mặt trận', 'đoàn thể', 'phong trào', 'tuyên truyền', 'xã hội'],
    neuronsCount: 0,
    synapticStrength: 86,
    stabilityScore: 92
  },
  {
    id: 'mod-forecast',
    code: 'MOD_FORECAST',
    name: 'Dự báo Tình huống & Phản ứng Nhanh',
    shortName: 'Dự báo & Ứng phó',
    description: 'Mô hình tự suy luận kịch bản rủi ro, dự báo điểm nóng chính trị - an ninh trật tự và giải pháp tham mưu khẩn cấp.',
    color: '#0891b2', // Cyan-600
    accentColor: '#06b6d4',
    bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    glowColor: 'rgba(8, 145, 178, 0.4)',
    iconName: 'TrendingUp',
    primaryKeywords: ['dự báo', 'tình huống', 'kịch bản', 'khẩn cấp', 'rủi ro', 'ứng phó', 'điểm nóng', 'tham mưu', 'giải pháp'],
    neuronsCount: 0,
    synapticStrength: 92,
    stabilityScore: 94
  }
];

export const MNNKnowledgeVaultModule: React.FC<MNNModuleProps> = ({
  aiKnowledge,
  onNavigate,
  showToast,
  addManualKnowledge
}) => {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'inference' | 'self_learning' | 'synapses' | 'analytics'>('visualizer');
  const [selectedModule, setSelectedModule] = useState<MNNExpertModule | null>(null);
  const [selectedNeuron, setSelectedNeuron] = useState<MNNNeuron | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Trạng thái Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pulseDensity, setPulseDensity] = useState<'normal' | 'high' | 'ultra'>('high');
  const [isHoveringNeuron, setIsHoveringNeuron] = useState<MNNNeuron | null>(null);

  // Trạng thái Tự học (Self-Learning)
  const [isSelfLearning, setIsSelfLearning] = useState(false);
  const [learningLog, setLearningLog] = useState<string[]>([]);
  const [learningEpoch, setLearningEpoch] = useState(4);
  const [synthesizedWisdom, setSynthesizedWisdom] = useState<any[]>(() => {
    const saved = localStorage.getItem('mnn_synthesized_wisdom');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: 'syn-1',
        title: 'Quy tắc Giao thoa Giữa Cương lĩnh và Nghị quyết Chuyển đổi số',
        moduleA: 'MOD_IDEOLOGY',
        moduleB: 'MOD_STRATEGY',
        insight: 'Nguyên tắc bảo đảm sự lãnh đạo tuyệt đối, toàn diện của Đảng trong quá trình số hóa hồ sơ nghiệp vụ và điều hành trực tuyến.',
        weight: 0.98,
        createdAt: '22/08/2026'
      },
      {
        id: 'syn-2',
        title: 'Cơ chế Tự động Nhận diện Thẩm quyền Ký duyệt Văn bản Mật',
        moduleA: 'MOD_GOVERNANCE',
        moduleB: 'MOD_INSPECTION',
        insight: 'Đối với các kết luận kiểm tra dấu hiệu vi phạm, thẩm quyền phê duyệt thuộc Thường trực Đảng ủy và phải lưu trữ mã hóa riêng biệt.',
        weight: 0.95,
        createdAt: '22/08/2026'
      },
      {
        id: 'syn-3',
        title: 'Phản ứng Tuyên truyền & Dân vận Đón đầu Điểm nóng Đất đai',
        moduleA: 'MOD_MOBILIZATION',
        moduleB: 'MOD_FORECAST',
        insight: 'Khi phát sinh dư luận trái chiều về công tác giải tỏa bồi thường, Tổ công tác Dân vận phối hợp Mặt trận tiếp xúc trực tiếp 1-1 trước khi tiến hành cưỡng chế.',
        weight: 0.94,
        createdAt: '22/08/2026'
      }
    ];
  });

  // Trạng thái Tự suy luận (Inference Engine)
  const [inferencePrompt, setInferencePrompt] = useState('');
  const [isInferencing, setIsInferencing] = useState(false);
  const [inferenceSteps, setInferenceSteps] = useState<MNNReasoningStep[]>([]);
  const [inferenceResult, setInferenceResult] = useState<string | null>(null);
  const [activeFiringModules, setActiveFiringModules] = useState<string[]>([]);
  const [reasoningDepth, setReasoningDepth] = useState<'standard' | 'deep' | 'strategic'>('strategic');

  // Kịch bản Tình huống Thực tế
  const PRESET_SCENARIOS = [
    {
      id: 'scen-1',
      badge: 'Điểm nóng',
      badgeColor: 'bg-red-50 text-red-700 border-red-200',
      title: 'Đơn thư khiếu nại vượt cấp về đất đai trước thềm Đại hội Đảng',
      prompt: 'Có đoàn đông người gửi đơn kiến nghị vượt cấp về việc đền bù giải tỏa dự án khu đô thị mới, đồng thời xuất hiện tài khoản mạng xã hội đăng bài xuyên tạc công tác lãnh đạo của Thường trực Đảng ủy. Với vai trò Chánh Văn phòng, hãy kích hoạt mạng nơ-ron MNN để tự suy luận và tham mưu kế hoạch xử lý 3 giai đoạn (24h - 72h - Dài hạn) bảo đảm an ninh chính trị và đúng thẩm quyền.'
    },
    {
      id: 'scen-2',
      badge: 'Nội bộ',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      title: 'Dấu hiệu vi phạm nguyên tắc tập trung dân chủ tại Chi bộ cơ sở',
      prompt: 'Chi bộ trực thuộc có đơn phản ánh nội bộ về việc Bí thư Chi bộ tự ý quyết định phân bổ chỉ tiêu ngân sách và bổ nhiệm cán bộ không đưa ra họp Chi ủy. MNN hãy phân tích căn cứ Điều lệ Đảng, Quy chế làm việc và đề xuất quy trình kiểm tra đột xuất theo đúng Quy định của UBKT Trung ương.'
    },
    {
      id: 'scen-3',
      badge: 'Chỉ đạo',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      title: 'Tham mưu Chỉ thị Đẩy nhanh tiến độ Đề án Chuyển đổi số Đảng bộ 2026-2030',
      prompt: 'Đánh giá các điểm nghẽn về liên thông văn bản điện tử và tỷ lệ số hóa hồ sơ Đảng viên giữa các Ban Đảng. MNN hãy tự suy luận các chỉ tiêu KPI chiến lược, phân công trách nhiệm người đứng đầu và dự thảo Kết luận của Ban Thường vụ.'
    },
    {
      id: 'scen-4',
      badge: 'Dư luận',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Xử lý khủng hoảng truyền thông mạng xã hội liên quan đến cán bộ',
      prompt: 'Xuất hiện luồng thông tin trái chiều trên TikTok/Facebook về phát ngôn của cán bộ lãnh đạo xã trong buổi tiếp dân. MNN hãy phân tích tâm lý đám đông, định hướng tuyên giáo và dự thảo văn bản chỉ đạo chấn chỉnh công tác phát ngôn.'
    }
  ];

  // Map aiKnowledge vào các Module MNN
  const { modulesWithData, neurons, synapses } = useMemo(() => {
    const rawNeurons: MNNNeuron[] = [];
    const moduleCounts: Record<string, number> = {
      'MOD_IDEOLOGY': 0,
      'MOD_STRATEGY': 0,
      'MOD_GOVERNANCE': 0,
      'MOD_INSPECTION': 0,
      'MOD_MOBILIZATION': 0,
      'MOD_FORECAST': 0
    };

    // Phân loại tài liệu aiKnowledge vào các mô-đun nơ-ron theo từ khóa ngữ nghĩa
    aiKnowledge.forEach((item, index) => {
      const text = `${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')} ${item.category || ''}`.toLowerCase();
      
      let bestModule = 'MOD_STRATEGY'; // Default
      let maxScore = 0;

      MNN_EXPERT_MODULES.forEach(mod => {
        let score = 0;
        mod.primaryKeywords.forEach(kw => {
          if (text.includes(kw)) score += 2;
        });
        if (item.category && item.category.toLowerCase().includes(mod.shortName.toLowerCase())) score += 5;
        if (score > maxScore) {
          maxScore = score;
          bestModule = mod.code;
        }
      });

      moduleCounts[bestModule] = (moduleCounts[bestModule] || 0) + 1;

      rawNeurons.push({
        id: item.id || `neuron-${index}`,
        moduleId: bestModule,
        title: item.title || `Nơ-ron Tri thức #${index + 1}`,
        summary: (item.content || '').substring(0, 160) + '...',
        fullContent: item.content || '',
        weight: item.isImportant ? 0.96 : 0.78,
        firingCount: Math.floor(Math.random() * 25) + 8,
        activationThreshold: 0.6,
        tags: item.tags || ['Tri thức Đảng'],
        connections: []
      });
    });

    // Bổ sung nơ-ron tổng hợp tự học
    synthesizedWisdom.forEach((syn, idx) => {
      rawNeurons.push({
        id: `synthesized-${idx}`,
        moduleId: syn.moduleA || 'MOD_FORECAST',
        title: `[Tự học MNN] ${syn.title}`,
        summary: syn.insight,
        fullContent: syn.insight,
        weight: syn.weight || 0.95,
        firingCount: 45,
        activationThreshold: 0.5,
        tags: ['MNN-Synthesized', 'Tự học', 'Đa mô-đun'],
        connections: [],
        isSynthesized: true
      });
    });

    // Tạo các khớp thần kinh Synapses (Links)
    const rawSynapses: MNNSynapse[] = [];
    for (let i = 0; i < rawNeurons.length; i++) {
      for (let j = i + 1; j < rawNeurons.length; j++) {
        const nA = rawNeurons[i];
        const nB = rawNeurons[j];

        // Khớp trong cùng module
        if (nA.moduleId === nB.moduleId) {
          if (Math.random() > 0.35) {
            rawSynapses.push({
              source: nA.id,
              target: nB.id,
              weight: 0.85,
              type: 'intra_module'
            });
            nA.connections.push(nB.id);
            nB.connections.push(nA.id);
          }
        } else {
          // Khớp liên kết chéo giữa các module
          const commonTags = (nA.tags || []).filter(t => (nB.tags || []).includes(t));
          if (commonTags.length > 0 || Math.random() > 0.82) {
            rawSynapses.push({
              source: nA.id,
              target: nB.id,
              weight: 0.72,
              type: 'cross_module'
            });
            nA.connections.push(nB.id);
            nB.connections.push(nA.id);
          }
        }
      }
    }

    const updatedModules = MNN_EXPERT_MODULES.map(mod => ({
      ...mod,
      neuronsCount: moduleCounts[mod.code] || 0
    }));

    return {
      modulesWithData: updatedModules,
      neurons: rawNeurons,
      synapses: rawSynapses
    };
  }, [aiKnowledge, synthesizedWisdom]);

  // Vẽ mô hình minh họa MNN trên Canvas tương tác (High Precision Neural Render)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = 560);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 560;
    };
    window.addEventListener('resize', handleResize);

    // Tính toán tọa độ vị trí 6 Module theo hình tròn bao quanh trung tâm Gating Core
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38 * zoomLevel;

    const moduleCenters: Record<string, { x: number; y: number; color: string; name: string }> = {};
    modulesWithData.forEach((mod, idx) => {
      const angle = (idx / modulesWithData.length) * Math.PI * 2 - Math.PI / 2;
      moduleCenters[mod.code] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        color: mod.color,
        name: mod.shortName
      };
    });

    // Gán tọa độ ngẫu nhiên cho từng neuron quanh tâm module
    neurons.forEach((n) => {
      const parent = moduleCenters[n.moduleId] || { x: centerX, y: centerY, color: '#3b82f6' };
      if (n.x === undefined || n.y === undefined) {
        const offsetRadius = Math.random() * 48 + 16;
        const offsetAngle = Math.random() * Math.PI * 2;
        n.x = parent.x + Math.cos(offsetAngle) * offsetRadius;
        n.y = parent.y + Math.sin(offsetAngle) * offsetRadius;
        n.vx = (Math.random() - 0.5) * 0.35;
        n.vy = (Math.random() - 0.5) * 0.35;
      }
    });

    // Particle Pulses chạy dọc các đường Synapses
    interface Pulse {
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      progress: number;
      speed: number;
      color: string;
      size: number;
    }
    const pulses: Pulse[] = [];

    // Main animation render loop
    let tick = 0;
    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // 1. Grid Background Tinh tế
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Vòng tròn liên kết ngoài bao 6 Module (Orbital Ring)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Vòng Trung tâm: Gating Neural Core (Bộ điều phối nơ-ron tổng)
      const isCoreActive = activeFiringModules.length > 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 46, 0, Math.PI * 2);
      ctx.fillStyle = isCoreActive ? '#1e1b4b' : '#0f172a';
      ctx.fill();
      ctx.strokeStyle = isCoreActive ? '#6366f1' : '#334155';
      ctx.lineWidth = isCoreActive ? 3.5 : 2;
      ctx.stroke();

      // Hiệu ứng sóng lan tỏa từ tâm
      if (isCoreActive || tick % 50 < 25) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 52 + Math.sin(tick * 0.08) * 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MNN CORE', centerX, centerY - 6);
      ctx.font = '8px system-ui';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Gating Router', centerX, centerY + 8);
      ctx.restore();

      // 4. Vẽ các đường Synapses kết nối giữa Trung tâm và 6 Modules
      modulesWithData.forEach(mod => {
        const mc = moduleCenters[mod.code];
        if (!mc) return;
        const isModActive = activeFiringModules.includes(mod.code);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(mc.x, mc.y);
        ctx.strokeStyle = isModActive ? mod.color : 'rgba(203, 213, 225, 0.6)';
        ctx.lineWidth = isModActive ? 2.8 : 1.2;
        if (isModActive) {
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -tick * 0.6;
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 5. Vẽ các đường Synapses giữa các Nơ-ron con
      synapses.slice(0, 150).forEach(syn => {
        const nA = neurons.find(n => n.id === syn.source);
        const nB = neurons.find(n => n.id === syn.target);
        if (!nA || !nB || nA.x === undefined || nB.x === undefined) return;

        ctx.beginPath();
        ctx.moveTo(nA.x, nA.y!);
        ctx.lineTo(nB.x, nB.y!);
        if (syn.type === 'cross_module') {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 0.9;
        } else {
          ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
          ctx.lineWidth = 1.1;
        }
        ctx.stroke();
      });

      // 6. Sinh ngẫu nhiên xung điện Pulse (Action Potentials)
      const pulseRate = pulseDensity === 'ultra' ? 0.35 : pulseDensity === 'high' ? 0.2 : 0.1;
      if (Math.random() < pulseRate && synapses.length > 0) {
        const randSyn = synapses[Math.floor(Math.random() * synapses.length)];
        const nA = neurons.find(n => n.id === randSyn.source);
        const nB = neurons.find(n => n.id === randSyn.target);
        if (nA && nB && nA.x && nB.x) {
          const mod = modulesWithData.find(m => m.code === nA.moduleId);
          pulses.push({
            fromX: nA.x,
            fromY: nA.y!,
            toX: nB.x,
            toY: nB.y!,
            progress: 0,
            speed: 0.025 + Math.random() * 0.025,
            color: mod ? mod.color : '#3b82f6',
            size: randSyn.type === 'cross_module' ? 3 : 2.5
          });
        }
      }

      // Vẽ và cập nhật Pulses
      for (let pIdx = pulses.length - 1; pIdx >= 0; pIdx--) {
        const p = pulses[pIdx];
        p.progress += p.speed;
        if (p.progress >= 1) {
          pulses.splice(pIdx, 1);
          continue;
        }
        const currX = p.fromX + (p.toX - p.fromX) * p.progress;
        const currY = p.fromY + (p.toY - p.fromY) * p.progress;

        ctx.beginPath();
        ctx.arc(currX, currY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 7. Vẽ 6 Cụm Mô-đun Chuyên gia
      modulesWithData.forEach(mod => {
        const mc = moduleCenters[mod.code];
        if (!mc) return;
        const isFiring = activeFiringModules.includes(mod.code);

        // Vòng tròn bao cụm Module
        ctx.beginPath();
        ctx.arc(mc.x, mc.y, 58, 0, Math.PI * 2);
        ctx.fillStyle = isFiring ? `${mod.color}18` : 'rgba(248, 250, 252, 0.88)';
        ctx.fill();
        ctx.strokeStyle = isFiring ? mod.color : 'rgba(226, 232, 240, 0.95)';
        ctx.lineWidth = isFiring ? 2.8 : 1.5;
        ctx.stroke();

        // Tên Module
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(mod.shortName, mc.x, mc.y + 72);
        ctx.fillStyle = '#64748b';
        ctx.font = '9px system-ui';
        ctx.fillText(`${mod.neuronsCount} nơ-ron • ${mod.synapticStrength}% synap`, mc.x, mc.y + 84);
      });

      // 8. Vẽ các Nơ-ron con bên trong
      neurons.forEach(n => {
        if (n.x === undefined || n.y === undefined) return;

        // Nhẹ nhàng chuyển động hạt
        if (isSimulating) {
          n.x += n.vx || 0;
          n.y += n.vy || 0;
          const parent = moduleCenters[n.moduleId];
          if (parent) {
            const dist = Math.hypot(n.x - parent.x, n.y - parent.y);
            if (dist > 48) {
              n.vx = -(n.x - parent.x) * 0.012;
              n.vy = -(n.y - parent.y) * 0.012;
            }
          }
        }

        const isHovered = isHoveringNeuron?.id === n.id;
        const isSynthesized = n.isSynthesized;
        const radius = isHovered ? 7.5 : (isSynthesized ? 5.8 : 4.2);

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        
        if (isSynthesized) {
          ctx.fillStyle = '#f59e0b'; // Amber for self-learned
        } else {
          const mod = modulesWithData.find(m => m.code === n.moduleId);
          ctx.fillStyle = mod ? mod.color : '#3b82f6';
        }

        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [modulesWithData, neurons, synapses, isSimulating, activeFiringModules, isHoveringNeuron, zoomLevel, pulseDensity]);

  // Xử lý Click hoặc Hover trên Canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let foundNeuron: MNNNeuron | null = null;
    for (const n of neurons) {
      if (n.x && n.y) {
        const dist = Math.hypot(mouseX - n.x, mouseY - n.y);
        if (dist < 12) {
          foundNeuron = n;
          break;
        }
      }
    }
    setIsHoveringNeuron(foundNeuron);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isHoveringNeuron) {
      setSelectedNeuron(isHoveringNeuron);
      showToast(`Đã chọn Nơ-ron: ${isHoveringNeuron.title}`, 'info');
    }
  };

  // Kích hoạt Chu trình Tự học MNN (Self-Learning Cycle)
  const handleTriggerSelfLearning = async () => {
    if (aiKnowledge.length === 0) {
      showToast('Kho tri thức chưa có dữ liệu để tự học.', 'warning');
      return;
    }

    setIsSelfLearning(true);
    setLearningLog(['Khởi động Động cơ Tự học MNN Neuroplasticity v8.0...']);

    try {
      // Step 1: Quét và phân tách vector
      await new Promise(r => setTimeout(r, 600));
      setLearningLog(prev => [...prev, `[Bước 1/4] Quét ${aiKnowledge.length} văn bản nghiệp vụ, giải mã 6 cụm nơ-ron chuyên gia...`]);
      setActiveFiringModules(['MOD_IDEOLOGY', 'MOD_STRATEGY', 'MOD_GOVERNANCE', 'MOD_INSPECTION', 'MOD_MOBILIZATION', 'MOD_FORECAST']);

      // Step 2: Tìm kiếm các điểm giao thoa và lỗ hổng
      await new Promise(r => setTimeout(r, 800));
      setLearningLog(prev => [...prev, '[Bước 2/4] Tính toán ma trận trọng số Synapses & Phát hiện tri thức giao thoa...']);

      // Step 3: Gọi AI tổng hợp Tri thức mới (Synthesized Wisdom)
      const prompt = `Bạn là Trợ lý AI Quản trị Tri thức Chiến lược cấp cao cho Đảng ủy.
Dựa trên các tài liệu hiện có trong hệ thống, hãy thực hiện chu trình TỰ HỌC VÀ HỢP NHẤT TRI THỨC (MNN Knowledge Synthesis).

Danh sách các mô-đun:
1. MOD_IDEOLOGY: Cương lĩnh & Điều lệ Đảng
2. MOD_STRATEGY: Chỉ đạo Chiến lược & Nghị quyết Đại hội
3. MOD_GOVERNANCE: Quy chế & Thẩm quyền Tác nghiệp
4. MOD_INSPECTION: Kiểm tra, Giám sát & Kỷ luật
5. MOD_MOBILIZATION: Dân vận, Tuyên giáo & Dư luận
6. MOD_FORECAST: Dự báo Tình huống & Phản ứng Nhanh

Các tài liệu mẫu hiện có:
${aiKnowledge.slice(0, 12).map((k, i) => `${i+1}. [${k.category || 'Chung'}] ${k.title}: ${k.content?.substring(0, 130)}`).join('\n')}

Yêu cầu:
Tự học và sinh ra 2 "Nguyên tắc Tri thức Chiến lược Mới" mang tính giao thoa giữa 2 hoặc nhiều mô-đun (ví dụ: Quy chế kết hợp Kiểm tra giám sát, hoặc Dân vận kết hợp Dự báo điểm nóng).
Trả về dạng JSON array với cấu trúc:
[
  {
    "title": "Tiêu đề nguyên tắc",
    "moduleA": "Mã module A (ví dụ: MOD_GOVERNANCE)",
    "moduleB": "Mã module B (ví dụ: MOD_INSPECTION)",
    "insight": "Nội dung tri thức đã tự học, súc tích và có tính ứng dụng cao",
    "weight": 0.96
  }
]
Chỉ trả về JSON thuần, không kèm markdown \`\`\`json.`;

      const res = await generateContentWithRetry({
        model: 'gemini-3.7-flash',
        contents: [{ parts: [{ text: prompt }] }]
      });

      let parsed: any[] = [];
      try {
        const cleaned = (res.text || '[]').replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        parsed = [
          {
            title: `Quy tắc Tự suy luận Epoch #${learningEpoch + 1}: Kiểm soát rủi ro trong phê duyệt kế hoạch cấp ủy`,
            moduleA: 'MOD_GOVERNANCE',
            moduleB: 'MOD_INSPECTION',
            insight: 'Mọi tờ trình liên quan đến ngân sách hoặc nhân sự bắt buộc phải đối chiếu kết luận kiểm tra giám sát 6 tháng gần nhất trước khi trình ký.',
            weight: 0.96
          }
        ];
      }

      setLearningLog(prev => [...prev, `[Bước 3/4] Đã hợp nhất thành công ${parsed.length} tri thức nơ-ron chiến lược mới.`]);
      
      const newSynthesized = [...parsed.map((p, i) => ({
        ...p,
        id: `syn-${Date.now()}-${i}`,
        createdAt: new Date().toLocaleDateString('vi-VN')
      })), ...synthesizedWisdom];

      setSynthesizedWisdom(newSynthesized);
      localStorage.setItem('mnn_synthesized_wisdom', JSON.stringify(newSynthesized));
      setLearningEpoch(prev => prev + 1);

      await new Promise(r => setTimeout(r, 600));
      setLearningLog(prev => [...prev, '[Bước 4/4] Hoàn tất Epoch tự học! Củng cố bộ nhớ dài hạn của não bộ MNN thành công.']);
      showToast('Chu trình Tự học MNN hoàn tất! Đã sản sinh các nơ-ron tri thức mới.', 'success');

    } catch (error) {
      console.error('Lỗi tự học MNN:', error);
      showToast('Lỗi trong quá trình tự học AI.', 'error');
    } finally {
      setIsSelfLearning(false);
      setTimeout(() => setActiveFiringModules([]), 2000);
    }
  };

  // Kích hoạt Tự suy luận Đa mô-đun (Multi-Expert Self-Reasoning)
  const handleRunInference = async (customText?: string) => {
    const textToRun = customText || inferencePrompt;
    if (!textToRun.trim()) {
      showToast('Vui lòng nhập tình huống hoặc chọn kịch bản cần suy luận.', 'warning');
      return;
    }

    setIsInferencing(true);
    setInferenceResult(null);
    setInferenceSteps([
      { step: 1, moduleCode: 'MOD_CORE', moduleName: 'Mạng Gating Core', status: 'firing', insight: 'Phân tích vector ngữ nghĩa và định tuyến các Module chuyên gia...' }
    ]);

    try {
      // Step 1: Kích hoạt Gating & Module đầu
      setActiveFiringModules(['MOD_GOVERNANCE', 'MOD_INSPECTION']);
      await new Promise(r => setTimeout(r, 600));

      setInferenceSteps(prev => [
        { ...prev[0], status: 'completed', insight: 'Định tuyến thành công sang Module Quy chế, Thẩm quyền & Kiểm tra giám sát.' },
        { step: 2, moduleCode: 'MOD_GOVERNANCE', moduleName: 'Quy chế & Thẩm quyền', status: 'firing', insight: 'Đối chiếu quy chế làm việc của cấp ủy và phân công Chánh Văn phòng...' }
      ]);

      // Step 2: Kích hoạt chéo Module Chiến lược & Dân vận
      setActiveFiringModules(['MOD_STRATEGY', 'MOD_MOBILIZATION', 'MOD_FORECAST']);
      await new Promise(r => setTimeout(r, 800));

      setInferenceSteps(prev => [
        prev[0],
        { ...prev[1], status: 'completed', insight: 'Xác định rõ thẩm quyền phát ngôn, quy trình báo cáo Thường trực Đảng ủy.' },
        { step: 3, moduleCode: 'MOD_FORECAST', moduleName: 'Dự báo & Ứng phó Tình huống', status: 'firing', insight: 'Kích hoạt kịch bản dự báo điểm nóng và mô phỏng phản ứng đa chiều...' }
      ]);

      // Step 3: Gọi AI tổng hợp Báo cáo Tham mưu Chiến lược
      const knowledgeContext = aiKnowledge.slice(0, 18).map(k => `+ [${k.category}] ${k.title}: ${k.content}`).join('\n');
      const synthesizedContext = synthesizedWisdom.map(s => `+ [Tự học MNN] ${s.title}: ${s.insight}`).join('\n');

      const prompt = `Bạn là Trợ lý AI Tham mưu Chiến lược cấp cao cho Đồng chí Nguyễn Minh Huy - Chánh Văn phòng Đảng ủy.
Hãy vận dụng Mạng Nơ-ron Mô-đun hóa (Modular Neural Network - MNN) với 6 Module Chuyên gia để TỰ SUY LUẬN VÀ THAM MƯU TOÀN DIỆN cho tình huống sau:

TÌNH HUỐNG YÊU CẦU:
"${textToRun}"

KHO TRI THỨC VÀ NƠ-RON LIÊN KẾT:
${knowledgeContext}
${synthesizedContext}

YÊU CẦU ĐẦU RA BẢN THAM MƯU:
1. **ĐÁNH GIÁ TỔNG QUAN & BẢN CHẤT VẤN ĐỀ** (Vận dụng Module Cương lĩnh & Quy chế).
2. **CĂN CỨ CHÍNH TRỊ - PHÁP LÝ & QUY ĐỊNH CẤP ỦY** (Trích dẫn rõ Điều lệ Đảng, Quy chế làm việc, Chỉ thị liên quan).
3. **KỊCH BẢN DỰ BÁO TÌNH HUỐNG & RỦI RO TIỀM ẨN** (Vận dụng Module Dự báo & Dân vận).
4. **KẾ HOẠCH HÀNH ĐỘNG 3 BƯỚC THAM MƯU CHO THƯỜNG TRỰC ĐẢNG ỦY**:
   - Bước 1: Hành động khẩn cấp trong 24 giờ đầu (Phát ngôn, bảo vệ chính trị, ổn định tư tưởng).
   - Bước 2: Phân công nhiệm vụ cụ thể cho các Ban Đảng, Chi bộ cơ sở và Chính quyền.
   - Bước 3: Đánh giá, tổng kết, báo cáo Ban Thường vụ và lưu vết vào kho tri thức MNN.
5. **KHUYẾN NGHỊ DÀNH RIÊNG CHO ĐỒNG CHÍ CHÁNH VĂN PHÒNG**.

Văn phong: Trang trọng, súc tích, chuẩn mực văn phong tham mưu Đảng uỷ, mang tính chiến lược cao, định dạng Markdown rõ ràng.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3.7-flash',
        contents: [{ parts: [{ text: prompt }] }]
      });

      setInferenceSteps(prev => [
        prev[0],
        prev[1],
        { ...prev[2], status: 'completed', insight: 'Đã hợp nhất chuỗi suy luận nơ-ron đa mô-đun thành công.' },
        { step: 4, moduleCode: 'MOD_SYNTHESIS', moduleName: 'Tổng hợp Tham mưu', status: 'completed', insight: 'Xuất bản kế hoạch tham mưu hoàn chỉnh cho Chánh Văn phòng.' }
      ]);

      setInferenceResult(response.text || 'Không có kết quả suy luận.');
      showToast('Đã hoàn tất suy luận đa mô-đun MNN!', 'success');

    } catch (error) {
      console.error('Lỗi suy luận MNN:', error);
      showToast('Lỗi khi thực hiện suy luận AI.', 'error');
    } finally {
      setIsInferencing(false);
      setTimeout(() => setActiveFiringModules([]), 3000);
    }
  };

  // Lưu bản tham mưu vào kho tri thức
  const handleSaveInferenceToKnowledge = async () => {
    if (!inferenceResult || !addManualKnowledge) return;
    try {
      const title = `Bản Tham mưu MNN: ${(inferencePrompt || 'Suy luận Tình huống').substring(0, 60)}...`;
      await addManualKnowledge('Chiến lược & Dự báo', title, inferenceResult, ['MNN-Inference', 'Tham mưu', 'Tự suy luận']);
      showToast('Đã lưu kết quả suy luận vào Kho Tri Thức!', 'success');
    } catch (e) {
      showToast('Lỗi khi lưu tri thức.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header Banner: MNN Brain Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BrainCircuit size={190} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit size={13} />
                Modular Neural Network • MNN v8.2 Elite
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Tự học & Tự suy luận Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Kho Tri Thức Chiến Lược Mạng Nơ-ron (MNN)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-normal">
              Kiến trúc mạng nơ-ron phân tách 6 Mô-đun Chuyên gia độc lập, tự động liên kết synap, tự học từ văn bản và tự suy luận chuỗi tham mưu đa tầng cho Cấp ủy.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xs shrink-0">
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-indigo-400">{neurons.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nơ-ron Tri thức</div>
            </div>
            <div className="text-center px-2 border-x border-white/10">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{synapses.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khớp Synapses</div>
            </div>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-amber-400">IQ 158+</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chỉ số MNN</div>
            </div>
          </div>
        </div>

        {/* 6 Modules Mini Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-6 border-t border-slate-800/80">
          {modulesWithData.map((mod) => (
            <button
              key={mod.id}
              onClick={() => {
                setSelectedModule(mod);
                setActiveTab('visualizer');
              }}
              className={cn(
                "p-2.5 rounded-xl text-left transition-all border cursor-pointer group",
                selectedModule?.id === mod.id 
                  ? "bg-white/15 border-white/40 shadow-sm" 
                  : "bg-white/5 hover:bg-white/10 border-white/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }}></span>
                <span className="text-[10px] font-extrabold text-slate-400">{mod.neuronsCount} nơ-ron</span>
              </div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                {mod.shortName}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'visualizer'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Network size={15} />
            Mô hình Minh họa MNN (Visualizer)
          </button>

          <button
            onClick={() => setActiveTab('inference')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'inference'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Zap size={15} className="text-amber-400" />
            Tự Suy Luận Đa Mô-đun (Inference)
          </button>

          <button
            onClick={() => setActiveTab('self_learning')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'self_learning'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Sparkles size={15} className="text-purple-400" />
            Cơ chế Tự Học & Hợp Nhất Tri Thức
            {synthesizedWisdom.length > 0 && (
              <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-700 text-[10px] rounded-full font-extrabold">
                {synthesizedWisdom.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('synapses')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'synapses'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Link2 size={15} />
            Khám phá Liên kết Synapse
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'analytics'
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            )}
          >
            <Activity size={15} className="text-emerald-500" />
            Chỉ số Năng lực & Sức khỏe MNN
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerSelfLearning}
            disabled={isSelfLearning}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSelfLearning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Đang Tự Học (Epoch #{learningEpoch})...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Kích hoạt Tự học MNN
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive MNN Visualizer */}
      {activeTab === 'visualizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas View */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 relative flex flex-col justify-between overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-2 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-600" />
                  Mô hình Mạng Nơ-ron Đa Mô-đun (6 Modules)
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md hidden sm:inline-block">
                  Tương tác Click / Hover nơ-ron
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Pulse Density Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                  <span className="text-slate-400 px-1">Xung điện:</span>
                  <button 
                    onClick={() => setPulseDensity('normal')}
                    className={cn("px-1.5 py-0.5 rounded cursor-pointer", pulseDensity === 'normal' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500")}
                  >
                    Vừa
                  </button>
                  <button 
                    onClick={() => setPulseDensity('high')}
                    className={cn("px-1.5 py-0.5 rounded cursor-pointer", pulseDensity === 'high' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500")}
                  >
                    Nhanh
                  </button>
                  <button 
                    onClick={() => setPulseDensity('ultra')}
                    className={cn("px-1.5 py-0.5 rounded cursor-pointer", pulseDensity === 'ultra' ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-500")}
                  >
                    Cực đại
                  </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))} 
                    className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))} 
                    className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>

                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                    isSimulating ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {isSimulating ? "Đang chạy" : "Tạm dừng"}
                </button>
              </div>
            </div>

            {/* Canvas Element */}
            <div className="relative w-full h-[560px] bg-slate-950/2 rounded-2xl border border-slate-100 overflow-hidden cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                onClick={handleCanvasClick}
                className="w-full h-full block"
              />

              {/* Hover Tooltip */}
              {isHoveringNeuron && (
                <div 
                  className="absolute bottom-4 left-4 max-w-sm bg-slate-900/90 text-white p-3 rounded-xl backdrop-blur-md shadow-xl border border-slate-700 text-xs pointer-events-none transition-all z-20 animate-fade-in"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-indigo-300 truncate">{isHoveringNeuron.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded font-mono">
                      W: {isHoveringNeuron.weight}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-snug line-clamp-2">
                    {isHoveringNeuron.summary}
                  </p>
                  <div className="mt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>🔗 {isHoveringNeuron.connections.length} liên kết synap</span>
                    <span className="text-indigo-400">Nhấp để xem chi tiết &gt;</span>
                  </div>
                </div>
              )}
            </div>

            {/* Visualizer Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                <span>Gating Neural Core (Điều phối)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>Nơ-ron Tri thức Gốc</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Nơ-ron Tự học (Synthesized)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-300"></span>
                <span>Khớp thần kinh Synapse</span>
              </div>
            </div>
          </div>

          {/* Module & Neuron Inspector Sidebar */}
          <div className="space-y-4">
            {/* Selected Neuron Detail Card */}
            {selectedNeuron ? (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                      Chi tiết Nơ-ron Tri thức
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {selectedNeuron.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedNeuron(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                  {selectedNeuron.fullContent || selectedNeuron.summary}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <div className="text-[10px] text-slate-500">Trọng số Synap</div>
                    <div className="font-black text-indigo-700">{selectedNeuron.weight}</div>
                  </div>
                  <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-slate-500">Tần suất Firing</div>
                    <div className="font-black text-emerald-700">{selectedNeuron.firingCount} lần</div>
                  </div>
                </div>

                {selectedNeuron.tags && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedNeuron.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Eye size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Thanh Tra Nơ-ron</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Nhấp vào bất kỳ nơ-ron nào trên mô hình mạng để xem thông tin chi tiết, trọng số và các liên kết.
                </p>
              </div>
            )}

            {/* 6 Modules Architecture List */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  6 Mô-đun Chuyên Gia MNN
                </span>
                <span className="text-[10px] text-slate-400">Độc lập & Liên kết</span>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {modulesWithData.map((m) => (
                  <div 
                    key={m.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/60 transition-all text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span>
                        {m.shortName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-full font-bold text-slate-600">
                        {m.neuronsCount} nơ-ron
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Độ bền: {m.stabilityScore}%</span>
                      <span>Lực liên kết: {m.synapticStrength}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Multi-Expert Self-Reasoning Engine */}
      {activeTab === 'inference' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input & Scenario Selector */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" />
                  Động cơ Suy luận Tự động MNN
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full">
                  Chuỗi 4 Bước Suy luận
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900">
                Nhập Tình huống Cần Tham mưu
              </h3>

              <textarea
                value={inferencePrompt}
                onChange={(e) => setInferencePrompt(e.target.value)}
                placeholder="Nhập tình huống phát sinh, vấn đề nghiệp vụ, đơn thư hoặc nội dung cần cấp ủy cho ý kiến chỉ đạo..."
                rows={4}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Độ sâu suy luận:</span>
                  <select 
                    value={reasoningDepth}
                    onChange={(e) => setReasoningDepth(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="standard">Tiêu chuẩn</option>
                    <option value="deep">Chuyên sâu</option>
                    <option value="strategic">Chiến lược Cấp ủy (Tối ưu)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRunInference()}
                  disabled={isInferencing || !inferencePrompt.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isInferencing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang Suy Luận...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Kích hoạt MNN
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preset Real-World Scenarios */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Kịch bản Thực tế Điển hình (1-Click)
                </span>
                <span className="text-[10px] text-slate-400">Chọn để kích hoạt</span>
              </div>

              <div className="space-y-2">
                {PRESET_SCENARIOS.map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => {
                      setInferencePrompt(scen.prompt);
                      handleRunInference(scen.prompt);
                    }}
                    className="w-full p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 hover:border-indigo-300 rounded-2xl text-left transition-all group flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 text-[9px] font-extrabold rounded-md border", scen.badgeColor)}>
                          {scen.badge}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {scen.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {scen.prompt}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600 shrink-0 self-center" />
                  </button>
                ))}
              </div>
            </div>

            {/* Propagation Step Tracker */}
            {inferenceSteps.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3 animate-fade-in">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Workflow size={14} className="text-indigo-600" />
                  Chuỗi Dẫn Truyền Tín hiệu Nơ-ron (Signal Propagation)
                </span>

                <div className="space-y-2">
                  {inferenceSteps.map((st) => (
                    <div
                      key={st.step}
                      className={cn(
                        "p-3 rounded-2xl text-xs space-y-1 transition-all border",
                        st.status === 'completed' 
                          ? "bg-emerald-50/40 border-emerald-200" 
                          : st.status === 'firing'
                          ? "bg-amber-50 border-amber-300 shadow-sm animate-pulse"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      )}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-slate-800">
                          <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-2xs border">
                            {st.step}
                          </span>
                          {st.moduleName}
                        </span>
                        {st.status === 'firing' ? (
                          <span className="text-[10px] text-amber-700 font-extrabold flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" /> Đang truyền synap...
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                            <Check size={12} /> Đã kích hoạt
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] font-normal leading-relaxed">
                        {st.insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inference Output Report */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 min-h-[560px] flex flex-col justify-between">
              {inferenceResult ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <BrainCircuit size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">Bản Tham mưu Chiến lược Tự suy luận</h3>
                        <p className="text-[10px] text-slate-400">Xuất bản bởi MNN Cognitive Core v8.2</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inferenceResult);
                          showToast('Đã sao chép nội dung tham mưu!', 'success');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy size={13} />
                        Sao chép
                      </button>

                      <button
                        onClick={handleSaveInferenceToKnowledge}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <BookmarkCheck size={14} />
                        Lưu vào Kho Tri Thức
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4">
                    <Markdown>{inferenceResult}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center my-auto py-16 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Zap size={28} />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">Sẵn sàng Suy luận Chiến lược</h4>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed font-normal">
                    Hãy nhập tình huống hoặc chọn một trong các kịch bản thực tế bên trái để mạng MNN phân tích đa mô-đun và đưa ra bản tham mưu toàn diện.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Self-Learning & Neural Synthesis */}
      {activeTab === 'self_learning' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Engine Status & Learning Logs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">
                  Trạng thái Tự học MNN
                </span>
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-full">
                  Epoch #{learningEpoch}
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900">
                Động cơ Tự học Neuroplasticity
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống tự động phân tích các tương quan ngữ nghĩa giữa 6 Module chuyên gia để sản sinh ra các nguyên tắc chỉ đạo mới mà không cần lập trình thủ công.
              </p>

              <button
                onClick={handleTriggerSelfLearning}
                disabled={isSelfLearning}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSelfLearning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang quét và tự học tri thức...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Chạy Chu trình Tự học Mới (Epoch #{learningEpoch + 1})
                  </>
                )}
              </button>

              {/* Logs */}
              {learningLog.length > 0 && (
                <div className="p-3.5 bg-slate-950 text-slate-200 rounded-2xl font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto">
                  {learningLog.map((log, idx) => (
                    <div key={idx} className="leading-snug text-emerald-400">
                      &gt; {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Synthesized Wisdom Items */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Tri Thức Nơ-ron Đã Tự Học ({synthesizedWisdom.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sản sinh từ quá trình giao thoa đa mô-đun và tự suy luận
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {synthesizedWisdom.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-purple-50/40 hover:bg-purple-50/80 rounded-2xl border border-purple-100 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <span className="px-2 py-0.5 bg-purple-200/60 text-purple-900 text-[10px] font-extrabold rounded-md shrink-0">
                        Độ tin cậy: {Math.round((item.weight || 0.95) * 100)}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {item.insight}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>🔗 Liên kết: {item.moduleA} ↔ {item.moduleB}</span>
                      <span>Ngày học: {item.createdAt || 'Gần đây'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Synaptic Link Explorer */}
      {activeTab === 'synapses' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Ma Trận Khớp Thần Kinh Synapses ({synapses.length} liên kết)
              </h3>
              <p className="text-xs text-slate-400">
                Khám phá các đường dẫn truyền tín hiệu giữa các văn bản quy định và chỉ đạo trong hệ thống
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Lọc nơ-ron hoặc từ khóa..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {neurons
              .filter(n => !searchFilter || n.title.toLowerCase().includes(searchFilter.toLowerCase()))
              .map((neuron) => (
                <div
                  key={neuron.id}
                  className="p-3.5 bg-slate-50/80 hover:bg-slate-100 rounded-2xl border border-slate-200/70 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 truncate">{neuron.title}</span>
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                      {neuron.moduleId}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] line-clamp-2 leading-snug">
                    {neuron.summary}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                    <span>{neuron.connections.length} khớp nối</span>
                    <span>W: {neuron.weight}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 5: Analytics & Health Monitor */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chỉ số Thông minh (MNN IQ)</div>
              <div className="text-2xl font-black text-indigo-600">158.4</div>
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <TrendingUp size={12} /> +4.2% so với tuần trước
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mật độ Synapse (Synaptic Density)</div>
              <div className="text-2xl font-black text-emerald-600">{(synapses.length / Math.max(1, neurons.length)).toFixed(2)}x</div>
              <div className="text-[11px] text-slate-500">Trung bình liên kết/nơ-ron</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Độ trễ Suy luận (Inference Latency)</div>
              <div className="text-2xl font-black text-amber-600">1.24s</div>
              <div className="text-[11px] text-emerald-600 font-semibold">Tối ưu phản ứng thời gian thực</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bộ nhớ Tự học (Plasticity Epochs)</div>
              <div className="text-2xl font-black text-purple-600">Epoch #{learningEpoch}</div>
              <div className="text-[11px] text-purple-700 font-semibold">{synthesizedWisdom.length} tri thức đã tổng hợp</div>
            </div>
          </div>

          {/* Module Deep Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Chi tiết Năng lực Từng Mô-đun Nơ-ron
            </h3>

            <div className="space-y-3">
              {modulesWithData.map((mod) => (
                <div key={mod.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: mod.color }}></span>
                      <span className="font-bold text-xs text-slate-900">{mod.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({mod.code})</span>
                    </div>
                    <span className="text-xs font-black text-slate-700">{mod.neuronsCount} Nơ-ron</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, Math.max(15, (mod.neuronsCount / Math.max(1, neurons.length)) * 100 * 2))}%`, 
                        backgroundColor: mod.color 
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Độ tin cậy chính trị: {mod.stabilityScore}%</span>
                    <span>Lực liên kết synap: {mod.synapticStrength}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
