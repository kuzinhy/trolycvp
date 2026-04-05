import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Check, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface PendingKnowledgeListProps {
  items: any[];
  onApprove: (item: any) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  isApproving: string | null;
  isRejecting: string | null;
}

export const PendingKnowledgeList: React.FC<PendingKnowledgeListProps> = memo(({
  items,
  onApprove,
  onReject,
  isApproving,
  isRejecting
}) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl text-amber-600 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Tài liệu chờ duyệt
        </h3>
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1 rounded-full">
          {items.length} mục cần xác nhận
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-5 bg-amber-50/50 border border-amber-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-300/60 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-amber-900 line-clamp-2 leading-tight">{item.title || item.name}</h4>
                <Badge variant="outline" className="text-[10px] py-0.5 px-2 rounded-full border-amber-300 text-amber-700 shrink-0 bg-amber-100/50">
                  {item.category}
                </Badge>
              </div>
              
              <p className="text-sm text-amber-800/80 line-clamp-2 leading-relaxed">
                {item.summary || (item.content ? item.content.substring(0, 150) + '...' : item.name)}
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onReject(item.id)}
                  disabled={isRejecting === item.id}
                  className="rounded-xl px-4 text-red-600 hover:text-red-700 hover:bg-red-100/50"
                >
                  {isRejecting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Bỏ qua
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => onApprove(item)}
                  disabled={isApproving === item.id}
                  className="rounded-xl px-5 bg-amber-600 hover:bg-amber-700 shadow-sm"
                >
                  {isApproving === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Phê duyệt
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
