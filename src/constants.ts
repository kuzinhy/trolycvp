/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const APP_VERSION = "5.0.0-Strategic-Command";

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  groundingMetadata?: any;
  title?: string;
}

export const STAFF_LIST = [
  'Nguyễn Minh Huy',
  'Nguyễn Thu Cúc',
  'Phạm Văn Nồng',
  'Trần Phong Lưu',
  'Lê Hoàng Minh',
  'Lê Thị Minh Tâm',
  'Phạm Hùng Sơn',
  'Trần Đông Thành',
  'Võ Thị Lý',
  'Võ Hoàn Vũ',
  'Trần Thành Trung',
  'Lê Đình Hiếu',
  'Nguyễn Thị Thu Phương',
  'Lê Thị Kiều Oanh - Phó VP 1',
  'Trần Quốc Bảo - Phó VP 2'
];

export interface Birthday {
  id: string;
  name: string;
  date: string; // Format: DD/MM/YYYY or DD/MM
  source?: 'agency' | 'friends';
  reminderType?: 'minutes' | 'hours' | 'days' | 'none';
  reminderValue?: number;
}

export interface Event {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string; // Added location
  type: 'meeting' | 'anniversary' | 'holiday' | 'other' | 'founding_day_industry' | 'founding_day_party' | 'founding_day_mttq' | 'founding_day_union' | 'founding_day_party_building';
  reminderDays?: number;
  reminderMinutes?: number;
  reminderType?: 'minutes' | 'hours' | 'days' | 'none';
  reminderValue?: number;
}

export interface Meeting {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  reminderMinutes?: number;
  reminderType?: 'minutes' | 'hours' | 'days' | 'none';
  reminderValue?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string; // Format: YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  status: 'Pending' | 'In Progress' | 'Completed';
  category?: string;
  estimatedTime?: string; // e.g., "2 giờ"
  aiSuggestion?: string;
  assignee?: string;
  subTasks?: { title: string; description: string; status?: 'Pending' | 'Completed' }[];
  createdAt: number;
  completedAt?: number;
  isSystem?: boolean;
  isImportant?: boolean;
  reminderType?: 'minutes' | 'hours' | 'days' | 'none';
  reminderValue?: number;
}

export interface TaskType {
  id: string;
  label: string;
  icon: string;
  description: string;
  promptPrefix: string;
}

export const TASK_TYPES: TaskType[] = [
  {
    id: 'draft',
    label: 'Soạn thảo văn bản',
    icon: 'FileText',
    description: 'Báo cáo, kế hoạch, tờ trình, nghị quyết...',
    promptPrefix: 'Hãy giúp tôi soạn thảo văn bản sau: '
  },
  {
    id: 'upgrade',
    label: 'Nâng cấp văn phong',
    icon: 'Sparkles',
    description: 'Chỉnh sửa câu chữ trang trọng, chặt chẽ hơn.',
    promptPrefix: 'Hãy nâng cấp văn phong cho đoạn văn sau để chuyên nghiệp và trang trọng hơn: '
  },
  {
    id: 'advise',
    label: 'Tham mưu chỉ đạo',
    icon: 'MessageSquare',
    description: 'Gợi ý nội dung chỉ đạo, giải pháp thực hiện.',
    promptPrefix: 'Hãy tham mưu cho tôi nội dung chỉ đạo về vấn đề sau: '
  },
  {
    id: 'plan',
    label: 'Lập kế hoạch',
    icon: 'Calendar',
    description: 'Kế hoạch công tác tuần, tháng, nhiệm vụ trọng tâm.',
    promptPrefix: 'Hãy giúp tôi lập kế hoạch cho nội dung sau (chia rõ Mục tiêu – Nội dung – Tổ chức thực hiện): '
  },
  {
    id: 'conference',
    label: 'Tổ chức hội nghị',
    icon: 'Users',
    description: 'Chương trình, kịch bản, bài phát biểu.',
    promptPrefix: 'Hãy giúp tôi chuẩn bị nội dung cho hội nghị sau: '
  },
  {
    id: 'reminder',
    label: 'Nhắc lịch thông minh',
    icon: 'Bell',
    description: 'Tự động trích xuất lịch họp và nhắc việc.',
    promptPrefix: 'Hãy trích xuất các mốc thời gian và nhiệm vụ cần thực hiện từ nội dung sau để lập lịch nhắc việc: '
  }
];

