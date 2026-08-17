import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageCircle, 
  Loader2, 
  X, 
  Minimize2, 
  Maximize2, 
  Minus, 
  Users, 
  Search, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Hash, 
  RefreshCw, 
  Lock, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, where } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { UserList } from './UserList';
import axios from 'axios';

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
  const { user, unitId, isAdmin, googleDriveToken, signInWithGoogle } = useAuth();
  
  // Chat modes: 'internal' (Firestore) or 'google' (Google Chat API)
  const [chatMode, setChatMode] = useState<'internal' | 'google'>('internal');
  
  // Internal (Firestore) States
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Google Chat States
  const [googleSpaces, setGoogleSpaces] = useState<any[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<any | null>(null);
  const [googleMessages, setGoogleMessages] = useState<any[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSendingGoogle, setIsSendingGoogle] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSearchTerm, setGoogleSearchTerm] = useState('');
  
  // UI States
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Listen to Internal Firestore Messages
  useEffect(() => {
    if (!isOpen || !user || chatMode !== 'internal') return;

    const messagesMap = new Map<string, TeamMessage>();

    const updateMessages = () => {
      const allMessages = Array.from(messagesMap.values());
      const visibleMessages = allMessages.filter(msg => 
        (msg.unitId === unitId || msg.unitId === 'system') || 
        (msg.senderId === user.uid || msg.recipientId === user.uid)
      );
      
      visibleMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB; // Ascending
      });
      
      setMessages(visibleMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    const qGroup = query(
      collection(db, 'team_messages'),
      where('unitId', 'in', [unitId || '', 'system']),
      limit(500)
    );

    const qPrivate = query(
      collection(db, 'team_messages'),
      where('recipientId', '==', user.uid),
      limit(500)
    );

    const unsubscribeGroup = onSnapshot(qGroup, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        messagesMap.set(doc.id, { id: doc.id, ...data, recipientId: data.recipientId || null } as TeamMessage);
      });
      updateMessages();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'team_messages');
    });

    const unsubscribePrivate = onSnapshot(qPrivate, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        messagesMap.set(doc.id, { id: doc.id, ...data, recipientId: data.recipientId || null } as TeamMessage);
      });
      updateMessages();
    }, (error) => {
      console.warn("Private messages listener error:", error);
    });

    return () => {
      unsubscribeGroup();
      unsubscribePrivate();
    };
  }, [unitId, isOpen, user?.uid, chatMode]);

  // Google Chat Integration: Fetch Spaces (Rooms)
  const fetchGoogleSpaces = async () => {
    if (!googleDriveToken) return;
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      const res = await axios.get('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: `Bearer ${googleDriveToken}` }
      });
      const spaces = res.data.spaces || [];
      setGoogleSpaces(spaces);
      if (spaces.length > 0 && !selectedSpace) {
        setSelectedSpace(spaces[0]);
      }
    } catch (err: any) {
      console.error("Lỗi lấy Google Spaces:", err);
      // If unauthorized, token might be expired
      if (err.response?.status === 401) {
        setGoogleError("Phiên liên kết Google Workspace đã hết hạn. Vui lòng kết nối lại.");
      } else {
        setGoogleError("Không thể tải danh sách phòng chat từ Google. Vui lòng đảm bảo bạn đã bật và có quyền truy cập Google Chat API.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Google Chat Integration: Fetch Messages for Selected Space
  const fetchGoogleMessages = async (spaceName: string) => {
    if (!googleDriveToken) return;
    try {
      const res = await axios.get(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
        headers: { Authorization: `Bearer ${googleDriveToken}` },
        params: { pageSize: 50 }
      });
      
      const msgs = res.data.messages || [];
      // Google Chat messages are typically in order, we display them
      setGoogleMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error("Lỗi lấy Google Messages:", err);
    }
  };

  // Initial load for Google Chat when mode changes or token updates
  useEffect(() => {
    if (isOpen && chatMode === 'google' && googleDriveToken) {
      fetchGoogleSpaces();
    }
  }, [isOpen, chatMode, googleDriveToken]);

  // Fetch Google Messages when space is selected
  useEffect(() => {
    if (isOpen && chatMode === 'google' && selectedSpace?.name) {
      fetchGoogleMessages(selectedSpace.name);
    } else {
      setGoogleMessages([]);
    }
  }, [isOpen, chatMode, selectedSpace?.name]);

  // Polling for Google Chat Messages (every 10 seconds to keep conversation updated)
  useEffect(() => {
    if (!isOpen || chatMode !== 'google' || !selectedSpace?.name || !googleDriveToken) return;

    const interval = setInterval(() => {
      fetchGoogleMessages(selectedSpace.name);
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, chatMode, selectedSpace?.name, googleDriveToken]);

  // Filter Google Spaces based on search
  const filteredGoogleSpaces = googleSpaces.filter(space => 
    (space.displayName || '').toLowerCase().includes(googleSearchTerm.toLowerCase())
  );

  // Filter internal messages based on selection
  const filteredMessages = selectedUser 
    ? messages.filter(msg => 
        (msg.senderId === user?.uid && msg.recipientId === selectedUser.uid) ||
        (msg.senderId === selectedUser.uid && msg.recipientId === user?.uid)
      )
    : messages.filter(msg => !msg.recipientId);

  // Connect Google account
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      await signInWithGoogle(true); // request workspace access including Google Chat
    } catch (err) {
      console.error("Kết nối Google thất bại:", err);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Send Message Handler (Universal)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    if (chatMode === 'google') {
      if (!googleDriveToken || !selectedSpace) return;
      setIsSendingGoogle(true);
      const textToSend = input.trim();
      setInput(''); // clear immediately for snappy UI
      try {
        const res = await axios.post(`https://chat.googleapis.com/v1/${selectedSpace.name}/messages`, 
          { text: textToSend },
          { headers: { Authorization: `Bearer ${googleDriveToken}`, 'Content-Type': 'application/json' } }
        );
        // Append sent message
        setGoogleMessages(prev => [...prev, res.data]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (err: any) {
        console.error("Lỗi gửi tin nhắn Google Chat:", err);
        setGoogleError("Không thể gửi tin nhắn. Vui lòng kiểm tra lại kết nối.");
        setInput(textToSend); // restore input
      } finally {
        setIsSendingGoogle(false);
      }
    } else {
      // Internal Firestore Chat
      if (isSending) return;
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
            height: isMinimized ? '60px' : (isMaximized ? 'calc(100vh - 48px)' : '650px'),
            width: isMinimized ? '280px' : (isMaximized ? 'calc(100vw - 48px)' : '1050px'),
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
                {chatMode === 'google' ? (
                  <img src="https://www.gstatic.com/images/branding/product/2x/chat_48dp.png" alt="" className="w-5 h-5 object-contain" />
                ) : selectedUser ? (
                  <Users size={18} />
                ) : (
                  <Hash size={18} />
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold tracking-tight">
                  {chatMode === 'google' 
                    ? `Google Chat • ${selectedSpace ? (selectedSpace.displayName || 'Phòng chat') : 'Kênh liên kết'}`
                    : selectedUser 
                      ? selectedUser.displayName 
                      : "Thảo luận nội bộ"}
                </h3>
                {!isMinimized && (
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", chatMode === 'google' ? "bg-emerald-400" : "bg-blue-400")} />
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {chatMode === 'google' ? "Hệ thống kết nối Google Chat" : "Mạng lưới nội bộ Văn phòng"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {chatMode === 'google' && googleDriveToken && !isMinimized && (
                <button 
                  onClick={() => selectedSpace?.name && fetchGoogleMessages(selectedSpace.name)}
                  disabled={isGoogleLoading}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-50"
                  title="Làm mới tin nhắn"
                >
                  <RefreshCw size={14} className={cn(isGoogleLoading && "animate-spin")} />
                </button>
              )}
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
                "border-r border-slate-100 flex flex-col transition-all duration-300 bg-slate-50/50",
                isMaximized ? "w-72" : "w-64"
              )}>
                {/* Mode Selector */}
                <div className="p-2.5 border-b border-slate-100 bg-slate-100/50">
                  <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1">
                    <button 
                      onClick={() => setChatMode('internal')}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        chatMode === 'internal' 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/20" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <MessageCircle size={13} />
                      <span>Nội bộ</span>
                    </button>
                    <button 
                      onClick={() => setChatMode('google')}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        chatMode === 'google' 
                          ? "bg-white text-emerald-700 shadow-sm border border-slate-200/20" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <img src="https://www.gstatic.com/images/branding/product/2x/chat_48dp.png" alt="" className="w-3.5 h-3.5 object-contain" />
                      <span>Google Chat</span>
                    </button>
                  </div>
                </div>

                {chatMode === 'internal' ? (
                  <>
                    {/* Internal User List Search */}
                    <div className="p-3 border-b border-slate-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm thành viên..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-slate-100/60 border border-slate-200/50 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <UserList onSelectUser={setSelectedUser} selectedUser={selectedUser} searchTerm={searchTerm} />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Google Chat Spaces List */}
                    {googleDriveToken ? (
                      <>
                        <div className="p-3 border-b border-slate-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Tìm kiếm phòng chat..."
                              value={googleSearchTerm}
                              onChange={(e) => setGoogleSearchTerm(e.target.value)}
                              className="w-full bg-slate-100/60 border border-slate-200/50 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase px-3 py-1 tracking-wider">Phòng chat của bạn</p>
                          {isGoogleLoading && googleSpaces.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                              <Loader2 size={18} className="animate-spin text-emerald-600" />
                              <span>Đang tải danh sách phòng...</span>
                            </div>
                          ) : filteredGoogleSpaces.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              Không tìm thấy phòng chat nào.
                            </div>
                          ) : (
                            filteredGoogleSpaces.map((space) => {
                              const isSelected = selectedSpace?.name === space.name;
                              return (
                                <button
                                  key={space.name}
                                  onClick={() => setSelectedSpace(space)}
                                  className={cn(
                                    "w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center gap-2.5",
                                    isSelected 
                                      ? "bg-emerald-50 text-emerald-950 font-semibold border border-emerald-100/50" 
                                      : "hover:bg-slate-100 text-slate-600"
                                  )}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold",
                                    isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                                  )}>
                                    {(space.displayName || 'P').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-xs font-medium">{space.displayName || 'Phòng không tên'}</p>
                                    <p className="text-[9px] text-slate-400 truncate uppercase tracking-wider">{space.spaceType || 'ROOM'}</p>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center h-full flex flex-col items-center justify-center text-slate-400">
                        <Lock size={24} className="text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-600 mb-1">Chưa liên kết Google</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">Vui lòng bấm nút liên kết bên cạnh để bắt đầu kết nối.</p>
                        <button
                          onClick={handleConnectGoogle}
                          disabled={isConnectingGoogle}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center gap-2"
                        >
                          {isConnectingGoogle ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <span>Kết nối tài khoản</span>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col bg-slate-50/30">
                {chatMode === 'google' && !googleDriveToken ? (
                  // Google Chat Landing & Connect Screen
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-md w-full bg-white border border-slate-200/60 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                        <img src="https://www.gstatic.com/images/branding/product/2x/chat_48dp.png" alt="Google Chat" className="w-12 h-12 object-contain" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 tracking-tight mb-2 uppercase">KẾT NỐI HỆ THỐNG GOOGLE CHAT</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-6 text-center max-w-sm">
                        Đồng chí <strong>Nguyễn Minh Huy</strong> vui lòng liên kết tài khoản Google Workspace để đồng bộ và trực tiếp điều hành công việc qua các kênh của Google Chat từ Hệ thống Chỉ huy Chiến lược 8.0.
                      </p>
                      
                      <button
                        onClick={handleConnectGoogle}
                        disabled={isConnectingGoogle}
                        className="w-full max-w-xs py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-500/10"
                      >
                        {isConnectingGoogle ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Đang thiết lập liên kết...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Liên kết Google Workspace</span>
                          </>
                        )}
                      </button>
                      
                      <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-400">
                        <CheckCircle size={12} className="text-emerald-500" />
                        <span>Kết nối an toàn qua chuẩn OAuth 2.0 của Google</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Chat Header (Sub) */}
                    <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {chatMode === 'google' 
                            ? (selectedSpace ? `# ${selectedSpace.displayName}` : "Chưa chọn phòng chat") 
                            : (selectedUser ? `@${selectedUser.displayName}` : "#thao-luan-chung")}
                        </span>
                        {chatMode === 'google' && selectedSpace && (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-100">
                            Google Space Real-time
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {chatMode === 'google' && (
                          <span className="text-[10px] text-slate-400 italic">Đồng bộ tự động sau 10s</span>
                        )}
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Messages List Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      {chatMode === 'google' ? (
                        // Google Chat Messages Rendering
                        !selectedSpace ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                              <MessageCircle size={32} className="text-emerald-600" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-600 mb-1">Chọn một phòng chat</h4>
                            <p className="text-xs text-slate-400 max-w-[220px]">Nhấp chọn phòng chat ở danh sách bên trái để tham gia trò chuyện trực tuyến.</p>
                          </div>
                        ) : isGoogleLoading && googleMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <Loader2 size={32} className="animate-spin text-emerald-600 mb-4" />
                            <h4 className="text-sm font-bold text-slate-600 mb-1">Đang tải tin nhắn</h4>
                            <p className="text-xs text-slate-400">Đang tải cuộc hội thoại từ Google Chat API...</p>
                          </div>
                        ) : googleMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                              <MessageCircle size={32} className="text-slate-300" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-600 mb-1">Hội thoại trống</h4>
                            <p className="text-xs text-slate-400">Chưa có tin nhắn nào trong phòng chat này hoặc ứng dụng đang nạp dữ liệu.</p>
                          </div>
                        ) : (
                          googleMessages.map((msg, index) => {
                            const isMe = msg.sender?.name?.includes('users/') && msg.sender?.displayName === user?.displayName;
                            const prevMsg = index > 0 ? googleMessages[index - 1] : null;
                            const showAvatar = !prevMsg || prevMsg.sender?.name !== msg.sender?.name;
                            const timeStr = msg.createTime 
                              ? new Date(msg.createTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
                              : '';

                            return (
                              <div key={msg.name || index} className={cn(
                                "flex gap-3 group",
                                isMe ? "flex-row-reverse" : "flex-row",
                                !showAvatar ? "mt-[-16px]" : ""
                              )}>
                                {/* Avatar */}
                                <div className="w-8 shrink-0 flex flex-col items-center">
                                  {showAvatar ? (
                                    msg.sender?.avatarUrl ? (
                                      <img src={msg.sender.avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover shadow-sm ring-2 ring-white" />
                                    ) : (
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white",
                                        isMe ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                                      )}>
                                        {(msg.sender?.displayName || 'U').charAt(0).toUpperCase()}
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
                                        {msg.sender?.displayName || 'Người dùng Google'}
                                      </span>
                                      <span className="text-[9px] font-medium text-slate-400">
                                        {timeStr}
                                      </span>
                                    </div>
                                  )}
                                  <div className={cn(
                                    "px-4 py-2.5 text-sm shadow-sm transition-all relative whitespace-pre-wrap",
                                    isMe 
                                      ? "bg-emerald-600 text-white rounded-2xl rounded-tr-none" 
                                      : "bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100"
                                  )}>
                                    {msg.text}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      ) : (
                        // Internal Firestore Messages Rendering
                        filteredMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                              <MessageCircle size={32} className="text-slate-300" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-600 mb-1">Bắt đầu cuộc trò chuyện</h4>
                            <p className="text-xs text-slate-400 max-w-[200px]">Gửi tin nhắn để bắt đầu thảo luận nội bộ với đồng nghiệp.</p>
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
                              <div key={`${msg.id}-${index}`} className={cn(
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
                        )
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100">
                      {googleError && (
                        <div className="mb-3 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 flex items-center gap-2">
                          <AlertTriangle size={13} className="shrink-0" />
                          <span className="flex-1">{googleError}</span>
                          <button onClick={() => setGoogleError(null)} className="hover:bg-rose-100 p-0.5 rounded">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      
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
                            placeholder={
                              chatMode === 'google' 
                                ? (selectedSpace ? `Nhắn lên Google Space #${selectedSpace.displayName}...` : "Vui lòng chọn phòng chat để nhập liệu")
                                : (selectedUser ? `Nhắn tin cho ${selectedUser.displayName}...` : "Nhập tin nhắn...")
                            }
                            disabled={chatMode === 'google' && !selectedSpace}
                            className="w-full bg-transparent border-none resize-none py-2 px-3 text-sm focus:outline-none min-h-[40px] max-h-[120px] custom-scrollbar disabled:opacity-50"
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
                              disabled={!input.trim() || isSending || isSendingGoogle || (chatMode === 'google' && !selectedSpace)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-1.5 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg",
                                chatMode === 'google' 
                                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20" 
                                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20",
                                !input.trim() && "bg-slate-300 shadow-none hover:bg-slate-300"
                              )}
                            >
                              {isSending || isSendingGoogle ? (
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
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
