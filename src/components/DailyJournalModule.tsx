import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, Tag, Link2, Plus, Edit2, Trash2, CheckCircle2, Clock, X, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useDashboardContext } from '../context/DashboardContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface DailyJournalEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  content: string;
  tags: string[];
  linkedTaskIds: string[];
  linkedEventIds: string[];
  linkedMeetingIds: string[];
  createdAt: any;
  updatedAt: any;
}

export const DailyJournalModule: React.FC = () => {
  const { user } = useAuth();
  const { tasks, events, meetings } = useDashboardContext();
  
  const [entries, setEntries] = useState<DailyJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);
  const [linkedMeetingIds, setLinkedMeetingIds] = useState<string[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-tagging rules
  const AUTO_TAG_RULES: Record<string, string[]> = {
    'họp': ['hội họp'],
    'giao ban': ['hội họp', 'giao ban'],
    'báo cáo': ['báo cáo'],
    'khẩn': ['quan trọng', 'khẩn'],
    'đảng ủy': ['đảng vụ'],
    'sinh hoạt': ['sinh hoạt chi bộ'],
    'kiểm tra': ['kiểm tra giám sát'],
    'task': ['nhiệm vụ'],
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch user's journal entries
    const q = query(
      collection(db, 'daily_journals'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: DailyJournalEntry[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as DailyJournalEntry);
      });
      
      // Sort client-side to avoid requiring a composite index
      data.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // descending
        }
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setEntries(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching journals:", error);
      handleFirestoreError(error, OperationType.LIST, 'daily_journals');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle content change and auto-tag
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    
    // Simple auto-tagging
    const lowerText = text.toLowerCase();
    const newTags = new Set(tags);
    let added = false;
    
    Object.entries(AUTO_TAG_RULES).forEach(([keyword, matchTags]) => {
      if (lowerText.includes(keyword)) {
        matchTags.forEach(t => {
          if (!newTags.has(t)) {
            newTags.add(t);
            added = true;
          }
        });
      }
    });
    
    if (added) {
      setTags(Array.from(newTags));
    }
  };

  const addTag = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    
    try {
      setIsSaving(true);
      const payload: Partial<DailyJournalEntry> = {
        userId: user.uid,
        date: currentDate,
        content: content.trim(),
        tags,
        linkedTaskIds,
        linkedEventIds,
        linkedMeetingIds,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'daily_journals', editingId), payload);
      } else {
        await addDoc(collection(db, 'daily_journals'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving journal:", error);
      handleFirestoreError(error, OperationType.WRITE, 'daily_journals');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry: DailyJournalEntry) => {
    setEditingId(entry.id);
    setCurrentDate(entry.date);
    setContent(entry.content);
    setTags(entry.tags || []);
    setLinkedTaskIds(entry.linkedTaskIds || []);
    setLinkedEventIds(entry.linkedEventIds || []);
    setLinkedMeetingIds(entry.linkedMeetingIds || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
    try {
      await deleteDoc(doc(db, 'daily_journals', id));
    } catch (error) {
       console.error("Error deleting journal:", error);
       handleFirestoreError(error, OperationType.DELETE, `daily_journals/${id}`);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setContent('');
    setTags([]);
    setLinkedTaskIds([]);
    setLinkedEventIds([]);
    setLinkedMeetingIds([]);
  };

  const toggleTaskLink = (taskId: string) => {
    setLinkedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleEventLink = (eventId: string) => {
    setLinkedEventIds(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const toggleMeetingLink = (meetingId: string) => {
    setLinkedMeetingIds(prev => 
      prev.includes(meetingId) ? prev.filter(id => id !== meetingId) : [...prev, meetingId]
    );
  };
  
  // Format Date Function Helper
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-600" />
            Nhật ký hàng ngày
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ghi chú nhanh sự kiện, tự động gắn thẻ và liên kết công việc
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-slate-400" />
              {editingId ? 'Sửa bản ghi' : 'Tạo bản ghi mới'}
            </h3>
            
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Ngày ghi chú</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={currentDate}
                    onChange={(e) => setCurrentDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                  <span>Nội dung</span>
                  <span className="text-[10px] text-indigo-500 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-3 h-3" /> Tự động gắn thẻ
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Hôm nay có sự kiện gì quan trọng?"
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5">Thẻ (Tags)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <AnimatePresence>
                    {tags.map(tag => (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-indigo-900 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag(e)}
                    placeholder="Thêm thẻ (Enter)..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={addTag} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition">
                    Thêm
                  </button>
                </div>
              </div>

              {/* Links */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" /> Liên kết Dữ liệu
                </label>
                <div className="space-y-2 border border-slate-100 p-2.5 rounded-lg bg-slate-50/50 max-h-48 overflow-y-auto custom-scrollbar">
                  {/* Tasks list */}
                  <div className="text-xs font-semibold text-slate-600 mb-1">Nhiệm vụ</div>
                  {tasks.length === 0 && <div className="text-xs text-slate-400 italic mb-2">Không có nhiệm vụ nào</div>}
                  {tasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => toggleTaskLink(task.id!)}
                      className={`text-xs p-2 rounded cursor-pointer border transition-colors flex items-center gap-2 ${
                        linkedTaskIds.includes(task.id!) 
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-medium' 
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${linkedTaskIds.includes(task.id!) ? 'text-indigo-500' : 'text-slate-300'}`} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  
                  {/* Events list */}
                  <div className="text-xs font-semibold text-slate-600 mt-3 mb-1">Lịch trình</div>
                  {events.length === 0 && meetings.length === 0 && <div className="text-xs text-slate-400 italic">Không có sự kiện/lịch họp nào</div>}
                  {events.map(event => (
                    <div 
                      key={event.id} 
                      onClick={() => toggleEventLink(event.id!)}
                      className={`text-xs p-2 rounded cursor-pointer border transition-colors flex items-center gap-2 ${
                        linkedEventIds.includes(event.id!) 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium' 
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${linkedEventIds.includes(event.id!) ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className="truncate">Sự kiện: {event.name}</span>
                    </div>
                  ))}
                  {meetings.map(meeting => (
                    <div 
                      key={meeting.id} 
                      onClick={() => toggleMeetingLink(meeting.id!)}
                      className={`text-xs p-2 rounded cursor-pointer border transition-colors flex items-center gap-2 mt-1 ${
                        linkedMeetingIds.includes(meeting.id!) 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium' 
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${linkedMeetingIds.includes(meeting.id!) ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className="truncate">Họp: {meeting.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="flex-1 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving || !content.trim()}
                  className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {isSaving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu nhật ký')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right List Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 h-full min-h-[600px]">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Dòng thời gian
            </h3>

            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-50 border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm">Chưa có bản ghi nhật ký nào.</p>
                <p className="text-slate-400 text-xs mt-1">Ghi chú lại những sự kiện quan trọng để theo dõi.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                {entries.map((entry, idx) => {
                  // Resolve linked tasks and events
                  const linkedTasks = tasks.filter(t => entry.linkedTaskIds?.includes(t.id!));
                  const linkedEvents = events.filter(e => entry.linkedEventIds?.includes(e.id!));
                  const linkedMeetings = meetings.filter(m => entry.linkedMeetingIds?.includes(m.id!));

                  // Group by date (simple approach: show date header if it changes)
                  const showDate = idx === 0 || entry.date !== entries[idx - 1].date;

                  return (
                    <React.Fragment key={entry.id}>
                      {showDate && (
                        <div className="relative -ml-[23px] flex items-center gap-4 mb-4">
                          <div className="w-11 h-[26px] bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shrink-0 z-10">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <h4 className="font-bold text-slate-700 text-sm">{formatDate(entry.date)}</h4>
                        </div>
                      )}
                      
                      <div className="relative ml-6">
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-white z-10" />
                        
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm group hover:ring-1 hover:ring-indigo-200 transition-all">
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id!)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Tags Rendering */}
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {entry.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Linked Items Rendering */}
                          {((entry.linkedTaskIds && entry.linkedTaskIds.length > 0) || 
                            (entry.linkedEventIds && entry.linkedEventIds.length > 0) ||
                            (entry.linkedMeetingIds && entry.linkedMeetingIds.length > 0)) && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                              {linkedTasks.map(t => (
                                <div key={t.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span className="truncate">Nhiệm vụ: {t.title}</span>
                                </div>
                              ))}
                              {linkedEvents.map(e => (
                                <div key={e.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="truncate">Sự kiện: {e.name}</span>
                                </div>
                              ))}
                              {linkedMeetings.map(m => (
                                <div key={m.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                  <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="truncate">Họp: {m.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-3 text-[10px] text-slate-400 font-mono">
                            {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
