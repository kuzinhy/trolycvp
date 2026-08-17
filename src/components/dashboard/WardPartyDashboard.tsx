import React, { useState, useEffect } from 'react';
import { 
  BarChart3, RefreshCw, Database, Search, Filter, Calendar, Users, Building, 
  CheckCircle2, AlertTriangle, Clock, ArrowUpRight, ChevronRight, Download, 
  ShieldCheck, FileText, PieChart, TrendingUp, AlertCircle, CheckCircle, 
  XCircle, HelpCircle, Layers, Award, DollarSign
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DrillDownModal } from './DrillDownModal';
import { DriveInspectorModal } from './DriveInspectorModal';

interface WardPartyDashboardProps {
  navigateTo: (tab: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const WardPartyDashboard: React.FC<WardPartyDashboardProps> = ({
  navigateTo,
  showToast
}) => {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Filters state
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedQuarter, setSelectedQuarter] = useState('Q3');
  const [selectedMonth, setSelectedMonth] = useState('Tháng 8');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownCategory, setDrillDownCategory] = useState('');
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary');
      const json = await res.json();
      if (json.success) {
        setSummaryData(json.data);
        setLastUpdated(json.lastUpdated ? new Date(json.lastUpdated).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN'));
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      showToast("Không thể tải dữ liệu từ Google Drive API", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/refresh', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchSummary();
        showToast(json.message, "success");
      }
    } catch (err) {
      showToast("Lỗi đồng bộ dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  const openDrillDown = (title: string, category: string) => {
    setDrillDownTitle(title);
    setDrillDownCategory(category);
    setDrillDownModalOpen(true);
  };

  if (loading && !summaryData) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mb-4"></div>
        <p className="text-slate-600 font-medium text-sm">Đang kết nối và đồng bộ dữ liệu từ Google Drive...</p>
      </div>
    );
  }

  const org = summaryData?.organization || {};
  const dev = summaryData?.development || {};
  const branches = summaryData?.branches || [];
  const tasks = summaryData?.tasksSummary || {};
  const insp = summaryData?.inspectionSummary || {};
  const reps = summaryData?.reportsSummary || {};
  const evalData = summaryData?.evaluation || {};
  const fees = summaryData?.partyFees || {};
  const demo = summaryData?.demographics || {};
  const alerts = summaryData?.alerts || [];

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/60 min-h-screen">
      
