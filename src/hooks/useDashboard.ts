import { useState, useCallback, useEffect } from 'react';
import { startOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Birthday, Meeting, Event, Task } from '../constants';
import { ToastType } from '../components/ui/Toast';
import { generateContentWithRetry, parseAIResponse } from '../lib/ai-utils';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, deleteDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';
import { cacheData, getCachedData } from '../lib/cache';

export function useDashboard(
  showToast?: (message: string, type?: ToastType) => void,
  updateTasks?: (updater: Task[] | ((prev: Task[]) => Task[])) => Promise<void>
) {
  const { user, userInfo } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: birthdays = [], isLoading: isBirthdaysLoading, refetch: loadBirthdays } = useQuery({
    queryKey: ['birthdays', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(collection(db, 'users', user.uid, 'birthdays'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Birthday));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${user.uid}/birthdays`);
        showToast?.("Lỗi tải sinh nhật từ Firestore", "error");
        return [];
      }
    },
    enabled: !!user,
  });

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
  const [isSavingMeetings, setIsSavingMeetings] = useState(false);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [isSavingEvents, setIsSavingEvents] = useState(false);
  const [isSavingBirthdays, setIsSavingBirthdays] = useState(false);
  const [config, setConfig] = useState({ githubOwner: 'kuzinhy', githubRepo: 'TroLyBiThu', githubBranch: 'src' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isParsingCalendar, setIsParsingCalendar] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [smartBriefing, setSmartBriefing] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  const generateSmartBriefing = useCallback(async (tasks: Task[], meetings: Meeting[], events: Event[], birthdays: Birthday[]) => {
    if (isGeneratingBriefing) return;
    setIsGeneratingBriefing(true);
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();
      
      // Filter birthdays in the next 30 days
      const upcomingBirthdays = birthdays.filter(b => {
        const parts = b.date.split('/');
        if (parts.length < 2) return false;
        const bDay = parseInt(parts[0], 10);
        const bMonth = parseInt(parts[1], 10);
        
        // Create a date object for this year's birthday
        const bDate = new Date(today.getFullYear(), bMonth - 1, bDay);
        
        // If birthday already passed this year, check next year
        if (bDate < startOfDay(today)) {
          bDate.setFullYear(today.getFullYear() + 1);
        }
        
        // Check if it's within 30 days
        const diffTime = bDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays >= 0 && diffDays <= 30;
      });

      const prompt = `Bạn là Trợ lý Chánh Văn phòng Đảng ủy AI cấp cao. Hãy tạo một bản tin công tác "Thông minh & Chiến lược" cho ngày hôm nay (${today.toLocaleDateString('vi-VN')}).
      
      Dữ liệu đầu vào:
      - Nhiệm vụ trọng tâm: ${JSON.stringify(tasks.filter(t => t.status !== 'Completed').map(t => ({ title: t.title, priority: t.priority, deadline: t.deadline })))}
      - Lịch họp/công tác: ${JSON.stringify(meetings.filter(m => m.date === new Date().toISOString().split('T')[0]))}
      - Sự kiện & Kỷ niệm: ${JSON.stringify(events.slice(0, 3))}
      - Chăm sóc nội bộ (Sinh nhật): ${JSON.stringify(upcomingBirthdays)}
      
      Yêu cầu bản tin (Dưới 180 từ):
      1. Chào ${userInfo?.displayName || 'Chỉ huy'} bằng văn phong chuyên nghiệp, tin cậy.
      2. Điểm tin: Tóm tắt 3 việc quan trọng nhất cần giải quyết ngay.
      3. Cảnh báo: Chỉ ra các rủi ro về tiến độ hoặc xung đột lịch (nếu có).
      4. Tham mưu: Đưa ra 1 hành động mang tính chiến lược để tối ưu hóa hiệu quả làm việc trong ngày.
      5. Kết luận: Một câu truyền cảm hứng ngắn gọn.
      
      Lưu ý: Sử dụng Markdown để trình bày (in đậm các mốc thời gian, tên nhiệm vụ). Chỉ trả về nội dung bản tin.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      setSmartBriefing(response.text);
    } catch (e) {
      console.error("Briefing generation error:", e);
    } finally {
      setIsGeneratingBriefing(false);
    }
  }, [isGeneratingBriefing]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setIsEventsLoading(true);

    // Cache first
    const cacheKey = `events_${user.uid}`;
    getCachedData('app_settings', cacheKey).then(cached => {
      if (cached) setEvents(cached);
    });

    try {
      const q = query(collection(db, 'users', user.uid, 'events'));
      const querySnapshot = await getDocs(q);
      const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
      cacheData('app_settings', cacheKey, eventsData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/events`);
      showToast?.("Lỗi tải sự kiện từ Firestore", "error");
    } finally {
      setIsEventsLoading(false);
    }
  }, [user, showToast]);

  const loadMeetingsData = useCallback(async () => {
    if (!user) return;
    setIsMeetingsLoading(true);

    // Cache first
    const cacheKey = `meetings_${user.uid}`;
    getCachedData('app_settings', cacheKey).then(cached => {
      if (cached) setMeetings(cached);
    });

    try {
      const q = query(collection(db, 'users', user.uid, 'meetings'));
      const querySnapshot = await getDocs(q);
      const meetingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
      setMeetings(meetingsData);
      cacheData('app_settings', cacheKey, meetingsData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/meetings`);
      showToast?.("Lỗi tải lịch công tác từ Firestore", "error");
    } finally {
      setIsMeetingsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      loadMeetingsData();
      loadEvents();
    }
  }, [user, loadMeetingsData, loadEvents]);

  const saveEventsToFirestore = useCallback(async (eventsToSave: Event[]) => {
    if (!user) {
      return;
    }
    setIsSavingEvents(true);
    try {
      for (const e of eventsToSave) {
        await setDoc(doc(db, 'users', user.uid, 'events', e.id), { ...e }, { merge: true });
      }
      showToast?.("Đã lưu sự kiện lên Firestore", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/events`);
      showToast?.("Lỗi lưu sự kiện lên Firestore", "error");
    } finally {
      setIsSavingEvents(false);
    }
  }, [user, showToast]);

  const updateEvents = useCallback(async (updater: (prev: Event[]) => Event[]) => {
    setEvents(prev => {
      const newEvents = updater(prev);
      
      // Find deleted events
      const deletedEvents = prev.filter(p => !newEvents.some(n => n.id === p.id));
      deletedEvents.forEach(async (e) => {
        if (user && e.id) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'events', e.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/events/${e.id}`);
          }
        }
      });

      setTimeout(() => {
        saveEventsToFirestore(newEvents);
      }, 0);
      return newEvents;
    });
  }, [saveEventsToFirestore, user]);

  const saveMeetingsToFirestore = useCallback(async (meetingsToSave: Meeting[]) => {
    if (!user) return;
    setIsSavingMeetings(true);
    try {
      for (const m of meetingsToSave) {
        await setDoc(doc(db, 'users', user.uid, 'meetings', m.id), { ...m }, { merge: true });
      }
      showToast?.("Đã lưu lịch họp lên Firestore", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/meetings`);
      showToast?.("Lỗi lưu lịch họp lên Firestore", "error");
    } finally {
      setIsSavingMeetings(false);
    }
  }, [user, showToast]);

  const updateMeetings = useCallback(async (updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => {
    setMeetings(prev => {
      const newMeetings = typeof updater === 'function' ? updater(prev) : updater;
      
      // Find deleted meetings
      const deletedMeetings = prev.filter(p => !newMeetings.some(n => n.id === p.id));
      deletedMeetings.forEach(async (m) => {
        if (user && m.id) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'meetings', m.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/meetings/${m.id}`);
          }
        }
      });

      setTimeout(() => {
        saveMeetingsToFirestore(newMeetings);
      }, 0);
      return newMeetings;
    });
  }, [saveMeetingsToFirestore, user]);

  const updateBirthdays = useCallback(async (updater: Birthday[] | ((prev: Birthday[]) => Birthday[])) => {
    const prev = queryClient.getQueryData<Birthday[]>(['birthdays', user?.uid]) || [];
    const newBirthdays = typeof updater === 'function' ? updater(prev) : updater;
    
    queryClient.setQueryData(['birthdays', user?.uid], newBirthdays);
    
    if (!user) return;
    setIsSavingBirthdays(true);
    try {
      for (const b of newBirthdays) {
        await setDoc(doc(db, 'users', user.uid, 'birthdays', b.id), { ...b }, { merge: true });
      }
      // Handle deletions if necessary
      const deletedBirthdays = prev.filter(p => !newBirthdays.some(n => n.id === p.id));
      for (const b of deletedBirthdays) {
        if (b.id) {
          await deleteDoc(doc(db, 'users', user.uid, 'birthdays', b.id));
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/birthdays`);
    } finally {
      setIsSavingBirthdays(false);
    }
  }, [queryClient, user]);

  const parseCalendarContent = useCallback(async (fileContent: string) => {
    if (!fileContent.trim() || isParsingCalendar) return;
    setIsParsingCalendar(true);
    try {
      // Cải thiện logic chia nhỏ nội dung: Nếu file quá lớn (> 10000 ký tự) mới chia nhỏ
      // Nếu không thì xử lý toàn bộ để AI có cái nhìn tổng thể về tuần
      let chunks = [];
      if (fileContent.length > 10000) {
        const days = fileContent.split(/(?=Thứ\s+\w+|Ngày\s+\d+\/\d+)/gi).filter(d => d.trim());
        if (days.length > 1) {
          for (let i = 0; i < days.length; i += 5) {
            chunks.push(days.slice(i, i + 5).join('\n'));
          }
        } else {
          for (let i = 0; i < fileContent.length; i += 8000) {
            chunks.push(fileContent.substring(i, i + 8000));
          }
        }
      } else {
        chunks = [fileContent];
      }
      
      let allMeetings: Meeting[] = [];
      let allTasks: Task[] = [];
      let allEvents: Event[] = [];
      
      const currentYear = new Date().getFullYear();

      for (const chunkContent of chunks) {
        const response = await generateContentWithRetry({
          model: "gemini-3.1-pro-preview",
          contents: [{
            role: 'user',
            parts: [{
              text: `Bạn là một chuyên gia phân tích văn bản hành chính Việt Nam (như Lịch công tác tuần, Thông báo kết luận, Kế hoạch công tác). Hãy đọc nội dung sau và trích xuất tất cả các lịch họp, nhiệm vụ và sự kiện.

Nội dung cần phân tích:
${chunkContent}

Yêu cầu trích xuất chi tiết:
1. Cuộc họp (Meetings): Các buổi họp, làm việc, tiếp khách, đi cơ sở. Cần xác định:
   - Tên nội dung (name): Ngắn gọn nhưng đầy đủ ý nghĩa hành chính.
   - Ngày (date): Định dạng "YYYY-MM-DD". Năm hiện tại là ${currentYear}.
   - Giờ (time): Định dạng "HH:mm" (24h). Nếu ghi "Sáng" mặc định "08:00", "Chiều" mặc định "14:00".
   - Địa điểm (location): Nơi diễn ra.
   - Người chủ trì (chairperson): Tên lãnh đạo chủ trì.
2. Nhiệm vụ (Tasks): Các đầu việc cần thực hiện, thời hạn hoàn thành.
3. Sự kiện (Events): Ngày lễ, kỷ niệm, hội nghị lớn, các mốc thời gian quan trọng.

Quy tắc suy luận thông minh:
- Nếu văn bản ghi "Thứ Hai, ngày 06/04" thì hiểu là "${currentYear}-04-06".
- Nếu không ghi năm, mặc định là ${currentYear}.
- Nếu nội dung lộn xộn (do lỗi trích xuất PDF), hãy tìm các từ khóa: "Chủ trì", "Thành phần", "Địa điểm", "Tại", "Làm việc với".
- Cố gắng chuẩn hóa tên người (ví dụ: "đ/c Cúc" -> "Nguyễn Thu Cúc" nếu có trong ngữ cảnh hoặc danh sách lãnh đạo phổ biến).

Trả về JSON duy nhất:
{
  "meetings": [ { "name": string, "date": "YYYY-MM-DD", "time": "HH:mm", "location": string, "chairperson": string } ],
  "tasks": [ { "title": string, "deadline": "YYYY-MM-DD", "priority": "low"|"medium"|"high" } ],
  "events": [ { "name": string, "date": "YYYY-MM-DD", "type": "meeting"|"anniversary"|"holiday"|"other", "location": string } ]
}

Chỉ trả về JSON.`
            }]
          }],
          config: {
            responseMimeType: "application/json"
          }
        });

        try {
          const text = response?.text || "{}";
          const parsed = parseAIResponse(text);
          
          if (parsed && parsed.meetings && Array.isArray(parsed.meetings)) allMeetings = [...allMeetings, ...parsed.meetings];
          if (parsed.tasks && Array.isArray(parsed.tasks)) allTasks = [...allTasks, ...parsed.tasks];
          if (parsed.events && Array.isArray(parsed.events)) allEvents = [...allEvents, ...parsed.events];
        } catch (parseError) {
          console.error("Lỗi phân tích JSON từ AI:", parseError, response?.text);
        }
      }

      // Lọc bỏ các mục trùng lặp hoặc không hợp lệ
      const validMeetings = allMeetings.filter(m => m.name && m.date && m.time);
      const validTasks = allTasks.filter(t => t.title && t.deadline);
      const validEvents = allEvents.filter(e => e.name && e.date);

      // 1. Cập nhật Meetings
      if (validMeetings.length > 0) {
        updateMeetings(prev => {
          const processed = validMeetings.map((nm, idx) => ({
            ...nm,
            id: `m-sync-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            priority: nm.priority || 'medium'
          })).filter(nm => 
            !prev.some(pm => pm.name === nm.name && pm.date === nm.date && pm.time === nm.time)
          );
          return [...prev, ...processed];
        });
      }

      // 2. Cập nhật Tasks
      if (validTasks.length > 0 && updateTasks) {
        updateTasks(prev => {
          const processed = validTasks.map((nt, idx) => ({
            ...nt,
            id: `t-sync-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            status: 'Pending' as const,
            createdAt: Date.now()
          })).filter(nt => 
            !prev.some(pt => pt.title === nt.title && pt.deadline === nt.deadline)
          );
          return [...prev, ...processed];
        });
      }

      // 3. Cập nhật Events
      if (validEvents.length > 0) {
        updateEvents(prev => {
          const processed = validEvents.map((ne, idx) => ({
            ...ne,
            id: `e-sync-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`
          })).filter(ne => 
            !prev.some(pe => pe.name === ne.name && pe.date === ne.date)
          );
          return [...prev, ...processed];
        });
      }

      const totalAdded = validMeetings.length + validTasks.length + validEvents.length;
      if (totalAdded > 0) {
        showToast?.(`Đã phân tích thành công: ${validMeetings.length} cuộc họp, ${validTasks.length} nhiệm vụ, ${validEvents.length} sự kiện.`, "success");
      } else {
        showToast?.("Không tìm thấy dữ liệu lịch trình phù hợp trong tệp này. Vui lòng kiểm tra lại định dạng tệp.", "warning");
      }
    } catch (e: any) {
      console.error("Lỗi phân tích lịch:", e);
      showToast?.(`Lỗi khi phân tích nội dung lịch: ${e.message}`, "error");
    } finally {
      setIsParsingCalendar(false);
    }
  }, [isParsingCalendar, showToast, updateMeetings, updateTasks, updateEvents]);

  const parseCalendarFile = useCallback(async (file: File) => {
    console.log("Parsing file:", file.name, file.type, file.size);
    try {
      const fileContent = await file.text();
      console.log("File content length:", fileContent.length);
      return parseCalendarContent(fileContent);
    } catch (e) {
      console.error("Error reading file:", e);
      showToast?.("Lỗi đọc tệp lịch", "error");
    }
  }, [parseCalendarContent, showToast]);

  const uploadAndParseCalendar = useCallback(async (file: File) => {
    if (isUploadingFile) return;
    setIsUploadingFile(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json();
          throw new Error(error.details || error.error || "Failed to parse document");
        } else {
          const text = await res.text();
          console.error("Server returned non-JSON error:", text.substring(0, 200));
          throw new Error(`Server error (${res.status})`);
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Expected JSON but got:", text.substring(0, 200));
        throw new Error(`Phản hồi từ máy chủ không hợp lệ (Mã: ${res.status}). Vui lòng thử lại hoặc liên hệ quản trị viên.`);
      }

      const data = await res.json();
      if (data.text) {
        await parseCalendarContent(data.text);
      } else {
        showToast?.("Không thể trích xuất văn bản từ tệp này", "error");
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      showToast?.(`Lỗi khi tải tệp: ${error.message}`, "error");
    } finally {
      setIsUploadingFile(false);
    }
  }, [isUploadingFile, parseCalendarFile, showToast]);

  return {
    birthdays,
    meetings,
    setMeetings,
    events,
    setEvents,
    isMeetingsLoading,
    isEventsLoading,
    isSavingMeetings,
    isSavingEvents,
    config,
    currentTime,
    isParsingCalendar: isParsingCalendar || isUploadingFile || isSavingMeetings || isSavingEvents || isSavingBirthdays,
    loadMeetings: loadMeetingsData,
    loadEvents,
    loadBirthdays,
    updateMeetings,
    updateEvents,
    updateBirthdays,
    parseCalendarFile,
    uploadAndParseCalendar,
    isBirthdaysLoading,
    smartBriefing,
    isGeneratingBriefing,
    generateSmartBriefing
  };
}
