import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Edit2, Trash2, Calendar, Filter, FileText, CheckCircle2, Clock, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

// Data types
type CategoryId = 'upper_level' | 'unit_task' | 'arising_task';

interface TaskJournalEntry {
  id: string;
  categoryId: CategoryId;
  content: string;
  implementingDoc: string;
  assignee: string;
  deadline: string;
  progress: string;
  results: string;
  authorUid: string;
  unitId: string;
  year: number;
  quarter: number;
  month: number;
  createdAt: any;
  updatedAt: any;
}

const CATEGORY_LABELS = {
  upper_level: 'I. Thực hiện theo Chương trình/Kế hoạch/Nghị quyết... của cấp trên',
  unit_task: 'II. Nhiệm vụ công tác của đơn vị',
  arising_task: 'III. Nhiệm vụ phát sinh theo chỉ đạo của cấp trên/đơn vị'
};

export const TaskJournalModule: React.FC = () => {
  const { user, unitId } = useAuth();
  
  // State
  const [entries, setEntries] = useState<TaskJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtering
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TaskJournalEntry | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    categoryId: 'upper_level' as CategoryId,
    content: '',
    implementingDoc: '',
    assignee: '',
    deadline: '',
    progress: '',
    results: ''
  });

  // Fetch data
  useEffect(() => {
    if (!user) return;
    
    // We fetch current year data for this user/unit
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
      console.log('Task journals fetched, count:', snapshot.size);
      const data: TaskJournalEntry[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as TaskJournalEntry);
      });
      // Sort by createdAt locally if indices are missing, or just keep as is
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });
      
      setEntries(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching task journals:", error);
      handleFirestoreError(error, OperationType.LIST, 'task_journals');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, unitId, selectedYear]);

  // Form handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({
      categoryId: 'upper_level',
      content: '',
      implementingDoc: '',
      assignee: '',
      deadline: '',
      progress: '',
      results: ''
    });
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TaskJournalEntry) => {
    setFormData({
      categoryId: entry.categoryId,
      content: entry.content,
      implementingDoc: entry.implementingDoc || '',
      assignee: entry.assignee || '',
      deadline: entry.deadline || '',
      progress: entry.progress || '',
      results: entry.results || ''
    });
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Lỗi: Không tìm thấy thông tin phiên làm việc.");
      return;
    }

    if (!formData.content) {
      alert("Vui lòng nhập nội dung nhiệm vụ");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        ...formData,
        authorUid: user.uid,
        unitId: unitId || 'vp-dang-uy',
        year: selectedYear,
        quarter: selectedQuarter,
        month: currentMonth,
        updatedAt: serverTimestamp()
      };

      // Firestore rejects undefined values, replace with null
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          payload[key] = null;
        }
      });

      if (editingEntry) {
        // Update
        const docRef = doc(db, 'task_journals', editingEntry.id!);
        await updateDoc(docRef, payload);
      } else {
        // Create
        await addDoc(collection(db, 'task_journals'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      setIsSaving(false);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving task journal entry:", error);
      alert(`Lỗi khi lưu: ${error.message || "Vui lòng kiểm tra quyền Firestore Rules."}`);
      setIsSaving(false);
      setIsModalOpen(false);
      try {
        handleFirestoreError(error, OperationType.WRITE, 'task_journals');
      } catch (err) {}
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
    try {
      await deleteDoc(doc(db, 'task_journals', id));
    } catch (error) {
       console.error("Error deleting task journal entry:", error);
       handleFirestoreError(error, OperationType.DELETE, `task_journals/${id}`);
    }
  };

  // Filtered entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (entry.implementingDoc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (entry.assignee || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Also filter by quarter if you want STRICT quarterly view. 
    // Usually reports are generated per quarter. 
    const matchesQuarter = entry.quarter === selectedQuarter;
    
    return matchesSearch && matchesQuarter;
  });

  // Group by category
  const groupedEntries: Record<CategoryId, TaskJournalEntry[]> = {
    upper_level: [],
    unit_task: [],
    arising_task: []
  };

  filteredEntries.forEach(entry => {
    if (groupedEntries[entry.categoryId]) {
      groupedEntries[entry.categoryId].push(entry);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Sổ tay Thống kê Nhiệm vụ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Ghi chép và theo dõi tiến độ công việc theo Quý/Năm định dạng chuẩn
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
            <div className="px-3 py-2 bg-gray-50 border-r border-gray-300">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="py-2 px-3 border-none focus:ring-0 text-sm font-medium text-gray-700 bg-transparent"
            >
              <option value={1}>Quý I</option>
              <option value={2}>Quý II</option>
              <option value={3}>Quý III</option>
              <option value={4}>Quý IV</option>
            </select>
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="py-2 px-3 border-none focus:ring-0 text-sm font-medium text-gray-700 bg-transparent pr-8"
            >
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap shadow-sm"
          >
            <Plus className="h-4 w-4" /> Thêm nhiệm vụ
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung, người phụ trách, văn bản..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header Design based on the image */}
        <div className="p-6 text-center border-b border-gray-200 relative bg-gray-50/50">
          <div className="absolute top-6 right-6 text-right">
            <p className="font-bold underline text-sm">ĐẢNG CỘNG SẢN VIỆT NAM</p>
            <p className="text-xs italic text-gray-600 mt-1">TP.Hồ Chí Minh, ngày ... tháng ... năm {selectedYear}</p>
          </div>
          <div className="absolute top-6 left-6 text-left">
            <p className="font-bold text-sm uppercase">TÊN ĐƠN VỊ: {unitId || '.....'}</p>
          </div>
          <h3 className="text-xl font-bold mt-8">BẢNG THỐNG KÊ</h3>
          <h4 className="text-lg font-bold uppercase">THỰC HIỆN NHIỆM VỤ CÔNG TÁC QUÝ {selectedQuarter}/{selectedYear}</h4>
          <p className="italic text-gray-600 mt-1">Đối với cán bộ lãnh đạo, quản lý</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-800 uppercase font-semibold text-center align-middle">
              <tr>
                <th className="border border-gray-300 py-3 px-2 w-[5%]">STT</th>
                <th className="border border-gray-300 py-3 px-4 w-[25%]">Nội dung</th>
                <th className="border border-gray-300 py-3 px-3 w-[15%]">Văn bản triển khai thực hiện</th>
                <th className="border border-gray-300 py-3 px-3 w-[15%]">Đơn vị thực hiện / cá nhân phụ trách</th>
                <th className="border border-gray-300 py-3 px-3 w-[10%]">Thời gian hoàn thành</th>
                <th className="border border-gray-300 py-3 px-3 w-[12%]">Tiến độ thực hiện</th>
                <th className="border border-gray-300 py-3 px-3 w-[15%]">Sản phẩm / kết quả thực hiện<br/><span className="text-[10px] font-normal italic normal-case">(số văn bản, ngày ban hành (nếu có))</span></th>
                <th className="border border-gray-300 py-3 px-2 w-[3%]"></th>
              </tr>
            </thead>
            <tbody>
              {/* Render Categories */}
              {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map((categoryId) => (
                <React.Fragment key={categoryId}>
                  {/* Category Header Row */}
                  <tr className="bg-blue-50/50">
                    <td className="border border-gray-300 font-bold p-2 text-center text-blue-900">
                      {categoryId === 'upper_level' ? 'I' : categoryId === 'unit_task' ? 'II' : 'III'}
                    </td>
                    <td colSpan={7} className="border border-gray-300 font-bold p-3 text-blue-900">
                      {categoryId === 'upper_level' ? 'Thực hiện theo Chương trình/Kế hoạch/Nghị quyết... của cấp trên' : 
                       categoryId === 'unit_task' ? 'Nhiệm vụ công tác của đơn vị' : 
                       'Nhiệm vụ phát sinh theo chỉ đạo của cấp trên/đơn vị'}
                    </td>
                  </tr>
                  
                  {/* Entries for Category */}
                  {groupedEntries[categoryId].length > 0 ? (
                    groupedEntries[categoryId].map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-gray-50 align-top group">
                        <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                        <td className="border border-gray-300 p-3 whitespace-pre-wrap">{entry.content}</td>
                        <td className="border border-gray-300 p-3">{entry.implementingDoc}</td>
                        <td className="border border-gray-300 p-3 text-center">{entry.assignee}</td>
                        <td className="border border-gray-300 p-3 text-center">
                          <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-medium border border-gray-200">
                            {entry.deadline || '—'}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <div className="flex items-center justify-between gap-2">
                             <span className="text-sm">{entry.progress}</span>
                             {entry.progress?.includes('100%') || entry.progress?.toLowerCase().includes('hoàn thành') ? (
                               <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                             ) : entry.progress ? (
                               <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                             ) : null}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3 text-gray-600 text-[13px] leading-tight">{entry.results}</td>
                        <td className="border border-gray-300 p-2 text-center align-middle whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="border border-gray-300 p-3 text-center text-gray-400">...</td>
                      <td colSpan={7} className="border border-gray-300 p-3 text-gray-400 italic text-sm text-center">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {loading && (
          <div className="p-8 text-center text-gray-500 border-t border-gray-200">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mb-2"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editingEntry ? 'Chỉnh sửa nhiệm vụ' : 'Thêm nhiệm vụ mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto w-full custom-scrollbar">
              <form id="task-journal-form" onSubmit={handleSave} className="space-y-6">
                
                {/* Information Callout */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-blue-500" />
                  <p>
                    Biểu mẫu này dùng để thống kê nhiệm vụ theo đúng định dạng báo cáo hàng Quý của đơn vị.
                    Dữ liệu sẽ được lưu tự động cho Quý {selectedQuarter} / {selectedYear}.
                  </p>
                </div>

                {/* Phân loại */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Phân loại nhiệm vụ *</label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-700"
                    required
                  >
                    <option value="upper_level">{CATEGORY_LABELS.upper_level}</option>
                    <option value="unit_task">{CATEGORY_LABELS.unit_task}</option>
                    <option value="arising_task">{CATEGORY_LABELS.arising_task}</option>
                  </select>
                </div>

                {/* Nội dung */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nội dung nhiệm vụ *</label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Mô tả tóm tắt nội dung nhiệm vụ..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Văn bản triển khai */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Văn bản triển khai thực hiện</label>
                    <input
                      type="text"
                      name="implementingDoc"
                      value={formData.implementingDoc}
                      onChange={handleInputChange}
                      placeholder="VD: KH số 123/KH-ĐU..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Cán bộ/Đơn vị phụ trách */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị / cá nhân phụ trách</label>
                    <input
                      type="text"
                      name="assignee"
                      value={formData.assignee}
                      onChange={handleInputChange}
                      placeholder="VD: Đ/c Huy - CVP..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Thời gian hoàn thành */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian hoàn thành</label>
                    <input
                      type="text"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      placeholder="VD: Tháng 5/2026, Quý I..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Tiến độ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tiến độ thực hiện</label>
                    <input
                      type="text"
                      name="progress"
                      value={formData.progress}
                      onChange={handleInputChange}
                      placeholder="VD: Đạt 100%, Đang triển khai..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Kết quả */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sản phẩm / Kết quả thực hiện</label>
                  <textarea
                    name="results"
                    value={formData.results}
                    onChange={handleInputChange}
                    placeholder="Ghi rõ số văn bản, ngày ban hành (nếu có)..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

              </form>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Đang xử lý...' : (editingEntry ? 'Cập nhật bản ghi' : 'Khởi tạo bản ghi')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
