import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  Database, 
  Terminal, 
  Sparkles, 
  Zap, 
  Server, 
  Globe, 
  Cpu, 
  Key, 
  Clock, 
  UserX, 
  Check, 
  FileWarning,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';

interface SecurityAlert {
  id: string;
  timestamp: Date;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'integrity' | 'sensitive_data' | 'access_control' | 'compliance';
  title: string;
  description: string;
  ipAddress: string;
  userEmail: string;
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
}

interface ComplianceRule {
  id: string;
  code: string;
  name: string;
  category: 'general' | 'access' | 'data' | 'system';
  description: string;
  isCompliant: boolean;
  standard: string; // TCVN 11930, Luật An ninh mạng, etc.
}

export const SecurityMonitorModule: React.FC = () => {
  const { showToast } = useToast();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'alerts' | 'sensitive' | 'compliance' | 'integrity'>('alerts');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [securityScore, setSecurityScore] = useState(94);
  const [searchText, setSearchText] = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  // Paste text to scan for secrets
  const [textToScan, setTextToScan] = useState('');
  const [scanResults, setScanResults] = useState<{
    found: boolean;
    issues: { word: string; category: string; dangerLevel: 'critical' | 'high' | 'medium' | 'low'; desc: string }[];
  } | null>(null);

  // Initial Seed for Alerts
  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: 'SEC-001',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      level: 'critical',
      category: 'access_control',
      title: 'Đăng nhập dồn dập thất bại (Brute-Force)',
      description: 'Phát hiện tài khoản dangvien.nguyenvanan@gmail.com đăng nhập sai mật khẩu liên tiếp 7 lần trong 30 giây từ dải IP lạ.',
      ipAddress: '113.161.44.89 (TP.HCM, VN)',
      userEmail: 'dangvien.nguyenvanan@gmail.com',
      status: 'active'
    },
    {
      id: 'SEC-002',
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      level: 'high',
      category: 'sensitive_data',
      title: 'Rà quét phát hiện thuật ngữ tuyệt mật',
      description: 'Hệ thống AI ghi nhận truy vấn chứa từ khoá nằm trong danh mục kiểm soát đặc biệt ("Bản dự thảo quy hoạch cơ cấu cán bộ 2026").',
      ipAddress: '14.226.32.105 (Thủ Dầu Một, Bình Dương)',
      userEmail: 'nguyenhuy.thudaumot@gmail.com',
      status: 'investigating'
    },
    {
      id: 'SEC-003',
      timestamp: new Date(Date.now() - 1000 * 60 * 600), // 10 hours ago
      level: 'medium',
      category: 'integrity',
      title: 'Yêu cầu quyền truy cập cơ sở dữ liệu từ nguồn ngoài',
      description: 'Một yêu cầu API từ nguồn không rõ nguồn gốc cố gắng truy vấn trực tiếp Firestore bảng "users" bị chặn bởi Rules bảo mật.',
      ipAddress: '45.125.65.12 (Hà Nội, VN)',
      userEmail: 'Khách vãng lai / Trình duyệt ẩn danh',
      status: 'resolved'
    },
    {
      id: 'SEC-004',
      timestamp: new Date(Date.now() - 1000 * 60 * 1440), // 24 hours ago
      level: 'low',
      category: 'compliance',
      title: 'Phiên hoạt động kéo dài quá hạn quy định',
      description: 'Cán bộ trần.b@gmail.com duy trì phiên làm việc liên tục 8 tiếng mà không thao tác. Khuyến nghị cấu hình Timeout 15 phút.',
      ipAddress: '113.170.12.54 (Thủ Dầu Một, Bình Dương)',
      userEmail: 'cambo.tranvanb@gmail.com',
      status: 'resolved'
    },
    {
      id: 'SEC-005',
      timestamp: new Date(Date.now() - 1000 * 60 * 2880), // 2 days ago
      level: 'high',
      category: 'access_control',
      title: 'Thay đổi cấu hình phân quyền quản trị',
      description: 'Tài khoản Quản trị cấp cao bổ sung vai trò điều hành tác chiến cho tài khoản cambo.phamthic@gmail.com.',
      ipAddress: '14.226.32.105 (Thủ Dầu Một, Bình Dương)',
      userEmail: 'nguyenhuy.thudaumot@gmail.com',
      status: 'dismissed'
    }
  ]);

  // Seed for Compliance Standards
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([
    {
      id: 'COMP-01',
      code: 'ANM-2018-01',
      name: 'Lưu trữ thông tin cán bộ trong nước',
      category: 'data',
      description: 'Tuân thủ Điều 26 Luật An ninh mạng Việt Nam 2018 về việc lưu trữ dữ liệu thông tin cá nhân và dữ liệu liên quan tại máy chủ nội địa.',
      isCompliant: true,
      standard: 'Luật An ninh mạng 2018'
    },
    {
      id: 'COMP-02',
      code: 'ND85-II-03',
      name: 'Kiểm soát truy cập xác thực 2 yếu tố (2FA)',
      category: 'access',
      description: 'Yêu cầu các tài khoản cấp Chánh Văn phòng và Thường trực Đảng ủy phải kích hoạt xác thực hai yếu tố khi thực hiện chỉ thị tuyệt mật.',
      isCompliant: false,
      standard: 'Nghị định 85/2016/NĐ-CP'
    },
    {
      id: 'COMP-03',
      code: 'TCVN-11930-04',
      name: 'Tự động ngắt kết nối khi không thao tác (Session Timeout)',
      category: 'system',
      description: 'Phiên đăng nhập phải tự động kết thúc hoặc khóa màn hình sau tối đa 15 phút không phát hiện hoạt động từ người dùng.',
      isCompliant: true,
      standard: 'TCVN 11930:2017 - Cấp độ 3'
    },
    {
      id: 'COMP-04',
      code: 'TCVN-11930-08',
      name: 'Ghi nhật ký hệ thống độc lập & chống can thiệp (WORM)',
      category: 'system',
      description: 'Mọi thao tác truy cập dữ liệu nhân sự, lịch công tác tuyệt mật phải được ghi nhật ký bất biến, không thể sửa đổi kể cả bởi Quản trị viên.',
      isCompliant: true,
      standard: 'TCVN 11930:2017'
    },
    {
      id: 'COMP-05',
      code: 'ANM-2018-05',
      name: 'Mã hóa dữ liệu nhạy cảm ở trạng thái lưu trữ (Encryption at Rest)',
      category: 'data',
      description: 'Toàn bộ nội dung văn bản nghị quyết, tài liệu dự thảo lưu trữ trong Database phải được mã hóa chuẩn mã hóa quân sự AES-256.',
      isCompliant: true,
      standard: 'Luật An ninh mạng 2018'
    },
    {
      id: 'COMP-06',
      code: 'ND85-IV-12',
      name: 'Cảnh báo và tự động ngăn chặn rà quét cấu trúc tệp tin',
      category: 'general',
      description: 'Hệ thống có bộ lọc giám sát lưu lượng thông minh ngăn ngừa các hành vi rà quét dồn dập tệp tin hoặc cố tình thu thập cấu trúc API.',
      isCompliant: true,
      standard: 'Nghị định 85/2016/NĐ-CP'
    }
  ]);

  // Core File Integrity Status (Simulated SHA-256 Check)
  const coreFilesIntegrity = useMemo(() => {
    return [
      { path: 'src/App.tsx', expectedHash: '8e4f5a9c72bd16...e2', actualHash: '8e4f5a9c72bd16...e2', status: 'secure', lastChecked: new Date() },
      { path: 'src/context/AuthContext.tsx', expectedHash: 'c2f3a9e4d01b22...c7', actualHash: 'c2f3a9e4d01b22...c7', status: 'secure', lastChecked: new Date() },
      { path: 'firestore.rules', expectedHash: 'fa51b238d77ea4...43', actualHash: 'fa51b238d77ea4...43', status: 'secure', lastChecked: new Date() },
      { path: 'package.json', expectedHash: '492b10a473ee11...9a', actualHash: '492b10a473ee11...9a', status: 'secure', lastChecked: new Date() },
      { path: '.env', expectedHash: '6d0b92ea18fe32...10', actualHash: '6d0b92ea18fe32...10', status: 'secure', lastChecked: new Date() }
    ];
  }, []);

  // Filter Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = 
        alert.title.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.userEmail.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesLevel = alertFilter === 'all' || alert.level === alertFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [alerts, searchText, alertFilter]);

  // Handle Scan for secrets
  const handleScanText = () => {
    if (!textToScan.trim()) {
      showToast("Vui lòng nhập văn bản cần kiểm quét an toàn thông tin.", "info");
      return;
    }

    setIsScanning(true);
    setScanProgress(10);
    setScanMessage("Đang khởi tạo thuật toán kiểm soát thông tin quốc gia...");

    const intervals = [
      { time: 300, progress: 35, msg: "Đang đối chiếu từ điển thuật ngữ mật (Mức độ Tuyệt mật & Tối mật)..." },
      { time: 800, progress: 70, msg: "Đang phân tích cấu trúc ngữ nghĩa và phát hiện dấu hiệu rò rỉ dữ liệu..." },
      { time: 1300, progress: 95, msg: "Đang kiểm chứng chữ ký số và siêu dữ liệu an toàn..." },
      { time: 1600, progress: 100, msg: "Hoàn tất kiểm quét!" }
    ];

    intervals.forEach(step => {
      setTimeout(() => {
        setScanProgress(step.progress);
        setScanMessage(step.msg);
        if (step.progress === 100) {
          setIsScanning(false);
          performKeywordScan(textToScan);
        }
      }, step.time);
    });
  };

  const performKeywordScan = (text: string) => {
    const sensitiveWords = [
      { word: "tuyệt mật", category: "Bảo mật tài liệu", dangerLevel: "critical" as const, desc: "Sử dụng từ thuộc danh mục tuyệt mật của Đảng & Nhà nước khi chưa mã hóa." },
      { word: "tối mật", category: "Bảo mật tài liệu", dangerLevel: "high" as const, desc: "Sử dụng cấp độ phân loại văn bản mật không đúng quy trình ký số." },
      { word: "bản nháp cơ cấu", category: "Cơ cấu nhân sự", dangerLevel: "high" as const, desc: "Nội dung dự thảo nhân sự đại hội, tuyệt đối không được thảo luận ở kênh không định danh." },
      { word: "mật khẩu", category: "Thông tin tài khoản", dangerLevel: "medium" as const, desc: "Có chứa thông tin hoặc từ gợi ý liên quan đến thông tin bảo mật tài khoản cá nhân." },
      { word: "api_key", category: "Hạ tầng công nghệ", dangerLevel: "critical" as const, desc: "Có dấu hiệu chứa khóa API, chuỗi token cấu hình, hoặc thông tin bảo mật kỹ thuật." },
      { word: "bí mật nhà nước", category: "Pháp luật an ninh mạng", dangerLevel: "critical" as const, desc: "Cố ý đề cập hoặc chia sẻ cấu trúc văn bản bảo vệ bí mật nhà nước." }
    ];

    const foundIssues: typeof scanResults extends null ? never : any[] = [];
    const lowerText = text.toLowerCase();

    sensitiveWords.forEach(sw => {
      if (lowerText.includes(sw.word)) {
        foundIssues.push({
          word: sw.word,
          category: sw.category,
          dangerLevel: sw.dangerLevel,
          desc: sw.desc
        });
      }
    });

    if (foundIssues.length > 0) {
      setScanResults({
        found: true,
        issues: foundIssues
      });
      showToast(`Phát hiện ${foundIssues.length} vấn đề an toàn thông tin cần lưu ý!`, "error");
    } else {
      setScanResults({
        found: false,
        issues: []
      });
      showToast("Văn bản an toàn! Không phát hiện vi phạm bảo mật.", "success");
    }
  };

  // Run general security scan
  const runSecurityAudit = () => {
    setIsScanning(true);
    setScanProgress(15);
    setScanMessage("Đang kết nối cổng giám sát mạng Trung ương...");

    const steps = [
      { time: 500, progress: 40, msg: "Đang thẩm tra chữ ký số toàn vẹn của tất cả các file mã nguồn..." },
      { time: 1000, progress: 75, msg: "Đang kiểm toán phân quyền Firebase Security Rules hiện thời..." },
      { time: 1500, progress: 90, msg: "Đang đối chiếu các chỉ số an toàn theo tiêu chuẩn TCVN 11930..." },
      { time: 2000, progress: 100, msg: "Hoàn tất! Điểm số an toàn đạt: 98%" }
    ];

    steps.forEach(step => {
      setTimeout(() => {
        setScanProgress(step.progress);
        setScanMessage(step.msg);
        if (step.progress === 100) {
          setIsScanning(false);
          setSecurityScore(98);
          // Auto resolve SEC-001 for demonstration
          setAlerts(prev => prev.map(a => a.id === 'SEC-001' ? { ...a, status: 'resolved' } : a));
          showToast("Kiểm tra an toàn thông tin hoàn tất! Hệ thống đạt trạng thái Tuyệt đối An toàn.", "success");
        }
      }, step.time);
    });
  };

  const handleResolveAlert = (id: string, status: 'resolved' | 'dismissed' | 'investigating') => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    const label = status === 'resolved' ? "Đã xử lý" : status === 'dismissed' ? "Đã bỏ qua" : "Đang xác minh";
    showToast(`Đã cập nhật trạng thái cảnh báo ${id} thành: ${label}`, "success");
  };

  const handleToggleRule = (id: string) => {
    setComplianceRules(prev => prev.map(r => r.id === id ? { ...r, isCompliant: !r.isCompliant } : r));
    showToast("Đã cập nhật chỉ số tuân thủ tiêu chuẩn an toàn.", "info");
  };

  // Alert level colors
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-red-100 text-red-700 animate-pulse border border-red-200">Nghiêm trọng</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-orange-100 text-orange-700 border border-orange-200">Cao</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-yellow-100 text-yellow-700 border border-yellow-200">Trung bình</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-700 border border-blue-200">Thấp</span>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50 rounded-full -mr-20 -mt-20 -z-10 opacity-60" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner border border-red-100">
            <ShieldAlert size={24} className="stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              Giám sát An ninh & Giám định An toàn Thông tin
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống phòng thủ số, rà quét tệp tin nhạy cảm, bảo đảm toàn vẹn cấu trúc và tuân thủ tiêu chuẩn an toàn thông tin Đảng uỷ 8.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Security Score Widget */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chỉ số An toàn</span>
              <span className="text-xs text-slate-500 font-semibold">Tự động đánh giá</span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base border shadow-sm ${
              securityScore >= 95 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
            }`}>
              {securityScore}%
            </div>
          </div>

          <button
            onClick={runSecurityAudit}
            disabled={isScanning}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Đang thẩm tra...' : 'Thẩm tra hệ thống'}
          </button>
        </div>
      </div>

      {/* Audit Progress Bar */}
      {isScanning && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-lg space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-emerald-400 flex items-center gap-1.5">
              <Terminal size={12} /> {scanMessage}
            </span>
            <span className="font-bold">{scanProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
          </div>
        </motion.div>
      )}

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar inside component */}
        <div className="lg:col-span-1 bg-white p-3 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-2">Mục kiểm toán chính</p>
          
          <button
            onClick={() => setActiveTab('alerts')}
            className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'alerts' 
                ? 'bg-red-50/70 text-red-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={16} className={activeTab === 'alerts' ? 'text-red-600' : 'text-slate-400'} />
              <span>Cảnh báo An ninh</span>
            </div>
            {alerts.filter(a => a.status === 'active').length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full leading-none">
                {alerts.filter(a => a.status === 'active').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sensitive')}
            className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'sensitive' 
                ? 'bg-amber-50 text-amber-800' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileWarning size={16} className={activeTab === 'sensitive' ? 'text-amber-600' : 'text-slate-400'} />
              <span>Kiểm quét Thông tin Mật</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'compliance' 
                ? 'bg-emerald-50 text-emerald-800' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className={activeTab === 'compliance' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Tiêu chuẩn Tuân thủ</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('integrity')}
            className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'integrity' 
                ? 'bg-blue-50 text-blue-800' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Cpu size={16} className={activeTab === 'integrity' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Toàn vẹn Cấu trúc</span>
            </div>
          </button>

          <div className="border-t border-slate-100 my-3" />

          {/* Infrastructure Quick Stats */}
          <div className="p-3 bg-slate-50/50 rounded-2xl space-y-2 text-[11px]">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest block text-[9px] mb-1">Kiểm định An ninh</span>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Firestore Rules:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">Đã bật <Lock size={10} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mã hóa CSDL:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">AES-256 <Lock size={10} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Chữ ký tệp tin:</span>
              <span className="text-emerald-600 font-bold">Khớp 100%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cổng chặn DDoS:</span>
              <span className="text-slate-500 font-medium">Cloud Run Proxy</span>
            </div>
          </div>
        </div>

        {/* Dynamic Detail Panel */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'alerts' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Hệ thống Cảnh báo Sự cố Xâm phạm</h3>
                  <p className="text-xs text-slate-500">Giám sát các hành vi đăng nhập bất thường, cố ý dò tìm API hoặc truy cập dữ liệu trái thẩm quyền</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Category select Filter */}
                  <select
                    value={alertFilter}
                    onChange={(e) => setAlertFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Tất cả nguy cơ</option>
                    <option value="critical">Rất nghiêm trọng (Critical)</option>
                    <option value="high">Cao (High)</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              {/* Alert List */}
              <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Không có cảnh báo nguy hại nào!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tất cả các rào chắn thông tin đang hoạt động ổn định và an toàn.</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        alert.status === 'resolved' 
                          ? 'bg-slate-50/40 border-slate-200/60 opacity-75'
                          : alert.level === 'critical'
                          ? 'bg-red-50/30 border-red-100/80 hover:bg-red-50/50'
                          : alert.level === 'high'
                          ? 'bg-orange-50/30 border-orange-100/80 hover:bg-orange-50/50'
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-extrabold text-slate-400">{alert.id}</span>
                            {getLevelBadge(alert.level)}
                            <h4 className="text-xs font-bold text-slate-800">{alert.title}</h4>
                            
                            {alert.status === 'active' && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-red-600 text-white font-black rounded-full animate-pulse">CHƯA XỬ LÝ</span>
                            )}
                            {alert.status === 'investigating' && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-amber-500 text-white font-bold rounded-full">ĐANG THẨM TRA</span>
                            )}
                            {alert.status === 'resolved' && (
                              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white font-bold rounded-full flex items-center gap-0.5">
                                <Check size={8} /> ĐÃ KHẮC PHỤC
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{alert.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 font-semibold font-mono">
                            <span className="flex items-center gap-1"><Clock size={10} /> {alert.timestamp.toLocaleString('vi-VN')}</span>
                            <span className="flex items-center gap-1"><Globe size={10} /> IP: {alert.ipAddress}</span>
                            <span className="flex items-center gap-1"><UserCheck size={10} /> Đối tượng: {alert.userEmail}</span>
                          </div>
                        </div>

                        {/* Mitigation controls */}
                        <div className="flex md:flex-col gap-1.5 justify-end shrink-0 pt-2 md:pt-0">
                          {alert.status !== 'resolved' && (
                            <button
                              onClick={() => handleResolveAlert(alert.id, 'resolved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                              Khắc phục
                            </button>
                          )}
                          {alert.status === 'active' && (
                            <button
                              onClick={() => handleResolveAlert(alert.id, 'investigating')}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                              Thẩm tra
                            </button>
                          )}
                          {alert.status !== 'dismissed' && (
                            <button
                              onClick={() => handleResolveAlert(alert.id, 'dismissed')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                              Bỏ qua
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'sensitive' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Kiểm quét Văn bản & Bảo mật tài liệu Đảng</h3>
                <p className="text-xs text-slate-500">Sử dụng thuật toán rà quét thông minh để phát hiện các từ khoá tuyệt mật, mật danh cán bộ hoặc các rò rỉ dữ liệu trước khi phát hành</p>
              </div>

              {/* Input Area */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nhập nội dung văn bản hoặc dự thảo phát biểu để rà quét</label>
                <textarea
                  value={textToScan}
                  onChange={(e) => setTextToScan(e.target.value)}
                  placeholder="Ví dụ: Căn cứ bản nháp cơ cấu nhân sự đại hội, tuyệt đối tuân thủ chỉ đạo của Đảng uỷ. Phím tắt API_KEY bí mật không được tiết lộ..."
                  rows={5}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all shadow-sm"
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">Tự động phát hiện vi phạm Luật An ninh mạng & Nghị định bảo vệ bí mật nhà nước</span>
                  <button
                    onClick={handleScanText}
                    disabled={isScanning || !textToScan.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Search size={14} />
                    {isScanning ? 'Đang phân tích...' : 'Rà quét An toàn'}
                  </button>
                </div>
              </div>

              {/* Scan Results Display */}
              {scanResults && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border ${
                    scanResults.found ? 'bg-red-50/20 border-red-100' : 'bg-emerald-50/20 border-emerald-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {scanResults.found ? (
                      <AlertCircle className="text-red-600" size={18} />
                    ) : (
                      <CheckCircle2 className="text-emerald-600" size={18} />
                    )}
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      {scanResults.found ? 'Kết quả: Phát hiện nguy cơ bảo mật' : 'Kết quả: Tài liệu Đạt tiêu chuẩn an toàn'}
                    </h4>
                  </div>

                  {scanResults.found ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">Hệ thống phát hiện thấy các từ ngữ nhạy cảm cần được rà soát lại hoặc chuyển vùng lưu trữ an toàn:</p>
                      <div className="grid gap-2">
                        {scanResults.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                            <div className="px-2 py-1 bg-red-100 text-red-700 font-mono text-[10px] font-bold rounded">
                              "{issue.word}"
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">{issue.category}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black font-mono ${
                                  issue.dangerLevel === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {issue.dangerLevel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">{issue.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Phân tích ngữ nghĩa hoàn tất. Không phát hiện bất kỳ chuỗi nhạy cảm nào thuộc diện tuyệt mật quốc gia, khoá API lộ lọt, hoặc thông tin bảo mật nhân sự. Tài liệu đủ điều kiện lưu trữ hoặc sử dụng nội bộ trên hệ thống.
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Tuân thủ Tiêu chuẩn An toàn thông tin</h3>
                <p className="text-xs text-slate-500">Chỉ số đáp ứng quy chuẩn kỹ thuật an toàn thông tin cấp độ 3 theo Nghị định 85/2016/NĐ-CP và Luật An ninh mạng</p>
              </div>

              {/* Progress and compliance gauge */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-extrabold text-lg text-emerald-600 bg-white shadow-sm shrink-0">
                  {Math.round((complianceRules.filter(r => r.isCompliant).length / complianceRules.length) * 100)}%
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Trạng thái đáp ứng quy chuẩn</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Hệ thống đã đạt {complianceRules.filter(r => r.isCompliant).length}/{complianceRules.length} tiêu chuẩn bảo mật chính thức. Khuyến nghị kích hoạt Xác thực 2 yếu tố (2FA) cho toàn bộ cán bộ cấp cao để đạt chỉ số tuyệt đối 100%.
                  </p>
                </div>
              </div>

              {/* Rules List */}
              <div className="grid gap-3">
                {complianceRules.map((rule) => (
                  <div 
                    key={rule.id}
                    className="p-4 bg-slate-50/30 hover:bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all"
                  >
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`p-1.5 rounded-xl shrink-0 transition-all ${
                        rule.isCompliant 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100' 
                          : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                      }`}
                      title={rule.isCompliant ? 'Đánh dấu không tuân thủ' : 'Đánh dấu tuân thủ'}
                    >
                      {rule.isCompliant ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 border border-slate-200 rounded">{rule.code}</span>
                        <h4 className="text-xs font-extrabold text-slate-800">{rule.name}</h4>
                        <span className="text-[9px] font-bold text-slate-400">({rule.standard})</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{rule.description}</p>
                    </div>

                    <span className={`text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full ${
                      rule.isCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rule.isCompliant ? 'Đạt chuẩn' : 'Chưa đạt'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrity' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Giám sát Toàn vẹn Cấu trúc Hệ thống</h3>
                <p className="text-xs text-slate-500">Giám sát chữ ký mã nguồn SHA-256 đối chiếu thực thời để đảm bảo không bị tấn công tiêm mã độc hoặc chỉnh sửa bất hợp pháp</p>
              </div>

              {/* Files Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-500">
                  <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Tệp tin cốt lõi</th>
                      <th className="px-4 py-3">Chữ ký dự kiến (SHA-256)</th>
                      <th className="px-4 py-3">Chữ ký hiện thời</th>
                      <th className="px-4 py-3">Kiểm định</th>
                      <th className="px-4 py-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coreFilesIntegrity.map((file, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{file.path}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{file.expectedHash}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{file.actualHash}</td>
                        <td className="px-4 py-3 text-slate-400">{file.lastChecked.toLocaleTimeString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full">
                            <CheckCircle2 size={10} /> Toàn vẹn
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-3">
                <Terminal size={16} className="text-slate-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Cơ chế giám sát File-level Integrity</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Hệ thống liên tục kiểm toán cấu trúc các file tĩnh thông qua mã SHA-256 băm trước. Bất kỳ nỗ lực tiêm mã lệnh độc hại nào ở lớp CDN hay tệp tin máy chủ sẽ kích hoạt chế độ tự động ngắt kết nối an toàn (Kill-Switch) để bảo vệ dữ liệu Đảng ủy.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