export const SPECIALIZED_TASKS: TaskType[] = [];

export interface TrackingItem {
  id: number;
  content: string;
  source: string;
  authority: string;
  status: 'completed' | 'in_progress' | 'pending';
  result: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: 'chat' | 'dashboard' | 'knowledge' | 'tracking' | 'calendar' | 'tasks' | 'team_chat';
  eventId?: string;
}

export const MOCK_TRACKING_DATA: TrackingItem[] = [
  {
    id: 1,
    content: 'HĐND phường: Chủ trì phối hợp với các đơn vị liên quan, chuẩn bị đầy đủ nội dung thông qua kỳ họp thứ nhất và chỉ đạo thực hiện các bước theo đúng quy định.',
    source: 'Thông báo số 01-TB/ĐU ngày 01/7/2025',
    authority: 'Ban Thường vụ Đảng ủy',
    status: 'completed',
    result: 'Đã thực hiện'
  },
  {
    id: 2,
    content: 'Ban Xây dựng Đảng phường: Khẩn trương tham mưu các quyết định thành lập cơ quan, đơn vị và bổ nhiệm nhân sự đảm bảo đúng quy định.',
    source: 'Thông báo số 02-TB/ĐU ngày 01/7/2025',
    authority: 'Ban Thường vụ Đảng ủy',
    status: 'completed',
    result: 'Đã thực hiện'
  },
  {
    id: 3,
    content: 'UBND phường: Khẩn trương tham mưu các quyết định bổ nhiệm nhân sự (Văn phòng HĐND-UBND, các Phòng, Trung tâm Phục vụ hành chính công) đảm bảo đúng quy định.',
    source: 'Thông báo số 03-TB/ĐU ngày 01/7/2025',
    authority: 'Ban Thường vụ Đảng ủy',
    status: 'completed',
    result: 'Đã thực hiện'
  },
  {
    id: 11,
    content: 'Văn phòng Đảng ủy: Tiếp nhận tài liệu, văn bản từ các địa phương cũ; Tiến hành số hóa hồ sơ; Tập huấn các thành phần liên quan; Phối hợp UBND phường triển khai Cổng thông tin điện tử phường.',
    source: 'Thông báo số 08-TB/ĐU ngày 07/7/2025',
    authority: 'Thường trực Đảng ủy',
    status: 'in_progress',
    result: 'Đang thực hiện'
  },
  {
    id: 37,
    content: 'Ban Quản trị Fanpage: Chủ động phối hợp bộ phận chuyên môn tham mưu điều kiện đăng ký xác minh tích xanh cho Fanpage "Đất Thủ quê hương tôi".',
    source: 'Thông báo số 18-TB/ĐU ngày 24/7/2025',
    authority: 'Ban Thường vụ Đảng ủy',
    status: 'in_progress',
    result: 'Đang thực hiện'
  },
  {
    id: 89,
    content: 'Đảng ủy UBND phường: Tiếp tục nghiên cứu khai thác và nâng cấp sử dụng lại trung tâm điều hành thông minh của phường',
    source: 'Thông báo số 44-TB/ĐU ngày 09/9/2025',
    authority: 'Ban Thường vụ Đảng ủy',
    status: 'in_progress',
    result: 'Đang thực hiện'
  }
];

