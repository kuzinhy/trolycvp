import React, { useState, useEffect } from 'react';
import { X, Search, Download, Filter, ChevronLeft, ChevronRight, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: string;
  initialParams?: any;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  isOpen,
  onClose,
  title,
  category,
  initialParams
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, search, selectedBranch, selectedStatus, page, category]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search && { search }),
        ...(selectedBranch && { chiBo: selectedBranch }),
        ...(selectedStatus && { trangThai: selectedStatus })
      });

      const res = await fetch(`/api/dashboard/party-members?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error("Error fetching drill-down data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-md">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              <p className="text-xs text-slate-300">Danh sách chi tiết được đồng bộ từ nguồn dữ liệu Google Drive</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-slate-200 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Tìm kiếm theo họ tên, mã số, chi bộ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm"
            >
              <option value="">Tất cả Chi bộ</option>
              <option value="Chi bộ Khu phố 1">Chi bộ Khu phố 1</option>
              <option value="Chi bộ Khu phố 2">Chi bộ Khu phố 2</option>
              <option value="Chi bộ Khu phố 3">Chi bộ Khu phố 3</option>
              <option value="Chi bộ Khu phố 4">Chi bộ Khu phố 4</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Chính thức">Chính thức</option>
              <option value="Đảng viên dự bị">Đảng viên dự bị</option>
              <option value="Miễn sinh hoạt">Miễn sinh hoạt</option>
            </select>

            <button
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," + 
                  ["Mã ĐV,Họ tên,Ngày sinh,Giới tính,Chi bộ,Ngày vào Đảng,Trạng thái"].join(",") + "\n" +
                  data.map(d => `${d.id},"${d.hoTen}",${d.ngaySinh},${d.gioiTinh},"${d.chiBo}",${d.ngayVaoDang},${d.trangThai}`).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Danh_sach_chi_tiet_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-sm transition-colors shadow-sm"
              title="Xuất Excel/CSV"
            >
              <Download size={16} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Content Table / Detail View */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-sm">Không tìm thấy dữ liệu phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="px-4 py-3">Mã ĐV</th>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Ngày sinh</th>
                    <th className="px-4 py-3">Giới tính</th>
                    <th className="px-4 py-3">Chi bộ</th>
                    <th className="px-4 py-3">Ngày vào Đảng</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-rose-600">{item.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.hoTen}</td>
                      <td className="px-4 py-3 text-slate-600">{item.ngaySinh}</td>
                      <td className="px-4 py-3 text-slate-600">{item.gioiTinh}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{item.chiBo}</td>
                      <td className="px-4 py-3 text-slate-600">{item.ngayVaoDang}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-full",
                          item.trangThai === 'Chính thức' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          item.trangThai === 'Đảng viên dự bị' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        )}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-lg transition-colors border border-rose-200"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            Hiển thị trang <span className="font-semibold text-slate-700">{page}</span> trên tổng số <span className="font-semibold text-slate-700">{total}</span> bản ghi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2">{page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 15 >= total}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Hồ sơ chi tiết đảng viên</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-300 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900">{selectedItem.hoTen}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Mã Đảng viên:</span>
                <span className="font-mono font-semibold text-rose-600">{selectedItem.id}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Ngày sinh:</span>
                <span className="text-slate-800">{selectedItem.ngaySinh} ({selectedItem.gioiTinh})</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Chi bộ sinh hoạt:</span>
                <span className="font-medium text-slate-800">{selectedItem.chiBo}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Ngày vào Đảng:</span>
                <span className="text-slate-800">{selectedItem.ngayVaoDang} (Chính thức: {selectedItem.ngayChinhThuc})</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Trình độ chuyên môn:</span>
                <span className="text-slate-800">{selectedItem.trinhDo}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Tuổi Đảng:</span>
                <span className="font-bold text-rose-600">{selectedItem.tuoiDang} năm</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Nguồn dữ liệu gốc:</span>
                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">{selectedItem.sourceFileName}</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-900 text-white font-medium text-xs rounded-lg hover:bg-slate-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
