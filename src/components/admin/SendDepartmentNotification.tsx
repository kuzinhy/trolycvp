import React, { useState, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNotification } from '../../context/NotificationContext';
import { useNotifications } from '../../hooks/useNotifications';
import { Loader2, Send, Bell } from 'lucide-react';

export const SendDepartmentNotification: React.FC = () => {
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { showSuccess, showError } = useNotification();
  const { addNotification } = useNotifications();

  const handleSend = useCallback(async () => {
    if (!department || !title || !message) {
      showError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsSending(true);
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users')));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const salesUsers = users.filter(u => u.department === department);

      const promises = salesUsers.map(u => 
        addNotification({
          title: title.trim(),
          description: message.trim(),
          type: 'info',
          link: 'dashboard'
        }, u.id, u.unitId || 'all')
      );

      await Promise.all(promises);
      showSuccess(`Đã gửi thông báo đến ${salesUsers.length} người dùng phòng ${department}`);
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('Error sending notifications:', error);
      showError('Lỗi khi gửi thông báo');
    } finally {
      setIsSending(false);
    }
  }, [department, title, message, addNotification, showSuccess, showError]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Bell className="text-blue-500" />
        Gửi thông báo theo phòng ban
      </h3>
      <input
        type="text"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="Tên phòng ban (ví dụ: sales)"
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề thông báo"
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Nội dung thông báo..."
        rows={4}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"
      />
      <button
        onClick={handleSend}
        disabled={isSending || !department || !title || !message}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
      >
        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        Gửi thông báo
      </button>
    </div>
  );
};