export const SYSTEM_INSTRUCTION = `Bạn là "Hệ thống Tham mưu Số - Trợ lý Chánh Văn phòng Đảng ủy AI", một trợ lý thông minh thế hệ mới dành cho cấp ủy, được thiết kế theo mô hình quản trị tri thức khoa học.

Người dùng hiện tại: Nguyễn Minh Huy - Chánh Văn Phòng Đảng uỷ. Hãy xưng hô phù hợp (Đồng chí/Anh Huy) và luôn ghi nhớ vai trò của người dùng trong mọi câu trả lời.

VAI TRÒ CHIẾN LƯỢC:
1. Quản trị Tri thức Khoa học: Lưu trữ, phân loại và truy xuất tri thức theo cấu trúc hình cây, đa tầng. Đảm bảo tính chính xác, tính cập nhật và tính hệ thống của dữ liệu.
2. Tham mưu & Dự báo: Phân tích các văn bản, nghị quyết để đưa ra các đề xuất tham mưu sắc bén, dự báo các tình huống phát sinh trong công tác Đảng.
3. Huấn luyện Cá nhân hóa: Ghi nhớ phong cách, thói quen và các lỗi thường gặp của người dùng để hỗ trợ hoàn thiện năng lực chuyên môn.

NHIỆM VỤ QUẢN TRỊ TRI THỨC NÂNG CAO:
1. Phân loại Khoa học: Mọi thông tin nạp vào phải được phân loại vào các danh mục chuẩn: "Quy định - Hướng dẫn", "Nghị quyết - Chỉ thị", "Nhân sự - Tổ chức", "Kiểm tra - Giám sát", "Dân vận - Tuyên giáo", "Văn phòng - Hành chính".
2. Tóm tắt Cốt lõi (Executive Summary): Mỗi mục tri thức phải có phần tóm tắt ngắn gọn nhưng đầy đủ tinh thần cốt lõi để hỗ trợ tra cứu nhanh.
3. Liên kết Tri thức: Khi trả lời, hãy kết nối các văn bản liên quan (ví dụ: Nghị quyết này thực hiện theo Hướng dẫn nào).
4. Kiểm soát Cập nhật: Chủ động nhắc nhở các mục kiến thức đã cũ hoặc cần bổ sung dựa trên danh sách "Kiến thức cần cập nhật".

PHONG CÁCH SOẠN THẢO VĂN BẢN ĐẢNG:
- Tính Đảng & Tính Khoa học: Văn phong trang trọng, chặt chẽ, đúng thuật ngữ chuyên môn của Đảng.
- Cấu trúc Thông báo Kết luận: Phân chia rõ ràng "Nội dung - Trách nhiệm - Thời hạn".
  Ví dụ: "[Tên đơn vị]: [Nội dung chỉ đạo cụ thể]. Hoàn thành trước ngày [dd/mm/yyyy]."
- Đối chiếu Lỗi thường gặp: Trước khi hoàn tất văn bản, hãy đối chiếu với danh sách lỗi cá nhân của Anh Huy để đảm bảo không lặp lại sai sót cũ.

NGUYÊN TẮC TRẢ LỜI:
- Trực quan: Sử dụng Markdown, bảng biểu, sơ đồ tư duy (dạng text) để trình bày các vấn đề phức tạp.
- Dẫn dẫn: Luôn trích dẫn nguồn (Nghị quyết số..., Quy định số...) từ kho tri thức khi đưa ra ý kiến tham mưu.
- Bảo mật: Tuân thủ các quy định về bảo mật thông tin trong công tác Đảng.

KHO KIẾN THỨC THỨ 2 (SECOND BRAIN):
- Bạn có một kho kiến thức bổ sung được đồng bộ từ Google Drive (thông qua Apps Script).
- Khi người dùng cần thông tin chuyên sâu hoặc tài liệu mới nhất, hãy nhắc họ nhấn nút "Đồng bộ ngay" trong mục "Kho kiến thức thứ 2" tại Knowledge Core.
- LƯU Ý QUAN TRỌNG: Khi người dùng yêu cầu "lưu thông tin" hoặc "ghi nhớ nội dung này", bạn KHÔNG THỂ tự lưu trực tiếp. Hãy hướng dẫn người dùng nhấn vào biểu tượng "Lưu vào kiến thức" (hình cơ sở dữ liệu/Database) nằm ngay dưới câu trả lời của bạn để lưu thông tin đó vào kho tri thức.`;

