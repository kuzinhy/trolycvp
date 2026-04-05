import { useState, useCallback, useEffect } from 'react';
import { startOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Birthday, Meeting, Event, Task } from '../constants';
import { ToastType } from '../components/ui/Toast';
import { generateContentWithRetry } from '../lib/ai-utils';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, query, deleteDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';
import { useAuth } from '../context/AuthContext';

export function useDashboard(showToast?: (message: string, type?: ToastType) => void) {
  const { user } = useAuth();
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
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
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

      const prompt = `Bạn là Trợ lý Chánh Văn phòng Đảng ủy AI. Hãy tạo một bản tin công việc ngắn gọn (dưới 150 từ) cho ngày hôm nay (${today.toLocaleDateString('vi-VN')}).
      Dựa trên dữ liệu sau:
      - Nhiệm vụ đang chờ: ${JSON.stringify(tasks.filter(t => t.status !== 'Completed').map(t => ({ title: t.title, priority: t.priority, deadline: t.deadline })))}
      - Cuộc họp hôm nay: ${JSON.stringify(meetings.filter(m => m.date === new Date().toISOString().split('T')[0]))}
      - Sự kiện sắp tới: ${JSON.stringify(events.slice(0, 3))}
      - Sinh nhật sắp tới trong tháng: ${JSON.stringify(upcomingBirthdays)}
      
      Yêu cầu:
      1. Chào Anh Huy một cách thân thiện, chuyên nghiệp.
      2. Tóm tắt các điểm quan trọng nhất cần lưu ý trong ngày.
      3. Cảnh báo nếu có xung đột lịch trình hoặc nhiệm vụ quá hạn.
      4. Đưa ra một lời khuyên chiến lược cho ngày làm việc.
      5. Sử dụng văn phong trang trọng nhưng gần gũi của một trợ lý tin cậy.
      
      Chỉ trả về nội dung bản tin, không thêm bất kỳ văn bản nào khác.`;

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

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error("Failed to fetch config", e);
    }
  }, []);

  const saveBirthdaysToFirestore = useCallback(async (birthdaysToSave: Birthday[]) => {
    if (!user) {
      return;
    }
    setIsSavingBirthdays(true);
    try {
      // Save each birthday to Firestore
      for (const b of birthdaysToSave) {
        await setDoc(doc(db, 'users', user.uid, 'birthdays', b.id), { ...b }, { merge: true });
      }
      showToast?.("Đã lưu sinh nhật lên Firestore", "success");
      queryClient.invalidateQueries({ queryKey: ['birthdays', user.uid] });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/birthdays`);
      showToast?.("Lỗi lưu sinh nhật lên Firestore", "error");
    } finally {
      setIsSavingBirthdays(false);
    }
  }, [user, showToast, queryClient]);

  const updateBirthdays = useCallback(async (updater: (prev: Birthday[]) => Birthday[]) => {
    const newBirthdays = updater(birthdays);
    await saveBirthdaysToFirestore(newBirthdays);
  }, [saveBirthdaysToFirestore, birthdays]);

  const loadMeetings = useCallback(async () => {
    if (!user) return;
    setIsMeetingsLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'meetings'));
      const querySnapshot = await getDocs(q);
      const meetingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
      setMeetings(meetingsData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/meetings`);
      showToast?.("Lỗi tải lịch công tác từ Firestore", "error");
    } finally {
      setIsMeetingsLoading(false);
    }
  }, [user, showToast]);

  const saveMeetingsToFirestore = useCallback(async (meetingsToSave: Meeting[]) => {
    if (!user) {
      return;
    }
    setIsSavingMeetings(true);
    try {
      for (const m of meetingsToSave) {
        await setDoc(doc(db, 'users', user.uid, 'meetings', m.id), { ...m }, { merge: true });
      }
      showToast?.("Đã lưu lịch công tác lên Firestore", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/meetings`);
      showToast?.("Lỗi lưu lịch công tác lên Firestore", "error");
    } finally {
      setIsSavingMeetings(false);
    }
  }, [user, showToast]);

  const updateMeetings = useCallback(async (updater: (prev: Meeting[]) => Meeting[]) => {
    setMeetings(prev => {
      const newMeetings = updater(prev);
      
      // Find deleted meetings
      const deletedMeetings = prev.filter(p => !newMeetings.some(n => n.id === p.id));
      deletedMeetings.forEach(async (m) => {
        if (user && m.id) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'meetings', m.id));
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/meetings/${m.id}`);
          }
        }
      });

      setTimeout(() => {
        saveMeetingsToFirestore(newMeetings);
      }, 0);
      return newMeetings;
    });
  }, [saveMeetingsToFirestore, user]);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setIsEventsLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'events'));
      const querySnapshot = await getDocs(q);
      const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${user.uid}/events`);
      showToast?.("Lỗi tải sự kiện từ Firestore", "error");
    } finally {
      setIsEventsLoading(false);
    }
  }, [user, showToast]);

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

  useEffect(() => {
    if (user) {
      loadMeetings();
      loadEvents();
      loadBirthdays();
    }
  }, [user, loadMeetings, loadEvents, loadBirthdays]);

  const parseCalendarContent = useCallback(async (fileContent: string) => {
    if (!fileContent.trim() || isParsingCalendar) return;
    setIsParsingCalendar(true);
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3.1-pro-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Bạn là chuyên gia phân tích dữ liệu hành chính. Hãy phân tích nội dung lịch làm việc sau và trích xuất danh sách các cuộc họp/sự kiện một cách chính xác nhất.
            
            Trả về kết quả dưới dạng mảng JSON các đối tượng có cấu trúc:
            { "id": string, "name": string, "date": "YYYY-MM-DD", "time": "HH:mm", "location": string }
            
            Quy tắc phân tích:
            1. Trích xuất chính xác tên cuộc họp, thời gian, địa điểm.
            2. Chuyển đổi ngày tháng sang định dạng YYYY-MM-DD. Nếu lịch không ghi năm, hãy lấy năm hiện tại là ${new Date().getFullYear()}.
            3. Nếu thời gian không rõ ràng, hãy để trống hoặc đoán dựa trên ngữ cảnh.
            4. Nếu không có ngày cụ thể, hãy đoán dựa trên ngữ cảnh (ví dụ: "Thứ Hai tuần tới" so với ngày hiện tại là ${new Date().toLocaleDateString('vi-VN')}).
            5. Nếu nội dung không phải là lịch làm việc, hãy trả về mảng rỗng [].
            6. Chỉ trả về JSON, không giải thích gì thêm.
            
            Nội dung lịch:
            ${fileContent}`
          }]
        }],
        config: {
          responseMimeType: "application/json"
        }
      });

      let result = [];
      try {
        const text = response?.text || "[]";
        // Remove markdown code blocks if present
        const cleanJson = text.replace(/```json\n?|```/g, "").trim();
        result = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("Gemini JSON parse error:", parseError);
        showToast?.("Lỗi khi xử lý dữ liệu từ AI. Vui lòng thử lại.", "error");
        return;
      }

      if (Array.isArray(result) && result.length > 0) {
        updateMeetings(prev => {
          // Ensure each new meeting has a unique ID and filter out duplicates based on content
          const processedNewMeetings = result.map((nm, idx) => ({
            ...nm,
            id: nm.id && !result.slice(0, idx).some(prevNm => prevNm.id === nm.id) 
                ? nm.id 
                : `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })).filter(nm => 
            !prev.some(pm => pm.name === nm.name && pm.date === nm.date && pm.time === nm.time)
          );
          
          const updatedMeetings = [...prev, ...processedNewMeetings];
          
          return updatedMeetings;
        });
        
        showToast?.(`Đã thêm ${result.length} lịch công tác từ file`, "success");
      } else {
        showToast?.("Không tìm thấy lịch công tác nào trong file", "info");
      }
    } catch (e) {
      console.error("Calendar parse error:", e);
      showToast?.("Lỗi khi phân tích nội dung lịch", "error");
    } finally {
      setIsParsingCalendar(false);
    }
  }, [isParsingCalendar, showToast, updateMeetings]);

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

  const syncGoogleDrive = useCallback(async (folderId: string) => {
    if (isSyncingDrive) return;
    setIsSyncingDrive(true);

    try {
      // 1. Check status
      const statusRes = await fetch('/api/drive/status');
      const status = await statusRes.json();

      if (!status.connected) {
        // 2. Get Auth URL
        const authUrlRes = await fetch('/api/auth/google/url');
        const { url } = await authUrlRes.json();

        // 3. Open Popup
        const authWindow = window.open(url, 'google_auth', 'width=600,height=600');
        
        if (!authWindow) {
          showToast?.("Vui lòng cho phép cửa sổ bật lên để kết nối Google Drive", "error");
          setIsSyncingDrive(false);
          return;
        }

        // 4. Wait for message
        await new Promise<void>((resolve, reject) => {
          const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
              window.removeEventListener('message', handleMessage);
              resolve();
            }
          };
          window.addEventListener('message', handleMessage);
          
          // Timeout after 2 minutes
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            reject(new Error("Hết thời gian chờ xác thực"));
          }, 120000);
        });
      }

      // 5. Sync
      showToast?.("Đang đồng bộ từ Google Drive...", "info");
      const syncRes = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      });

      if (!syncRes.ok) {
        const error = await syncRes.json();
        throw new Error(error.details || error.error || "Lỗi đồng bộ");
      }

      const syncData = await syncRes.json();
      if (syncData.success && syncData.data && syncData.data.length > 0) {
        showToast?.(`Đã tìm thấy ${syncData.data.length} tệp mới. Đang phân tích...`, "info");
        
        let totalMeetings = 0;
        for (const file of syncData.data) {
          if (file.content) {
            // We need to await each parse to avoid overwhelming Gemini if there are many files
            // or we could batch them, but one by one is safer for now.
            await parseCalendarFile(file.content);
            totalMeetings++;
          }
        }
        showToast?.(`Đã đồng bộ thành công ${totalMeetings} tệp từ Google Drive`, "success");
      } else {
        showToast?.("Không có tệp mới nào cần đồng bộ", "info");
      }
    } catch (error: any) {
      console.error("Google Drive sync error:", error);
      showToast?.(`Lỗi đồng bộ Google Drive: ${error.message}`, "error");
    } finally {
      setIsSyncingDrive(false);
    }
  }, [isSyncingDrive, parseCalendarFile, showToast]);

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
    isParsingCalendar: isParsingCalendar || isUploadingFile || isSavingMeetings || isSavingEvents || isSyncingDrive,
    fetchConfig,
    loadMeetings,
    loadEvents,
    loadBirthdays,
    updateMeetings,
    updateEvents,
    updateBirthdays,
    parseCalendarFile,
    uploadAndParseCalendar,
    syncGoogleDrive,
    isSyncingDrive,
    isBirthdaysLoading,
    smartBriefing,
    isGeneratingBriefing,
    generateSmartBriefing,
    syncBirthdaysFromKnowledge: async (knowledge: any[]) => {
      if (isBirthdaysLoading || knowledge.length === 0) return;
      try {
        const response = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: [{
            role: 'user',
            parts: [{
              text: `Dựa trên dữ liệu tri thức sau, hãy trích xuất danh sách sinh nhật của các cá nhân.
              Trả về kết quả dưới dạng mảng JSON các đối tượng có cấu trúc:
              { "name": string, "date": "DD/MM", "source": "agency" | "friends" }
              
              Lưu ý: 
              - Chỉ trích xuất nếu có tên và ngày tháng năm sinh rõ ràng.
              - Trả về ngày tháng theo định dạng DD/MM.
              - Phân loại nguồn (source) là "agency" (Cơ quan) hoặc "friends" (Bạn bè) dựa vào ngữ cảnh. Nếu không rõ, mặc định là "agency".
              - Chỉ trả về JSON, không giải thích gì thêm.
              
              Dữ liệu:
              ${knowledge.map(k => k.content).join('\n')}`
            }]
          }],
          config: {
            responseMimeType: "application/json"
          }
        });

        let result = [];
        try {
          const text = response?.text || "[]";
          const cleanJson = text.replace(/```json\n?|```/g, "").trim();
          result = JSON.parse(cleanJson);
        } catch (parseError) {
          console.error("Gemini JSON parse error:", parseError);
          showToast?.("Lỗi khi xử lý dữ liệu từ AI", "error");
          return;
        }

        if (Array.isArray(result) && result.length > 0) {
          updateBirthdays(prev => {
            const newBirthdays = result.map(nb => ({
              ...nb,
              id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              source: nb.source === 'friends' ? 'friends' : 'agency'
            })).filter(nb => 
              !prev.some(pb => pb.name === nb.name && pb.date === nb.date)
            );
            return [...prev, ...newBirthdays];
          });
          showToast?.(`Đã đồng bộ ${result.length} sinh nhật từ tri thức`, "success");
        } else {
          showToast?.("Không tìm thấy thông tin sinh nhật mới trong tri thức", "info");
        }
      } catch (e) {
        console.error("Birthday sync error:", e);
        showToast?.("Lỗi khi đồng bộ sinh nhật", "error");
      }
    }
  };
}