      {/* Top Header & Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-md uppercase tracking-wider border border-rose-200">
              Cơ quan Đảng ủy Phường
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Hệ thống Điều hành Chiến lược 6.0</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Dashboard Tổng hợp Công tác Đảng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dữ liệu cập nhật lúc: <span className="font-semibold text-slate-700">{lastUpdated}</span> (Nguồn Google Drive: <button onClick={() => setInspectorModalOpen(true)} className="text-rose-600 hover:underline font-mono">Xem tệp nguồn</button>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setInspectorModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors border border-slate-200 shadow-sm cursor-pointer"
          >
            <Database size={16} className="text-blue-600" />
            <span>Nguồn Drive (Rule 24)</span>
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Quý:</span>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="Q1">Quý I</option>
              <option value="Q2">Quý II</option>
              <option value="Q3">Quý III</option>
              <option value="Q4">Quý IV</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Tháng:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={`Tháng ${i + 1}`}>Tháng {i + 1}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Chi bộ:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">Tất cả các chi bộ</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm nhanh toàn Dashboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>
      </div>

      {/* SECTION 1: KPI CARDS (Tổ chức Đảng & Đảng viên) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Users size={18} className="text-rose-600" />
            <span>Tổ chức Đảng & Đảng viên (Click để xem chi tiết)</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Bấm vào từng thẻ để drill-down</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1 */}
          <div 
            onClick={() => openDrillDown("Tổng số Đảng viên phường", "all_members")}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng số đảng viên</span>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-rose-600 transition-colors">
                {org.totalPartyMembers?.toLocaleString()}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Chính thức: <strong className="text-slate-700">{org.officialMembers}</strong></span>
                <span>Dự bị: <strong className="text-rose-600">{org.reserveMembers}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div 
            onClick={() => openDrillDown("Danh sách Tổ chức Đảng & Chi bộ", "organizations")}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng số tổ chức Đảng</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building size={16} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                {org.totalOrganizations}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Chi bộ trực thuộc: <strong className="text-slate-700">{org.totalBranches}</strong></span>
                <span className="text-blue-600 font-semibold flex items-center gap-1">Chi tiết <ChevronRight size={12} /></span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => openDrillDown("Đảng viên miễn sinh hoạt & tạm thời", "exempt_temp")}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Miễn & Tạm thời sinh hoạt</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-amber-600 transition-colors">
                {(org.exemptMembers || 0) + (org.temporaryMembers || 0)}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Miễn SH: <strong className="text-slate-700">{org.exemptMembers}</strong></span>
                <span>Tạm thời: <strong className="text-slate-700">{org.temporaryMembers}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div 
            onClick={() => openDrillDown("Đảng viên mới kết nạp trong năm", "new_inductees")}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Đảng viên mới kết nạp</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Award size={16} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-emerald-600 transition-colors">
                {org.newInducteesThisYear}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Đi làm ăn xa: <strong className="text-slate-700">{org.remoteWorkMembers}</strong></span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">Chi tiết <ChevronRight size={12} /></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2 & 3: PHÁT TRIỂN ĐẢNG & SINH HOẠT CHI BỘ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Công tác phát triển Đảng */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp size={18} className="text-rose-600" />
                <span>Công tác phát triển Đảng</span>
              </h3>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                Hoàn thành {dev.completionRate}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Đã kết nạp: <strong className="text-rose-600">{dev.recruited}</strong> / Chỉ tiêu: {dev.targetYear}</span>
                <span>Còn lại: {dev.remaining}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${dev.completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => openDrillDown("Quần chúng đang theo dõi", "mass_followed")}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-rose-300 cursor-pointer transition-all"
              >
                <p className="text-xs text-slate-500 font-medium">Quần chúng đang theo dõi</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{dev.massFollowed}</p>
              </div>
              <div 
                onClick={() => openDrillDown("Quần chúng ưu tú", "elite_mass")}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-rose-300 cursor-pointer transition-all"
              >
                <p className="text-xs text-slate-500 font-medium">Quần chúng ưu tú</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{dev.eliteMass}</p>
              </div>
              <div 
                onClick={() => openDrillDown("Đã học nhận thức về Đảng", "learned_awareness")}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-rose-300 cursor-pointer transition-all"
              >
                <p className="text-xs text-slate-500 font-medium">Đã học nhận thức Đảng</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{dev.learnedAwareness}</p>
              </div>
              <div 
                onClick={() => openDrillDown("Hồ sơ đang thẩm tra / hoàn thiện", "verifying_files")}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-rose-300 cursor-pointer transition-all"
              >
                <p className="text-xs text-slate-500 font-medium">Hồ sơ đang thẩm tra</p>
                <p className="text-xl font-bold text-rose-600 mt-1">{dev.filesVerifying}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dự bị sắp chuyển chính thức: <strong className="text-slate-800">3 đồng chí</strong></span>
            <button onClick={() => openDrillDown("Phát triển Đảng chi tiết", "dev_detail")} className="text-rose-600 font-semibold hover:underline flex items-center gap-1">
              Xem toàn bộ <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Tình hình sinh hoạt chi bộ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Building size={18} className="text-blue-600" />
                <span>Tình hình sinh hoạt chi bộ tháng này</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">6/6 Chi bộ</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="px-3 py-2.5">Chi bộ</th>
                    <th className="px-3 py-2.5 text-center">Sinh hoạt</th>
                    <th className="px-3 py-2.5 text-center">Biên bản</th>
                    <th className="px-3 py-2.5 text-center">Chuyên đề</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {branches.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        <button onClick={() => openDrillDown(b.name, "branch_detail")} className="text-blue-600 hover:underline text-left font-medium">
                          {b.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.meetingThisMonth ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-rose-600 font-bold">✗</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.sentMinutes ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-amber-600 font-bold">Chưa</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.thematicMeeting ? <span className="text-emerald-600 font-bold">Có</span> : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold">
                        <span title={b.timeliness} className="text-base">{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">🟢 Đúng hạn</span>
              <span className="flex items-center gap-1">🟡 Sắp đến hạn</span>
              <span className="flex items-center gap-1">🔴 Quá hạn</span>
            </div>
            <button onClick={() => openDrillDown("Tình hình sinh hoạt chi bộ", "branches")} className="text-blue-600 font-semibold hover:underline">
              Chi tiết các chi bộ →
            </button>
          </div>
        </div>

      </div>

            {/* SECTION: NHIỆM VỤ ĐƯỢC GIAO */}
      <div className="grid grid-cols-1 gap-6">
        {/* Theo dõi nhiệm vụ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span>Theo dõi nhiệm vụ Đảng ủy giao</span>
            </h3>
            <button onClick={() => navigateTo('tasks')} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              Quản lý nhiệm vụ <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-medium">Tổng nhiệm vụ</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{tasks.totalTasks}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-medium">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{tasks.completedTasks}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-medium">Đang thực hiện</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{tasks.inProgressTasks}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-medium">Quá hạn</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{tasks.overdueCount}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">Tỷ lệ hoàn thành nhiệm vụ toàn phường</p>
              <p className="text-xs text-slate-500">Đạt 72.9% tiến độ kế hoạch quý III/2026</p>
            </div>
            <button onClick={() => navigateTo('tasks')} className="px-4 py-2 bg-slate-900 text-white font-medium text-xs rounded-lg hover:bg-slate-800 transition-colors">
              Xem danh sách chi tiết
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 6, 7: KIỂM TRA GIÁM SÁT, VĂN BẢN BÁO CÁO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Kiểm tra - Giám sát */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-rose-600" />
              <span>Kiểm tra – Giám sát</span>
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Kế hoạch trong năm:</span>
                <span className="font-bold text-slate-900">{insp.plansInYear} cuộc</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Tổng số kiểm tra:</span>
                <span className="font-bold text-slate-900">{insp.totalInspections}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Tổng số giám sát:</span>
                <span className="font-bold text-slate-900">{insp.totalSupervisions}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Đã thực hiện:</span>
                <span className="font-bold text-emerald-600">{insp.executed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Kết luận chưa hoàn thành:</span>
                <span className="font-bold text-rose-600">{insp.unfinishedConclusions}</span>
              </div>
            </div>
          </div>
          <button onClick={() => openDrillDown("Kiểm tra - Giám sát chi tiết", "inspection")} className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors">
            Xem chi tiết kiểm tra giám sát →
          </button>
        </div>

        {/* Văn bản - Báo cáo */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
              <FileText size={16} className="text-blue-600" />
              <span>Văn bản – Báo cáo</span>
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Văn bản đến (Tháng):</span>
                <span className="font-bold text-slate-900">{reps.incomingTotal}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Văn bản chưa xử lý:</span>
                <span className="font-bold text-amber-600">{reps.incomingUnhandled}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Báo cáo phải thực hiện:</span>
                <span className="font-bold text-slate-900">{reps.reportsMonthlyDue}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Báo cáo đã hoàn thành:</span>
                <span className="font-bold text-emerald-600">{reps.reportsCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Báo cáo quá hạn:</span>
                <span className="font-bold text-rose-600">{reps.reportsOverdue}</span>
              </div>
            </div>
          </div>
          <button onClick={() => openDrillDown("Văn bản - Báo cáo chi tiết", "reports")} className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors">
            Xem danh sách báo cáo sắp đến hạn →
          </button>
        </div>

      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDownModalOpen}
        onClose={() => setDrillDownModalOpen(false)}
        title={drillDownTitle}
        category={drillDownCategory}
      />

      {/* Drive Inspector Modal (Rule 24) */}
      <DriveInspectorModal
        isOpen={inspectorModalOpen}
        onClose={() => setInspectorModalOpen(false)}
        onRefresh={fetchSummary}
      />

    </div>
  );
};