export interface KnowledgeItem {
  name: string;
  updatedAt: string;
  demoUrl?: string;
}

export const WEB_SOURCES = [
  { id: 'dangcongsan', label: 'Báo điện tử Đảng Cộng sản Việt Nam', url: 'https://dangcongsan.vn', category: 'Chính thống' },
  { id: 'tapchicongsan', label: 'Tạp chí Cộng sản', url: 'https://tapchicongsan.org.vn', category: 'Chính thống' },
  { id: 'tuyengiao', label: 'Tạp chí Tuyên giáo', url: 'https://tuyengiao.vn', category: 'Chính thống' },
  { id: 'btctw', label: 'Ban Tổ chức Trung ương', url: 'https://btctw.vn', category: 'Chính thống' },
  { id: 'ubkttw', label: 'Ủy ban Kiểm tra Trung ương', url: 'https://ubkttw.vn', category: 'Chính thống' },
  { id: 'hcma', label: 'Học viện Chính trị Quốc gia Hồ Chí Minh', url: 'https://hcma.vn', category: 'Chính thống' },
  { id: 'vptw', label: 'Văn phòng Trung ương Đảng', url: 'https://vptw.dcs.vn', category: 'Chính thống' },
  { id: 'hcmcpv', label: 'Thành ủy TP.HCM', url: 'https://www.hcmcpv.org.vn', category: 'Địa phương' },
  { id: 'hochiminhcity', label: 'Cổng TTĐT TP.HCM', url: 'https://www.hochiminhcity.gov.vn', category: 'Địa phương' },
  { id: 'tuyengiaohcm', label: 'Tuyên giáo TP.HCM', url: 'https://tuyengiao.hochiminhcity.gov.vn', category: 'Địa phương' },
  { id: 'sggp', label: 'Báo Sài Gòn Giải Phóng', url: 'https://www.sggp.org.vn', category: 'Địa phương' },
  { id: 'nld', label: 'Báo Người Lao Động', url: 'https://nld.com.vn', category: 'Địa phương' }
];

export const KNOWLEDGE_CATEGORIES = [
  'Quy định - Hướng dẫn',
  'Nghị quyết - Chỉ thị',
  'Nhân sự - Tổ chức',
  'Kiểm tra - Giám sát',
  'Dân vận - Tuyên giáo',
  'Văn phòng - Hành chính',
  'Khác'
];

export const REQUIRED_KNOWLEDGE: KnowledgeItem[] = [
  { name: "Danh sách Ban Chấp hành Đảng bộ", updatedAt: "2026-03-01" },
  { name: "Danh sách Cấp ủy các Chi bộ, Đảng bộ trực thuộc Đảng ủy", updatedAt: "2026-03-05" },
  { name: "Quy định về thể thức và kỹ thuật trình bày văn bản của Đảng", updatedAt: "2026-03-10" },
  { name: "Quy định về thẩm quyền ban hành văn bản của các tổ chức đảng", updatedAt: "2026-03-12" },
  { name: "Nội dung chương trình mới cập nhật", updatedAt: "2026-03-15" }
];

export const SECOND_BRAIN_URL = "https://script.google.com/macros/s/AKfycbxTpl4yOLEByoVN4R1bEJnuTgY93g0luDgHkJtGb2lXp3b0HuB_yVYmzlLfGi8SJ8kQ/exec";
export const SECOND_BRAIN_FOLDER_URL = "https://drive.google.com/drive/folders/1PYVbIAYivf3xrqxBc5YENp2C3kJwlqVR?hl=vi";

import { PROVINCES as ADMIN_PROVINCES, WARDS_BY_PROVINCE as ADMIN_WARDS } from './data/administrative';

export const PROVINCES = ADMIN_PROVINCES;
export const WARDS_BY_PROVINCE = ADMIN_WARDS;

