import React, { memo } from 'react';
import { motion, Reorder, useDragControls } from 'motion/react';
import { 
  GripVertical, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Tag, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  FileText,
  Eye
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface KnowledgeItemProps {
  item: any;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (updatedItem: any) => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const KnowledgeItem: React.FC<KnowledgeItemProps> = memo(({
  item,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  isDeleting
}) => {
  const dragControls = useDragControls();
  const [editValue, setEditValue] = React.useState({
    title: item.title || '',
    content: item.content || '',
    category: item.category || 'Khác',
    tags: item.tags || [],
    priority: item.priority || 'medium',
    deadline: item.deadline || '',
    status: item.status || 'Pending'
  });

  const handleSave = () => {
    onSave({ ...item, ...editValue });
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-200 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Edit2 className="w-4 h-4 text-indigo-600" />
            </div>
            <h4 className="font-bold text-slate-900">Chỉnh sửa tài liệu</h4>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tiêu đề</label>
              <input
                type="text"
                value={editValue.title}
                onChange={(e) => setEditValue(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nội dung</label>
              <textarea
                value={editValue.content}
                onChange={(e) => setEditValue(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm min-h-[160px] resize-y"
              />
            </div>
          </div>

          <div className="md:col-span-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh mục</label>
              <select
                value={editValue.category}
                onChange={(e) => setEditValue(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm appearance-none cursor-pointer font-medium"
              >
                <option value="Quy định - Hướng dẫn">Quy định - Hướng dẫn</option>
                <option value="Nghị quyết - Chỉ thị">Nghị quyết - Chỉ thị</option>
                <option value="Kế hoạch - Chương trình">Kế hoạch - Chương trình</option>
                <option value="Báo cáo - Thống kê">Báo cáo - Thống kê</option>
                <option value="Tài liệu đào tạo">Tài liệu đào tạo</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mức độ ưu tiên</label>
              <select
                value={editValue.priority}
                onChange={(e) => setEditValue(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trạng thái</label>
              <select
                value={editValue.status}
                onChange={(e) => setEditValue(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
              >
                <option value="Pending">Chờ xử lý</option>
                <option value="In Progress">Đang thực hiện</option>
                <option value="Completed">Đã hoàn thành</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hạn chót</label>
              <input
                type="date"
                value={editValue.deadline}
                onChange={(e) => setEditValue(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thẻ (Tags)</label>
              <input
                type="text"
                value={editValue.tags.join(', ')}
                onChange={(e) => setEditValue(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                className="w-full px-4 py-3 bg-slate-50 border border-border/40 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none transition-all text-sm"
              />
            </div>

            <div className="pt-6 flex flex-col gap-2">
              <Button variant="primary" onClick={handleSave} className="w-full rounded-xl py-6 font-bold shadow-lg shadow-primary/20">
                <Check className="w-4 h-4 mr-2" />
                Lưu thay đổi
              </Button>
              <Button variant="ghost" onClick={onCancel} className="w-full rounded-xl py-6 text-muted-foreground">
                Hủy bỏ
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="bg-white rounded-2xl border border-slate-200/60 hover:border-indigo-200 hover:shadow-md transition-all group overflow-hidden mb-3"
    >
      <div className="flex items-stretch min-h-[80px]">
        {/* Drag Handle */}
        <div 
          className="w-10 flex items-center justify-center border-r border-slate-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-500 transition-colors hover:bg-slate-50"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="p-2.5 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl transition-all">
                <FileText className="w-5 h-5" />
              </div>
              
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight truncate">
                    {item.title}
                  </h4>
                  {item.isImportant && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider">Quan trọng</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag className="w-3 h-3" />
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {item.createdAt ? new Date(item.createdAt.toMillis?.() || item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
                {item.content && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                    {item.content.substring(0, 150)}...
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={onEdit} 
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="Xem chi tiết & Chỉnh sửa"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button 
                onClick={onDelete} 
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
});
