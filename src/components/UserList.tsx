import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface User {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isOnline: boolean;
  lastSeen?: any;
}

interface UserListProps {
  onSelectUser?: (user: User | null) => void;
  selectedUser?: User | null;
  searchTerm?: string;
}

export const UserList: React.FC<UserListProps> = ({ onSelectUser, selectedUser, searchTerm = '' }) => {
  const [users, setUsers] = useState<User[]>([]);
  const { unitId, isSuperAdmin, isAdmin } = useAuth();

  useEffect(() => {
    let q;
    if (isSuperAdmin) {
      q = query(collection(db, 'users'));
    } else if (isAdmin) {
      q = query(collection(db, 'users'), where('unitId', '==', unitId || ''));
    } else {
      q = query(collection(db, 'users_public'), where('unitId', '==', unitId || ''));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(loadedUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, isAdmin ? 'users' : 'users_public');
    });
    return () => unsubscribe();
  }, [unitId, isSuperAdmin, isAdmin]);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'không rõ';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return date.toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const getFullLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Chưa từng hoạt động';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    return `Hoạt động lần cuối: ${date.toLocaleString('vi-VN')}`;
  };

  return (
    <div className="p-2">
      <div className="px-2 py-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
          <span>Kênh thảo luận</span>
          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">1</span>
        </h4>
        <button
          onClick={() => onSelectUser?.(null)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all border mb-4",
            selectedUser === null 
              ? "bg-blue-50 border-blue-100 text-blue-700 shadow-sm" 
              : "bg-transparent border-transparent hover:bg-slate-50 text-slate-600"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Hash size={16} />
          </div>
          <span>Thảo luận chung</span>
        </button>

        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
          <span>Thành viên</span>
          <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[9px]">
            {users.filter(u => u.isOnline).length}
          </span>
        </h4>
        <div className="space-y-0.5">
          {filteredUsers.map(user => (
            <button
              key={user.uid}
              onClick={() => onSelectUser?.(user)}
              title={user.isOnline ? 'Đang trực tuyến' : getFullLastSeen(user.lastSeen)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all border group",
                selectedUser?.uid === user.uid 
                  ? "bg-white border-slate-200 text-blue-700 shadow-sm" 
                  : "bg-transparent border-transparent hover:bg-slate-50 text-slate-600"
              )}
            >
              <div className="relative shrink-0">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="" 
                    className={cn(
                      "w-8 h-8 rounded-lg object-cover shadow-sm transition-all duration-500",
                      user.isOnline && "ring-2 ring-emerald-500 ring-offset-1 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    )} 
                  />
                ) : (
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-500",
                    user.isOnline 
                      ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1 shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                      : "bg-slate-100 text-slate-500 group-hover:bg-white"
                  )}>
                    {user.displayName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-all duration-500",
                  user.isOnline 
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" 
                    : "bg-slate-300"
                )} />
              </div>
              <div className="flex flex-col items-start min-w-0 overflow-hidden">
                <span className={cn(
                  "font-bold truncate w-full transition-colors duration-300",
                  user.isOnline ? "text-slate-900" : "text-slate-500"
                )}>
                  {user.displayName}
                </span>
                <span className={cn(
                  "text-[9px] font-medium truncate w-full transition-colors duration-300",
                  user.isOnline ? "text-emerald-600" : "text-slate-400"
                )}>
                  {user.isOnline ? 'Đang trực tuyến' : `Hoạt động ${formatLastSeen(user.lastSeen)}`}
                </span>
              </div>
            </button>
          ))}
          {filteredUsers.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-[10px] text-slate-400">Không tìm thấy thành viên</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
