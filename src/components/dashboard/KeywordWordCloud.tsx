import React, { memo, useMemo, useState } from 'react';
import { Tag, X, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KeywordWordCloudProps {
  knowledgeData: any[];
}

export const KeywordWordCloud = memo(({ knowledgeData }: KeywordWordCloudProps) => {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const keywordFrequencies = useMemo(() => {
    // Generate word frequencies from knowledge tags or titles
    const frequencies: Record<string, number> = {};
    
    // Add some default system keywords just in case data is empty
    const defaultKeywords = [
      'Chính trị', 'Chiến lược', 'Tham mưu', 'Hậu cần', 'Bảo mật', 
      'Chỉ đạo', 'Kỹ thuật', 'Nghị quyết', 'Kế hoạch', 'Nhân sự',
      'Đảng uỷ', 'Báo cáo', 'Tổng kết', 'Khẩn cấp', 'Ngoại giao'
    ];
    
    defaultKeywords.forEach(k => {
      frequencies[k] = Math.floor(Math.random() * 20) + 10;
    });

    if (knowledgeData && knowledgeData.length > 0) {
      knowledgeData.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            const t = tag.trim();
            if (t) {
              frequencies[t] = (frequencies[t] || 0) + 5;
            }
          });
        }
      });
    }

    return Object.entries(frequencies)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20); // Top 20 keywords
  }, [knowledgeData]);

  // Filter documents related to the selected keyword
  const relatedDocuments = useMemo(() => {
    if (!selectedKeyword || !knowledgeData) return [];
    
    const searchLower = selectedKeyword.toLowerCase();
    
    return knowledgeData.filter(item => {
      if (item.tags && Array.isArray(item.tags)) {
        if (item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))) {
          return true;
        }
      }
      if (item.title && typeof item.title === 'string' && item.title.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (item.description && typeof item.description === 'string' && item.description.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (item.summary && typeof item.summary === 'string' && item.summary.toLowerCase().includes(searchLower)) {
        return true;
      }
      return false;
    });
  }, [selectedKeyword, knowledgeData]);

  const maxFreq = Math.max(...keywordFrequencies.map(k => k.value));
  const minFreq = Math.min(...keywordFrequencies.map(k => k.value));

  return (
    <>
      <div id="keyword-cloud-container" className="col-span-1 xl:col-span-4 os-card p-6 md:p-10 relative overflow-hidden group bg-white border border-slate-200/60 shadow-sm rounded-3xl md:rounded-[2rem] hover:shadow-md transition-all flex flex-col h-full">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
        <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-sm border border-indigo-100/50">
              <Tag className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic">Tần suất từ khóa</h3>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tri thức Hệ thống (Word Cloud)</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative z-10 flex flex-wrap content-center justify-center gap-x-3 gap-y-2 md:gap-x-4 md:gap-y-3 p-4 md:p-6 bg-slate-50/50 rounded-3xl border border-slate-100 min-h-[200px] md:min-h-[250px]">
          {keywordFrequencies.map((kw, i) => {
            const fontSize = 12 + ((kw.value - minFreq) / (maxFreq - minFreq || 1)) * 28;
            const colorClasses = [
              'text-blue-600', 'text-indigo-600', 'text-emerald-600', 
              'text-amber-500', 'text-rose-500', 'text-slate-800', 'text-cyan-600'
            ];
            const color = colorClasses[i % colorClasses.length];
            const isLarge = fontSize > 28;
            const fontWeight = isLarge ? 'font-black' : (fontSize > 20 ? 'font-bold' : 'font-semibold');
            const opacity = isLarge ? 'opacity-100' : 'opacity-80 hover:opacity-100';

            const docCount = knowledgeData ? knowledgeData.filter(item => {
              const searchLower = kw.text.toLowerCase();
              if (item.tags && Array.isArray(item.tags) && item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))) return true;
              if (item.title && typeof item.title === 'string' && item.title.toLowerCase().includes(searchLower)) return true;
              if (item.description && typeof item.description === 'string' && item.description.toLowerCase().includes(searchLower)) return true;
              if (item.summary && typeof item.summary === 'string' && item.summary.toLowerCase().includes(searchLower)) return true;
              return false;
            }).length : 0;

            // clamp max tag size on mobile using CSS clamp
            const scalableFontSize = `clamp(0.875rem, ${fontSize * 0.75}px + 1vw, ${fontSize}px)`;

            return (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.5, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  delay: i * 0.05, 
                  type: 'spring', 
                  stiffness: 250, 
                  damping: 18 
                }}
                className="relative group/kw inline-block z-10 hover:z-20"
              >
                <span 
                  onClick={() => setSelectedKeyword(kw.text)}
                  className={`block ${color} ${fontWeight} ${opacity} transition-all duration-300 hover:scale-125 hover:-translate-y-1 hover:text-indigo-600 cursor-pointer drop-shadow-sm hover:drop-shadow-md text-center`}
                  style={{ fontSize: scalableFontSize, lineHeight: 1.2 }}
                >
                  {kw.text}
                </span>
                
                {/* Custom Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 scale-95 group-hover/kw:opacity-100 group-hover/kw:scale-100 transition-all duration-300 pointer-events-none z-30 flex flex-col items-center">
                  <div className="bg-slate-900 border border-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex items-center gap-1.5">
                    <span className="text-indigo-400">{kw.text}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600 mx-0.5"></span>
                    <span>{docCount} tài liệu</span>
                  </div>
                  <div className="w-2 h-2 bg-slate-900 border-b border-r border-slate-700 transform rotate-45 -mt-1.5"></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedKeyword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedKeyword(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Từ khóa: <span className="text-indigo-600">{selectedKeyword}</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Tìm thấy {relatedDocuments.length} tài liệu liên quan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedKeyword(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {relatedDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {relatedDocuments.map((doc, index) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer bg-white">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-900 mb-1.5 group-hover:text-indigo-700 transition-colors line-clamp-1">
                              {doc.title || 'Tài liệu không có tiêu đề'}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {doc.summary || doc.description || 'Không có mô tả'}
                            </p>
                            
                            {doc.tags && Array.isArray(doc.tags) && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {doc.tags.map((tag: string, tIndex: number) => (
                                  <span 
                                    key={tIndex} 
                                    className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${tag.toLowerCase() === selectedKeyword.toLowerCase() ? 'bg-indigo-100 text-indigo-700 border border-indigo-200/50' : 'bg-slate-100 text-slate-600 border border-slate-200/50'}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <FileText size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Không tìm thấy tài liệu thực tế</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Từ khóa này được tạo ngẫu nhiên hoặc các tài liệu liên quan không được chia sẻ với bạn.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

KeywordWordCloud.displayName = 'KeywordWordCloud';
