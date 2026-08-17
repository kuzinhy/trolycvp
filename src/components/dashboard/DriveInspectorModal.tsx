import React, { useState, useEffect } from 'react';
import { X, Database, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw, FolderOpen, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DriveInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const DriveInspectorModal: React.FC<DriveInspectorModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const [inspector, setInspector] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInspectionData();
    }
  }, [isOpen]);

  const loadInspectionData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/inspect');
      const json = await res.json();
      if (json.success) {
        setInspector(json.inspector);
        setFiles(json.files);
      }
    } catch (err) {
      console.error("Error loading drive inspection:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/dashboard/refresh', { method: 'POST' });
      await loadInspectionData();
      onRefresh();
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Kiểm tra Nguồn dữ liệu Google Drive (Rule 24)</h2>
              <p className="text-xs text-slate-300">Thư mục cấu hình: <span className="font-mono text-amber-300">{inspector?.folderId || 'GOOGLE_DRIVE_FOLDER_ID_HERE'}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-slate-200 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5",
              inspector?.connected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            )}>
              <span className={cn("w-2 h-2 rounded-full", inspector?.connected ? "bg-emerald-500" : "bg-amber-500")} />
              {inspector?.connected ? "Đã kết nối thư mục Drive" : "Sử dụng chế độ cấu hình mặc định (Folder ID placeholder)"}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
            <span>{refreshing ? "Đang đồng bộ..." : "Đồng bộ lại từ Drive"}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase">Tổng số tệp tìm thấy</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{files.length} tệp</p>
                  <p className="text-xs text-slate-600 mt-1">Đã loại bỏ các file trong Thùng rác</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase">Trạng thái ánh xạ dữ liệu</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{inspector?.mappingStatus || 'Hoàn tất'}</p>
                  <p className="text-xs text-slate-600 mt-1">Tự động chuẩn hóa sang Model chung</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase">Cột chưa xác định</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{inspector?.unmappedColumns?.length || 0} cột</p>
                  <p className="text-xs text-slate-600 mt-1">Không ảnh hưởng chỉ tiêu chính</p>
                </div>
              </div>

              {/* Files Found List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <FolderOpen size={16} className="text-blue-600" />
                  <span>Danh sách tệp dữ liệu đã phát hiện trong thư mục</span>
                </h3>
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                          <FileSpreadsheet size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{file.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{file.type}</span>
                            <span>•</span>
                            <span>Cập nhật: {file.updateDate}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-medium">Sheet: {file.sheets.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-full self-start md:self-center",
                        file.status === 'Đã ánh xạ' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                      )}>
                        {file.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Headers */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Layers size={16} className="text-purple-600" />
                  <span>Cấu trúc Header & Ánh xạ cột (Data Mapping)</span>
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                  {inspector?.headersDetected && Object.entries(inspector.headersDetected).map(([sheetName, headers]: [string, any]) => (
                    <div key={sheetName} className="border-b border-slate-200/60 pb-3 last:border-0 last:pb-0">
                      <p className="font-semibold text-slate-800 text-xs uppercase text-rose-600">Sheet: {sheetName}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {headers.map((h: string) => (
                          <span key={h} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-700 shadow-sm">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-medium text-xs rounded-lg hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
