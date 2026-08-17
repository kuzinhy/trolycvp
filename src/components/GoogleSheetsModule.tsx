import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  RefreshCw, 
  Plus, 
  Link2, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Loader2,
  FileText,
  Calendar,
  Sparkles,
  Database,
  Brain,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardContext } from '../context/DashboardContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import axios from 'axios';
import { generateContentWithRetry } from '../lib/ai-utils';

interface GoogleSheetsModuleProps {
  knowledge?: any[];
}

export const GoogleSheetsModule: React.FC<GoogleSheetsModuleProps> = ({ knowledge = [] }) => {
  const { googleDriveToken, signInWithGoogle, unitId } = useAuth();
  const { tasks, meetings } = useDashboardContext();

  // Excel / Spreadsheet configuration states
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('google_sheets_spreadsheet_id');
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('google_sheets_spreadsheet_url');
  });

  const [inputUrlOrId, setInputUrlOrId] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'all-in-one' | 'export' | 'import' | 'embed'>('all-in-one');
  
  // Action status states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Advanced sync progress state
  const [syncStep, setSyncStep] = useState<'preparing' | 'creating_sheets' | 'generating_ai' | 'clearing' | 'writing' | null>(null);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');

  // Auto-clear messages
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Connect Google account
  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle(true); // Requests sheets & drive access
    } catch (err: any) {
      console.error("Lỗi liên kết Google:", err);
      setErrorMessage("Liên kết Google tài khoản thất bại. Vui lòng kiểm tra quyền truy cập.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Extract Spreadsheet ID from URL or Raw String
  const extractSpreadsheetId = (urlOrId: string): string | null => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return null;
    
    // Check if it's a URL
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Check if it's a raw ID (typically 44 chars)
    if (trimmed.length >= 40 && !trimmed.includes('/')) {
      return trimmed;
    }
    
    return null;
  };

  // Link existing spreadsheet
  const handleLinkSpreadsheet = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const id = extractSpreadsheetId(inputUrlOrId);
    
    if (!id) {
      setErrorMessage("Địa chỉ liên kết hoặc Spreadsheet ID không hợp lệ. Vui lòng nhập đúng định dạng Google Sheets.");
      return;
    }

    const url = `https://docs.google.com/spreadsheets/d/${id}`;
    setSpreadsheetId(id);
    setSpreadsheetUrl(url);
    localStorage.setItem('google_sheets_spreadsheet_id', id);
    localStorage.setItem('google_sheets_spreadsheet_url', url);
    setInputUrlOrId('');
    setSuccessMessage("Đã liên kết thành công với bảng tính sẵn có!");
    setActiveSubTab('all-in-one');
  };

  // Unlink sheet
  const handleUnlink = () => {
    setSpreadsheetId(null);
    setSpreadsheetUrl(null);
    localStorage.removeItem('google_sheets_spreadsheet_id');
    localStorage.removeItem('google_sheets_spreadsheet_url');
    setSuccessMessage("Đã hủy liên kết bảng tính hiện tại.");
  };

  // Helper to ensure sheets exist and have exact titles
  const ensureSheetsExist = async (id: string, token: string): Promise<void> => {
    setSyncStep('preparing');
    setSyncProgressMsg('Đang kiểm tra và thẩm định các phân hệ trang tính...');
    
    const metaRes = await axios.get(
      `https://sheets.googleapis.com/v1/spreadsheets/${id}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const sheets = metaRes.data.sheets || [];
    const sheetTitles = sheets.map((s: any) => s.properties.title);
    const requests: any[] = [];

    // If default Sheet1 is present and "Tổng quan chỉ huy" isn't, rename Sheet1
    const hasSheet1 = sheetTitles.includes("Sheet1");
    const hasDashboard = sheetTitles.includes("Tổng quan chỉ huy");
    
    if (hasSheet1 && !hasDashboard) {
      const sheet1 = sheets.find((s: any) => s.properties.title === "Sheet1");
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet1.properties.sheetId,
            title: "Tổng quan chỉ huy"
          },
          fields: "title"
        }
      });
      sheetTitles.push("Tổng quan chỉ huy");
    }

    const requiredSheets = [
      "Tổng quan chỉ huy",
      "Danh sách Nhiệm vụ",
      "Lịch công tác",
      "Cơ sở Tri thức Đảng uỷ"
    ];

    for (const title of requiredSheets) {
      if (!sheetTitles.includes(title)) {
        requests.push({
          addSheet: {
            properties: { title }
          }
        });
      }
    }

    if (requests.length > 0) {
      setSyncStep('creating_sheets');
      setSyncProgressMsg('Đang khởi tạo các phân hệ trang tính bị thiếu trên Google Drive...');
      await axios.post(
        `https://sheets.googleapis.com/v1/spreadsheets/${id}:batchUpdate`,
        { requests },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  };

  // Generate AI Commander Executive Summary using Gemini
  const generateAIExecutiveSummary = async (): Promise<string> => {
    setSyncStep('generating_ai');
    setSyncProgressMsg('Trợ lý AI đang rà soát dữ liệu chỉ huy và lập bản tóm tắt...');
    
    try {
      const taskListStr = tasks.slice(0, 15).map((t, idx) => 
        `- ${idx+1}. ${t.title} [Trạng thái: ${t.status === 'Completed' ? 'Đã hoàn thành' : t.status === 'In Progress' ? 'Đang làm' : 'Chờ xử lý'}, Độ ưu tiên: ${t.priority === 'high' ? 'Cao' : 'Bình thường'}, Người nhận: ${t.assignee || 'Chưa rõ'}]`
      ).join('\n');
      
      const meetingListStr = meetings.slice(0, 10).map((m, idx) => 
        `- ${idx+1}. ${m.name} [Ngày: ${m.date || 'Chưa rõ'}, Giờ: ${m.time || 'Chưa rõ'}, Địa điểm: ${m.location || 'Văn phòng'}]`
      ).join('\n');
      
      const knowledgeListStr = (knowledge || []).slice(0, 8).map((k, idx) => 
        `- ${idx+1}. Tài liệu: ${k.title || 'Văn bản'} (${k.category || 'Chung'})`
      ).join('\n');

      const prompt = `
Bạn là Trợ lý AI chuyên trách của đồng chí Nguyễn Minh Huy - Chánh Văn phòng Đảng ủy.
Hãy viết một bản "Báo cáo Tóm tắt Điều hành & Kiến nghị Tri thức Chiến lược" (viết bằng tiếng Việt, văn phong Đảng, chính thống, cơ mật, súc tích).
Dựa trên thông tin hiện có:
- Tổng số nhiệm vụ đang chỉ đạo: ${tasks.length}
- Tổng số lịch họp sắp tới: ${meetings.length}
- Số lượng tài liệu Tri thức Đảng ủy liên thông: ${(knowledge || []).length}

**Danh sách Nhiệm vụ tiêu biểu:**
${taskListStr || 'Không có nhiệm vụ nổi bật'}

**Danh sách Lịch họp gần đây:**
${meetingListStr || 'Không có lịch họp'}

**Danh sách Tri thức liên thông:**
${knowledgeListStr || 'Không có tài liệu tri thức nào'}

**Yêu cầu báo cáo:**
1. Viết 3-4 câu tóm tắt tổng quan đánh giá tiến độ thực hiện nhiệm vụ văn phòng, chú ý tỷ lệ hoàn thành công việc.
2. Đưa ra chính xác 3 kiến nghị hành động thiết thực nhất đối với vai trò Chánh Văn phòng trong tuần tới (ví dụ: đôn đốc việc chậm muộn, chuẩn bị báo cáo, kết nối thêm tài liệu).
3. Xưng hô trang trọng gửi "Đồng chí Chánh Văn phòng" hoặc "Đồng chí Nguyễn Minh Huy", ký tên "Trợ lý Chỉ huy AI - Chỉ huy Chiến lược 8.0".
4. Không dùng định dạng markdown phức tạp, chỉ dùng các dòng chữ thuần, phân đoạn hoặc gạch đầu dòng rõ ràng để điền trực tiếp vào ô Excel dễ dàng.
`;

      const response = await generateContentWithRetry({
        contents: prompt,
        config: {
          systemInstruction: "Bạn là Trợ lý AI chuyên trách của Chánh Văn phòng Đảng ủy. Luôn viết văn phong trang trọng, súc tích và chuẩn xác chính trị."
        }
      });
      return response.text || "Chưa có báo cáo từ Trợ lý AI.";
    } catch (err) {
      console.error("Lỗi gọi Gemini sinh báo cáo:", err);
      return "Hệ thống không thể kết nối tới mô hình AI để lập báo cáo tổng hợp. Đồng bộ các số liệu thống kê cứng vẫn hoàn tất.";
    }
  };

  // Comprehensive Synchronisation (All in One)
  const handleSyncAll = async () => {
    if (!googleDriveToken || !spreadsheetId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Step 1: Ensure sheets exist
      await ensureSheetsExist(spreadsheetId, googleDriveToken);

      // Step 2: Generate AI Summary
      const aiSummary = await generateAIExecutiveSummary();

      // Step 3: Clear old values in all tabs to ensure fresh overwrite
      setSyncStep('clearing');
      setSyncProgressMsg('Đang làm sạch và đặt lại các vùng dữ liệu cũ...');
      await axios.post(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchClear`,
        {
          ranges: [
            "Tổng quan chỉ huy!A1:E100",
            "Danh sách Nhiệm vụ!A1:F2000",
            "Lịch công tác!A1:G1000",
            "Cơ sở Tri thức Đảng uỷ!A1:G1000"
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${googleDriveToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Step 4: Prepare Data Values
      setSyncStep('writing');
      setSyncProgressMsg('Đang truyền tải và sắp xếp cơ sở dữ liệu liên thông trực tuyến...');

      const timestamp = new Date().toLocaleString('vi-VN');
      
      const dashboardValues = [
        ["HỆ THỐNG CHỈ HUY CHIẾN LƯỢC VĂN PHÒNG ĐẢNG ỦY 8.0", "", "", ""],
        ["BẢN ĐỒ TRI THỨC VÀ BÁO CÁO ĐIỀU HÀNH LIÊN THÔNG", "", "", ""],
        [`Thời gian đồng bộ tự động: ${timestamp}`, "", "", ""],
        ["", "", "", ""],
        ["PHÂN HỆ", "SỐ LIỆU", "TỶ LỆ", "TRẠNG THÁI / GHI CHÚ"],
        ["Tổng số Nhiệm vụ Chỉ đạo", tasks.length, "100%", "Tổng chỉ tiêu Văn phòng"],
        ["Nhiệm vụ đã hoàn thành", tasks.filter(t => t.status === 'Completed').length, `${((tasks.filter(t => t.status === 'Completed').length / (tasks.length || 1)) * 100).toFixed(1)}%`, "Đã nghiệm thu và đóng"],
        ["Nhiệm vụ đang thực hiện", tasks.filter(t => t.status === 'In Progress').length, `${((tasks.filter(t => t.status === 'In Progress').length / (tasks.length || 1)) * 100).toFixed(1)}%`, "Đang bám sát tiến độ"],
        ["Nhiệm vụ chờ xử lý", tasks.filter(t => t.status === 'Pending').length, `${((tasks.filter(t => t.status === 'Pending').length / (tasks.length || 1)) * 100).toFixed(1)}%`, "Cần rà soát và đôn đốc"],
        ["Lịch công tác & Lịch họp tuần", meetings.length, "-", "Liên thông văn phòng chung"],
        ["Cơ sở tri thức liên kết (Đảng)", (knowledge || []).length, "-", "Chuẩn hóa Quản trị tri thức"],
        ["", "", "", ""],
        ["BẢN TÌNH HÌNH TỔNG QUAN VÀ KHUYẾN NGHỊ CỦA TRỢ LÝ AI", "", "", ""],
        [aiSummary, "", "", ""],
        ["", "", "", ""],
        ["NGƯỜI PHÊ DUYỆT BÁO CÁO", "", "", "TRỢ LÝ CHỈ HUY AI"],
        ["Nguyễn Minh Huy", "", "", "Hệ thống Chỉ huy 8.0"]
      ];

      const taskValues = [
        ["Mã nhiệm vụ (ID)", "Tiêu đề nhiệm vụ", "Hạn chót (YYYY-MM-DD)", "Độ ưu tiên", "Trạng thái", "Người thực hiện"],
        ...tasks.map(t => [
          t.id,
          t.title,
          t.deadline || 'Chưa rõ',
          t.priority === 'high' ? 'Cao' : t.priority === 'medium' ? 'Trung bình' : 'Thấp',
          t.status === 'Completed' ? 'Đã hoàn thành' : t.status === 'In Progress' ? 'Đang thực hiện' : t.status === 'Pending' ? 'Chờ xử lý' : t.status === 'On Hold' ? 'Tạm dừng' : 'Đang rà soát',
          t.assignee || 'Chưa phân công'
        ])
      ];

      const meetingValues = [
        ["Mã lịch họp (ID)", "Nội dung / Tên cuộc họp", "Ngày họp", "Giờ họp", "Địa điểm", "Người chủ trì", "Thành phần tham gia"],
        ...meetings.map(m => [
          m.id,
          m.name,
          m.date || 'Chưa có ngày',
          m.time || 'Chưa có giờ',
          m.location || 'Văn phòng',
          m.chairperson || 'Chưa rõ',
          m.participants || 'Tất cả thành viên'
        ])
      ];

      const knowledgeValues = [
        ["Mã tri thức (ID)", "Tiêu đề tài liệu / văn bản", "Tóm tắt nội dung chính", "Phân loại lĩnh vực", "Từ khóa liên kết", "Ngày cập nhật"],
        ...(knowledge || []).map(k => [
          k.id || `kn_${Math.random().toString(36).substring(2, 6)}`,
          k.title || 'Văn bản Đảng ủy',
          k.content?.substring(0, 1000) || '',
          k.category || 'Quản trị Tri thức',
          Array.isArray(k.tags) ? k.tags.join(', ') : k.tags || 'Liên kết số 8.0',
          timestamp
        ])
      ];

      // Write everything in a single batchUpdate values call!
      await axios.post(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: "Tổng quan chỉ huy!A1:D17",
              values: dashboardValues
            },
            {
              range: `Danh sách Nhiệm vụ!A1:F${taskValues.length}`,
              values: taskValues
            },
            {
              range: `Lịch công tác!A1:G${meetingValues.length}`,
              values: meetingValues
            },
            {
              range: `Cơ sở Tri thức Đảng uỷ!A1:F${knowledgeValues.length}`,
              values: knowledgeValues
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${googleDriveToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccessMessage("Đồng bộ liên thông TOÀN DIỆN thành công! Đã cập nhật Báo cáo Chỉ huy AI, Danh sách nhiệm vụ, Lịch công tác và Bản đồ Tri thức Đảng uỷ lên Google Sheets liên kết.");
    } catch (err: any) {
      console.error("Lỗi đồng bộ toàn diện:", err);
      setErrorMessage("Đã xảy ra lỗi trong quá trình đồng bộ toàn diện. Vui lòng rà soát lại quyền truy cập hoặc cấu hình trang tính.");
    } finally {
      setIsLoading(false);
      setSyncStep(null);
    }
  };

  // Create pre-formatted spreadsheet for Party office
  const handleCreateSpreadsheet = async () => {
    if (!googleDriveToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Create Spreadsheet with metadata
      const createRes = await axios.post(
        'https://sheets.googleapis.com/v1/spreadsheets',
        {
          properties: {
            title: "Hệ thống Chỉ huy 8.0 - Quản lý Nhiệm vụ & Lịch công tác"
          }
        },
        {
          headers: {
            Authorization: `Bearer ${googleDriveToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const newId = createRes.data.spreadsheetId;
      const newUrl = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newId}`;

      // Save states
      setSpreadsheetId(newId);
      setSpreadsheetUrl(newUrl);
      localStorage.setItem('google_sheets_spreadsheet_id', newId);
      localStorage.setItem('google_sheets_spreadsheet_url', newUrl);

      // Check and build sheets structure
      await ensureSheetsExist(newId, googleDriveToken);
      
      setSuccessMessage("Đã khởi tạo thành công Bảng tính Lịch công tác & Nhiệm vụ chuẩn hóa trên Google Drive!");
      setActiveSubTab('all-in-one');
    } catch (err: any) {
      console.error("Lỗi khởi tạo bảng tính:", err);
      if (err.response?.status === 401) {
        setErrorMessage("Phiên liên kết Google đã hết hạn. Vui lòng kết nối lại tài khoản.");
      } else {
        setErrorMessage("Không thể tạo bảng tính mới. Đảm bảo tài khoản đã kích hoạt dịch vụ Google Drive & Sheets.");
      }
    } finally {
      setIsLoading(false);
      setSyncStep(null);
    }
  };

  // Export Tasks to Sheets (Overwrite data from row 2 onwards)
  const handleExportTasks = async () => {
    if (!googleDriveToken || !spreadsheetId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Verify sheet exists
      await ensureSheetsExist(spreadsheetId, googleDriveToken);

      setSyncStep('clearing');
      await axios.post(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Danh sách Nhiệm vụ!A2:F2000:clear`,
        {},
        {
          headers: {
            Authorization: `Bearer ${googleDriveToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSyncStep('writing');
      const rows = tasks.map(t => [
        t.id,
        t.title,
        t.deadline || 'Chưa rõ',
        t.priority === 'high' ? 'Cao' : t.priority === 'medium' ? 'Trung bình' : 'Thấp',
        t.status === 'Completed' ? 'Đã hoàn thành' : t.status === 'In Progress' ? 'Đang thực hiện' : t.status === 'Pending' ? 'Chờ xử lý' : t.status === 'On Hold' ? 'Tạm dừng' : 'Đang rà soát',
        t.assignee || 'Chưa phân công'
      ]);

      if (rows.length > 0) {
        await axios.put(
          `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Danh sách Nhiệm vụ!A2:F${rows.length + 1}?valueInputOption=USER_ENTERED`,
          { values: rows },
          {
            headers: {
              Authorization: `Bearer ${googleDriveToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      setSuccessMessage(`Đã xuất riêng lẻ ${rows.length} nhiệm vụ sang Google Sheets!`);
    } catch (err: any) {
      console.error("Lỗi xuất nhiệm vụ:", err);
      setErrorMessage("Lỗi trong quá trình xuất dữ liệu. Vui lòng kiểm tra quyền ghi của bảng tính.");
    } finally {
      setIsLoading(false);
      setSyncStep(null);
    }
  };

  // Export Meetings (Schedule) to Sheets
  const handleExportMeetings = async () => {
    if (!googleDriveToken || !spreadsheetId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await ensureSheetsExist(spreadsheetId, googleDriveToken);

      setSyncStep('clearing');
      await axios.post(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Lịch công tác!A2:G1000:clear`,
        {},
        {
          headers: {
            Authorization: `Bearer ${googleDriveToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSyncStep('writing');
      const rows = meetings.map(m => [
        m.id,
        m.name,
        m.date || 'Chưa rõ',
        m.time || 'Chưa rõ',
        m.location || 'Văn phòng',
        m.chairperson || 'Chưa rõ',
        m.participants || 'Tất cả thành viên'
      ]);

      if (rows.length > 0) {
        await axios.put(
          `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Lịch công tác!A2:G${rows.length + 1}?valueInputOption=USER_ENTERED`,
          { values: rows },
          {
            headers: {
              Authorization: `Bearer ${googleDriveToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      setSuccessMessage(`Đã xuất riêng lẻ ${rows.length} lịch họp sang Google Sheets!`);
    } catch (err: any) {
      console.error("Lỗi xuất lịch họp:", err);
      setErrorMessage("Không thể xuất lịch họp. Hãy đảm bảo sheet 'Lịch công tác' tồn tại và được định dạng đúng.");
    } finally {
      setIsLoading(false);
      setSyncStep(null);
    }
  };

  // Import Tasks from Sheets
  const handleImportTasks = async () => {
    if (!googleDriveToken || !spreadsheetId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await axios.get(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Danh sách Nhiệm vụ!A2:F1000`,
        {
          headers: { Authorization: `Bearer ${googleDriveToken}` }
        }
      );

      const rows = res.data.values || [];
      if (rows.length === 0) {
        setErrorMessage("Bảng tính nhiệm vụ rỗng hoặc chưa có dữ liệu từ dòng 2.");
        setIsLoading(false);
        return;
      }

      let importedCount = 0;
      const targetUnitId = unitId || 'vp-dang-uy';

      for (const row of rows) {
        const [id, title, deadline, priorityStr, statusStr, assignee] = row;
        
        if (!title) continue;

        const priority = priorityStr === 'Cao' ? 'high' : priorityStr === 'Thấp' ? 'low' : 'medium';
        const status = statusStr === 'Đã hoàn thành' ? 'Completed' : 
                       statusStr === 'Đang thực hiện' ? 'In Progress' : 
                       statusStr === 'Tạm dừng' ? 'On Hold' : 
                       statusStr === 'Đang rà soát' ? 'In Review' : 'Pending';

        const finalId = id && id.trim() !== '' ? id : `task_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        
        const taskDocRef = doc(db, 'tasks', finalId);
        await setDoc(taskDocRef, {
          id: finalId,
          title: title.trim(),
          deadline: deadline || new Date().toISOString().split('T')[0],
          priority,
          status,
          assignee: assignee || '',
          unitId: targetUnitId,
          createdAt: Date.now()
        }, { merge: true });

        importedCount++;
      }

      setSuccessMessage(`Nhập thành công ${importedCount} nhiệm vụ từ Google Sheets vào Hệ thống Chỉ huy! Dữ liệu đã được liên kết thông suốt.`);
    } catch (err: any) {
      console.error("Lỗi nhập dữ liệu nhiệm vụ:", err);
      setErrorMessage("Đã xảy ra lỗi khi nạp dữ liệu nhiệm vụ từ Google Sheets. Đảm bảo tên trang tính là 'Danh sách Nhiệm vụ'.");
    } finally {
      setIsLoading(false);
    }
  };

  // Import Meetings from Sheets
  const handleImportMeetings = async () => {
    if (!googleDriveToken || !spreadsheetId) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await axios.get(
        `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Lịch công tác!A2:G1000`,
        {
          headers: { Authorization: `Bearer ${googleDriveToken}` }
        }
      );

      const rows = res.data.values || [];
      if (rows.length === 0) {
        setErrorMessage("Bảng tính lịch công tác rỗng hoặc chưa có dữ liệu từ dòng 2.");
        setIsLoading(false);
        return;
      }

      let importedCount = 0;
      const targetUnitId = unitId || 'vp-dang-uy';

      for (const row of rows) {
        const [id, name, date, time, location, chairperson, participants] = row;
        
        if (!name) continue;

        const finalId = id && id.trim() !== '' ? id : `meet_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        
        const meetingDocRef = doc(db, 'meetings', finalId);
        await setDoc(meetingDocRef, {
          id: finalId,
          name: name.trim(),
          date: date || new Date().toISOString().split('T')[0],
          time: time || '08:00',
          location: location || 'Văn phòng',
          chairperson: chairperson || '',
          participants: participants || '',
          unitId: targetUnitId,
          createdAt: Date.now()
        }, { merge: true });

        importedCount++;
      }

      setSuccessMessage(`Nhập thành công ${importedCount} lịch họp từ Google Sheets vào Lịch công tác liên thông!`);
    } catch (err: any) {
      console.error("Lỗi nhập lịch họp:", err);
      setErrorMessage("Đã xảy ra lỗi khi nạp lịch họp từ Google Sheets. Đảm bảo tên trang tính là 'Lịch công tác'.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
      {/* Module Title Section */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
            <FileSpreadsheet size={26} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight uppercase">LIÊN THÔNG GOOGLE SHEETS LIÊN NGÀNH</h2>
            <p className="text-xs text-emerald-200/80 font-medium">Bản đồ tri thức • Báo cáo điều hành AI • Chỉ huy 8.0</p>
          </div>
        </div>

        {googleDriveToken && (
          <div className="bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kết nối chỉ huy thông suốt</span>
          </div>
        )}
      </div>

      {!googleDriveToken ? (
        // Auth Landing Screen
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto my-12">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <FileSpreadsheet size={40} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2 uppercase">KẾT NỐI DỮ LIỆU GOOGLE WORKSPACE</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            Chào đồng chí <strong>Nguyễn Minh Huy</strong>. Tính năng nâng cấp này cho phép đồng bộ liên thông toàn diện báo cáo điều hành, chỉ tiêu công tác và bản đồ tri thức Đảng ủy trực tiếp từ Hệ thống 8.0 lên Google Sheets để chia sẻ liên thông nội bộ cơ quan.
          </p>

          <button
            onClick={handleConnectGoogle}
            disabled={isConnecting}
            className="w-full max-w-sm py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 border border-emerald-500/10"
          >
            {isConnecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>ĐANG THIẾT LẬP LIÊN KẾT...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>LIÊN KẾT TÀI KHOẢN GOOGLE</span>
              </>
            )}
          </button>
        </div>
      ) : (
        // Active Workspace State
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Setup Spreadsheet Area */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-6 items-center justify-between">
            {!spreadsheetId ? (
              <div className="flex-1 w-full space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <p className="text-sm font-bold text-slate-700">Chưa thiết lập bảng tính đồng bộ dữ liệu.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Create New Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between items-start gap-4 hover:border-emerald-500 transition-colors">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Phương án 1</h4>
                      <h5 className="text-sm font-bold text-slate-800">Tạo bảng tính chuẩn hóa mới</h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">Hệ thống tự động dựng bảng tính chuẩn hóa gồm các cột quy định cho Nhiệm vụ, Lịch họp và Tri thức liên kết trên Drive.</p>
                    </div>
                    <button
                      onClick={handleCreateSpreadsheet}
                      disabled={isLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-600/10"
                    >
                      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                      <span>Khởi tạo bảng tính mới</span>
                    </button>
                  </div>

                  {/* Connect Existing Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between gap-4 hover:border-blue-500 transition-colors">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Phương án 2</h4>
                      <h5 className="text-sm font-bold text-slate-800">Liên kết bảng tính hiện có</h5>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">Dán địa chỉ (Link) hoặc ID bảng tính Google Sheets của bạn để nâng cấp cấu trúc liên thông tự động.</p>
                    </div>
                    <div className="flex gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Nhập link bảng tính Google Sheets..."
                        value={inputUrlOrId}
                        onChange={(e) => setInputUrlOrId(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                      />
                      <button
                        onClick={handleLinkSpreadsheet}
                        className="p-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                        title="Liên kết"
                      >
                        <Link2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Connected sheet overview
              <div className="flex-1 w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Mạng lưới dữ liệu trực tuyến</h4>
                    <p className="text-sm font-bold text-slate-800 truncate max-w-md">Bản đồ điều hành & Quản trị tri thức liên thông</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono select-all">{spreadsheetId}</span>
                      <a 
                        href={spreadsheetUrl || '#'} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                      >
                        <span>Mở trong tab mới</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleUnlink}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
                  >
                    Hủy liên kết
                  </button>
                  <button
                    onClick={handleSyncAll}
                    disabled={isLoading}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/10"
                    title="Đồng bộ toàn diện tất cả các bảng dữ liệu"
                  >
                    <RefreshCw size={13} className={cn(isLoading && "animate-spin")} />
                    <span>Đồng bộ toàn diện</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Progress Overlay during Advanced Sync */}
          <AnimatePresence>
            {syncStep && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-6 mt-4 p-5 bg-gradient-to-r from-emerald-950 to-teal-950 text-white rounded-2xl flex items-center gap-4 shadow-xl border border-emerald-500/20"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                  <Loader2 size={18} className="animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black tracking-widest uppercase text-emerald-400">TIẾN TRÌNH LIÊN THÔNG ĐANG CHẠY</p>
                  <p className="text-sm font-medium truncate text-white/90 mt-0.5">{syncProgressMsg}</p>
                </div>
                <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono py-1 px-2.5 rounded-full">
                  {syncStep === 'preparing' && 'PHÂN TÍCH'}
                  {syncStep === 'creating_sheets' && 'DỰNG SHEETS'}
                  {syncStep === 'generating_ai' && 'AI GENERATION'}
                  {syncStep === 'clearing' && 'DỌN DẸP'}
                  {syncStep === 'writing' && 'GHI DỮ LIỆU'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success / Error Toast Alerts */}
          <AnimatePresence>
            {successMessage && !syncStep && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs shadow-sm"
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Đồng bộ hoàn tất!</p>
                  <p className="mt-0.5 leading-relaxed">{successMessage}</p>
                </div>
              </motion.div>
            )}

            {errorMessage && !syncStep && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3 text-xs shadow-sm"
              >
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Lỗi thao tác</p>
                  <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {spreadsheetId && (
            <div className="flex-1 flex flex-col p-6 min-h-[500px]">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 pb-3 mb-6 gap-2 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveSubTab('all-in-one')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                    activeSubTab === 'all-in-one'
                      ? "bg-emerald-50 text-emerald-950 shadow-sm border border-emerald-100"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Zap size={14} className="text-emerald-600" />
                  <span>Đồng bộ Toàn diện (All-in-One)</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('export')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                    activeSubTab === 'export'
                      ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Download size={14} />
                  <span>Xuất Phân hệ Riêng lẻ (Export)</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('import')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                    activeSubTab === 'import'
                      ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Upload size={14} />
                  <span>Kéo dữ liệu về (Import)</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('embed')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                    activeSubTab === 'embed'
                      ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <ExternalLink size={14} />
                  <span>Xem trực tiếp Google Sheets</span>
                </button>
              </div>

              {/* Dynamic Content Views */}
              <div className="flex-1 flex flex-col">
                {activeSubTab === 'all-in-one' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                          <Sparkles size={16} className="text-amber-500" />
                          <span>Tính năng siêu liên thông tự động</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                          Chỉ với 1 chạm, hệ thống tự động thẩm định và định dạng 4 trang tính chuẩn trên Google Sheets, nạp số liệu thống kê thời gian thực, gọi mô hình AI thông minh biên soạn briefing tóm tắt báo cáo điều hành gửi riêng đồng chí Chánh Văn phòng, đồng thời xuất kết nối Bản đồ Tri thức Đảng ủy liên ngành.
                        </p>
                      </div>

                      <button
                        onClick={handleSyncAll}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-700/10 hover:shadow-emerald-700/20 transition-all flex items-center gap-2 shrink-0 border border-emerald-500/10"
                      >
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                        <span>KÍCH HOẠT ĐỒNG BỘ TOÀN DIỆN</span>
                      </button>
                    </div>

                    {/* Matrix of Synced Sheets Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Dashboard Sheet Info */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                            <Brain size={18} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Sheet 1</h5>
                            <h6 className="text-xs font-bold text-slate-800">Tổng quan chỉ huy</h6>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            KPI thống kê tiến trình điều hành tự động và Bản tin tóm tắt điều hành từ Trợ lý AI.
                          </p>
                        </div>
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold py-1 px-2.5 rounded-full self-start">Tự động sinh AI</span>
                      </div>

                      {/* Tasks Sheet Info */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Sheet 2</h5>
                            <h6 className="text-xs font-bold text-slate-800">Danh sách Nhiệm vụ</h6>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Đồng bộ thời gian thực toàn bộ {tasks.length} đầu việc, phân công trách nhiệm và hạn hoàn thành.
                          </p>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold py-1 px-2.5 rounded-full self-start">Liên thông Firestore</span>
                      </div>

                      {/* Meetings Sheet Info */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Sheet 3</h5>
                            <h6 className="text-xs font-bold text-slate-800">Lịch công tác</h6>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Đồng bộ liên kết {meetings.length} lịch họp chỉ đạo văn phòng Đảng uỷ, nội dung họp, địa điểm.
                          </p>
                        </div>
                        <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold py-1 px-2.5 rounded-full self-start">Lịch công tác liên thông</span>
                      </div>

                      {/* Knowledge Sheet Info */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                            <Database size={18} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider">Sheet 4</h5>
                            <h6 className="text-xs font-bold text-slate-800">Cơ sở Tri thức Đảng uỷ</h6>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Cơ sở tri thức liên thông chứa {knowledge.length} tài liệu lý luận, hướng dẫn, văn kiện chỉ đạo đã lưu.
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold py-1 px-2.5 rounded-full self-start">Mạng lưới tri thức</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'export' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50">
                      <h4 className="text-sm font-bold text-slate-800 mb-2">Đẩy dữ liệu hệ thống lên Google Sheets</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Tải và ghi đè dữ liệu cục bộ từ Firestore lên Google Sheets. Mỗi trang tính tương ứng (Danh sách Nhiệm vụ / Lịch công tác) sẽ được làm sạch dữ liệu cũ trước khi nạp dữ liệu chuẩn mới nhất.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Export Tasks Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-800">Đồng bộ Nhiệm vụ</h5>
                            <p className="text-xs text-slate-400 mt-1">Gửi toàn bộ {tasks.length} nhiệm vụ đang được giao và xử lý lên Sheet "Danh sách Nhiệm vụ".</p>
                          </div>
                        </div>
                        <button
                          onClick={handleExportTasks}
                          disabled={isLoading || tasks.length === 0}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          <span>Xuất danh sách Nhiệm vụ</span>
                        </button>
                      </div>

                      {/* Export Meetings Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-800">Đồng bộ Lịch công tác</h5>
                            <p className="text-xs text-slate-400 mt-1">Xuất toàn bộ {meetings.length} buổi họp, lịch chỉ đạo văn phòng lên Sheet "Lịch công tác".</p>
                          </div>
                        </div>
                        <button
                          onClick={handleExportMeetings}
                          disabled={isLoading || meetings.length === 0}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/10 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          <span>Xuất Lịch công tác</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'import' && (
                  <div className="space-y-6">
                    <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/50 flex gap-3">
                      <Info className="text-amber-800 shrink-0 mt-0.5" size={16} />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Đọc và cập nhật dữ liệu từ Google Sheets về Hệ thống</h4>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          Chức năng này giúp đồng chí Huy nạp nhanh các nhiệm vụ hoặc lịch họp được soạn thảo trực tuyến trên Google Sheets của các đơn vị trực thuộc về Cơ sở dữ liệu nội bộ. Các bản ghi trùng mã ID sẽ được gộp (merge) và cập nhật, các bản ghi mới sẽ được bổ sung tự động.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Import Tasks Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-800">Nhập Nhiệm vụ</h5>
                            <p className="text-xs text-slate-400 mt-1">Đọc dữ liệu từ trang tính "Danh sách Nhiệm vụ" và đồng bộ về hệ thống nội bộ của Văn phòng.</p>
                          </div>
                        </div>
                        <button
                          onClick={handleImportTasks}
                          disabled={isLoading}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                          <span>Đọc dữ liệu Nhiệm vụ</span>
                        </button>
                      </div>

                      {/* Import Meetings Card */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-800">Nhập Lịch công tác</h5>
                            <p className="text-xs text-slate-400 mt-1">Đọc dữ liệu từ trang tính "Lịch công tác" để cập nhật vào cơ sở dữ liệu Lịch họp chung.</p>
                          </div>
                        </div>
                        <button
                          onClick={handleImportMeetings}
                          disabled={isLoading}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                          <span>Đọc dữ liệu Lịch họp</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'embed' && (
                  <div className="flex-1 flex flex-col min-h-[500px] border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner bg-slate-100">
                    <iframe
                      src={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?widget=true&headers=false`}
                      title="Google Spreadsheet Viewer"
                      className="w-full flex-1 border-none min-h-[500px]"
                    />
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur border border-slate-200 rounded-xl py-1.5 px-3 flex items-center gap-2 text-[11px] font-medium text-slate-700 shadow-sm">
                      <Sparkles size={12} className="text-amber-500 animate-pulse" />
                      <span>Đang nhúng chế độ chỉnh sửa trực tuyến chuẩn Chỉ huy 8.0</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
