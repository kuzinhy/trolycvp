import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageCircle, Loader2, X, Minimize2, Maximize2, Minus, Users, Search, Paperclip, Smile, MoreVertical, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, where } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { UserList } from './UserList';

interface TeamMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  createdAt: any;
  unitId: string;
  recipientId: string | null;
}

interface TeamChatModuleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamChatModule: React.FC<TeamChatModuleProps> = ({ isOpen, onClose }) => {
  const { user, unitId, isAdmin } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; // 120px is max-h-[120px]
    }
  }, [input]);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'team_messages'),
      where('unitId', 'in', [unitId || '', 'system']),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          recipientId: data.recipientId || null
        }
      }) as TeamMessage[];
      
      // Filter messages on the client: 
      // Show group messages (unitId matches or is system) AND private messages (sender or recipient is current user)
      const visibleMessages = loadedMessages.filter(msg => 
        (msg.unitId === unitId || msg.unitId === 'system') || 
        (msg.senderId === user?.uid || msg.recipientId === user?.uid)
      );
      
      // Sort in memory to avoid requiring composite indexes
      visibleMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB; // Ascending
      });
      
      setMessages(visibleMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'team_messages');
    });

    return () => unsubscribe();
  }, [unitId, isOpen, user?.uid]);

  const filteredMessages = selectedUser 
    ? messages.filter(msg => 
        (msg.senderId === user?.uid && msg.recipientId === selectedUser.uid) ||
        (msg.senderId === selectedUser.uid && msg.recipientId === user?.uid)
      )
    : messages.filter(msg => !msg.recipientId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isSending) return;
    if (!unitId && !isAdmin) return;

    setIsSending(true);

    try {
      await addDoc(collection(db, 'team_messages'), {
        text: input.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'Người dùng',
        senderPhoto: user.photoURL,
        unitId: unitId || '',
        recipientId: selectedUser?.uid || null,
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'team_messages');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            height: isMinimized ? '60px' : (isMaximized ? 'calc(100vh - 48px)' : '600px'),
            width: isMinimized ? '260px' : (isMaximized ? 'calc(100vw - 48px)' : '1000px'),
            bottom: isMaximized ? '24px' : '24px',
            right: isMaximized ? '24px' : '24px'
          }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={cn(
            "fixed z-[60] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out",
            isMinimized ? "cursor-pointer hover:border-blue-400" : ""
          )}
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          {/* Header */}
          <div className="bg-slate-900 p-3 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                {selectedUser ? <Users size={18} /> : <Hash size={18} />}
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold tracking-tight">
                  {selectedUser ? selectedUser.displayName : "Thảo luận chung"}
                </h3>
                {!isMinimized && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {selectedUser ? (selectedUser.isOnline ? "Trực tuyến" : "Ngoại tuyến") : "Kênh chung • 24/7"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMaximized(!isMaximized);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                  title={isMaximized ? "Thu nhỏ" : "Toàn màn hình"}
                >
                  {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                  if (isMaximized) setIsMaximized(false);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex flex-1 overflow-hidden bg-white">
              {/* Sidebar */}
              <div className={cn(
                "border-r border-slate-100 flex flex-col transition-all duration-300",
                isMaximized ? "w-72" : "w-64"
              )}>
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm thành viên..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <UserList onSelectUser={setSelectedUser} selectedUser={selectedUser} searchTerm={searchTerm} />
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-slate-50/30">
                {/* Chat Header (Sub) */}
                <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      {selectedUser ? `@${selectedUser.displayName}` : "#thao-luan-chung"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle size={32} className="text-slate-300" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-600 mb-1">Bắt đầu cuộc trò chuyện</h4>
                      <p className="text-xs text-slate-400 max-w-[200px]">Gửi tin nhắn để bắt đầu thảo luận với đồng nghiệp.</p>
                    </div>
                  ) : (
                    filteredMessages.map((msg, index) => {
                      const isMe = msg.senderId === user?.uid;
                      const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                      const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
                      const timeStr = msg.createdAt?.seconds 
                        ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
                        : '';

                      return (
                        <div key={msg.id} className={cn(
                          "flex gap-3 group",
                          isMe ? "flex-row-reverse" : "flex-row",
                          !showAvatar ? "mt-[-16px]" : ""
                        )}>
                          {/* Avatar */}
                          <div className="w-8 shrink-0 flex flex-col items-center">
                            {showAvatar ? (
                              msg.senderPhoto ? (
                                <img src={msg.senderPhoto} alt="" className="w-8 h-8 rounded-lg object-cover shadow-sm ring-2 ring-white" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm ring-2 ring-white">
                                  {msg.senderName.charAt(0).toUpperCase()}
                                </div>
                              )
                            ) : (
                              <div className="w-8 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[8px] text-slate-400 font-medium">{timeStr}</span>
                              </div>
                            )}
                          </div>

                          {/* Message Content */}
                          <div className={cn(
                            "flex flex-col max-w-[85%]",
                            isMe ? "items-end" : "items-start"
                          )}>
                            {showAvatar && (
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-[11px] font-bold text-slate-700">
                                  {msg.senderName}
                                </span>
                                <span className="text-[9px] font-medium text-slate-400">
                                  {timeStr}
                                </span>
                              </div>
                            )}
                            <div className={cn(
                              "px-4 py-2.5 text-sm shadow-sm transition-all relative",
                              isMe 
                                ? "bg-blue-600 text-white rounded-2xl rounded-tr-none" 
                                : "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500/50 transition-all">
                    <form onSubmit={handleSend} className="flex flex-col">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend(e);
                          }
                        }}
                        placeholder={selectedUser ? `Nhắn tin cho ${selectedUser.displayName}...` : "Nhập tin nhắn..."}
                        className="w-full bg-transparent border-none resize-none py-2 px-3 text-sm focus:outline-none min-h-[40px] max-h-[120px] custom-scrollbar"
                        rows={1}
                      />
                      <div className="flex items-center justify-between mt-2 px-2 pb-1">
                        <div className="flex items-center gap-1">
                          <button type="button" className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                            <Paperclip size={16} />
                          </button>
                          <button type="button" className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                            <Smile size={16} />
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={!input.trim() || isSending}
                          className={cn(
                            "flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20",
                            !input.trim() && "bg-slate-300 shadow-none"
                          )}
                        >
                          {isSending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <span>Gửi</span>
                              <Send size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Nhấn <strong>Enter</strong> để gửi, <strong>Shift + Enter</strong> để xuống dòng
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
