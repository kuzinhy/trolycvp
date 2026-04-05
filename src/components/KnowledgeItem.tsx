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
  ChevronDown
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

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
    tags: item.tags || []
  });

  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleSave = () => {
    onSave({ ...item, ...editValue });
  };

  if (isEditing) {
    return (
      <div className="bento-card p-6 bg-white border-primary/30 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit2 className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-bold text-foreground">Chỉnh sửa tài liệu</h4>
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
      className="group bento-card bg-white hover:bg-slate-50/50 transition-all overflow-hidden mb-3"
    >
      <div className="flex items-stretch min-h-[80px]">
        {/* Drag Handle */}
        <div 
          className="w-10 flex items-center justify-center border-r border-border/40 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-primary transition-colors hover:bg-slate-100"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`mt-0.5 p-2 rounded-xl transition-all ${isExpanded ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                    {item.title}
                  </h4>
                  {item.isImportant && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider">Quan trọng</span>
                  )}
                </div>
                {!isExpanded && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {item.createdAt ? new Date(item.createdAt.toMillis?.() || item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onDelete} 
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-6 border-t border-border/40 mt-4 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Nội dung tài liệu</h5>
                  <div className="prose prose-sm max-w-none prose-slate">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Thông tin chi tiết</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-border/40">
                        <span className="text-[10px] font-medium text-slate-500">Danh mục</span>
                        <span className="text-[10px] font-bold text-slate-700">{item.category}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-border/40">
                        <span className="text-[10px] font-medium text-slate-500">Ngày tạo</span>
                        <span className="text-[10px] font-bold text-slate-700">
                          {item.createdAt ? new Date(item.createdAt.toMillis?.() || item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Thẻ phân loại</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase tracking-tighter">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
});
