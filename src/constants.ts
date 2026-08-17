/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  eventId?: string;
}

export const APP_VERSION = "8.0.0-Strategic-Command-Elite";

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
  'Võ Thành Trung',
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
  description?: string; // Added description
  category?: string; // Added category
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
  chairperson?: string;
  participants?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  projectId?: string; // Liên kết với Dự án chiến lược
  references?: string[]; // Danh sách IDs văn bản liên quan
  reminderMinutes?: number;
  reminderType?: 'minutes' | 'hours' | 'days' | 'none';
  reminderValue?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string; // Format: YYYY-MM-DD
  time?: string; // Format: HH:mm
  priority: 'low' | 'medium' | 'high';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'In Review';
  progress?: number; // 0-100
  category?: string;
  estimatedTime?: string;
  aiSuggestion?: string;
  assignee?: string;
  departmentId?: string; // Đơn vị chịu trách nhiệm
  projectId?: string; // Thuộc dự án/chương trình nào
  references?: string[]; // Các nghị quyết, văn bản hướng dẫn
  subTasks?: { title: string; description: string; status?: 'Pending' | 'Completed' }[];
  dependencies?: string[];
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
}

export const MOCK_TRACKING_DATA: TrackingItem[] = [];

export const SYSTEM_INSTRUCTION = `Bạn là "Hệ thống Chỉ huy Chiến lược - Trợ lý Tinh Nhuệ Văn phòng Đảng ủy AI (Elite Intelligence Version 9.0)", nền tảng quản trị tri thức, tham mưu chỉ huy chiến lược và điều hành cấp cao.

Người dùng hiện tại: {{USER_NAME}} - Chánh Văn phòng Đảng ủy. Hãy luôn xưng hô trang trọng ("Đồng chí", "Anh Huy") và thể hiện vai trò là một trợ lý tham mưu trí tuệ nhân tạo xuất sắc, sắc sảo, am tường nghiệp vụ công tác Đảng và quản trị chiến lược.

TRIẾT LÝ VẬN HÀNH & PHẨM CHẤT THAM MƯU:
1. Sắc bén & Trực diện: Trả lời nhanh chóng, tập trung thẳng vào bản chất vấn đề, không vòng vo sáo rỗng.
2. Cấu trúc Trí tuệ Đỉnh cao: Trình bày câu trả lời mạch lạc, phân cấp tiêu đề rõ ràng, sử dụng bullet points, bảng biểu hoặc lộ trình hành động khi cần thiết.
3. Tham mưu Chiến lược & Dự báo: Luôn nhìn nhận bức tranh tổng thể, dự báo trước các điểm nghẽn, thời hạn công việc và đề xuất giải pháp khả thi.
4. Quản trị Tri thức & Kết nối dữ liệu: Kết nối chặt chẽ giữa Nghị quyết, Chỉ thị, Quy định Đảng với Lịch công tác và Nhiệm vụ thực tế.
5. Bảo mật & Chuẩn mực Văn phong: Tuân thủ tuyệt đối văn phong hành chính Đảng - Nhà nước, súc tích, đĩnh đạc và uy tín.

KHO KIẾN THỨC BỘ NÃO THỨ HAI (SECOND BRAIN):
- Bạn được tích hợp chặt chẽ với Kho Tri thức và Lịch trình/Nhiệm vụ thời gian thực của Văn phòng.
- Luôn ưu tiên căn cứ vào dữ liệu thực tế và tri thức trong hệ thống để đưa ra phân tích chính xác nhất.
- Khi người dùng cung cấp thông tin mới hoặc yêu cầu lưu lại ("ghi nhớ", "lưu vào bộ não"), hãy ghi nhận nhanh chóng và xác nhận thông tin đã tiếp thu.`;

export interface KnowledgeItem {
  name: string;
  updatedAt: string;
  demoUrl?: string;
}

export interface StrategicProject {
  id: string;
  title: string;
  code: string;
  description: string;
}

export const STRATEGIC_PROJECTS: StrategicProject[] = [
  { id: 'proj-001', title: 'Chuyển đổi số công tác Đảng', code: 'CDS-01', description: 'Số hóa toàn bộ hồ sơ, văn bản và quy trình điều hành.' },
  { id: 'proj-002', title: 'Xây dựng kho tri thức dùng chung', code: 'KTT-02', description: 'Xây dựng hệ thống RAG kết nối tri thức đa nguồn.' },
  { id: 'proj-003', title: 'Nâng cao năng lực tham mưu AI', code: 'AI-03', description: 'Đào tạo và ứng dụng AI trong phân tích chiến lược.' },
  { id: 'proj-004', title: 'Giám sát an ninh tư tưởng số', code: 'AN-04', description: 'Phân tích dư luận và bảo vệ nền tảng tư tưởng trên không gian mạng.' }
];

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

export const REQUIRED_KNOWLEDGE: KnowledgeItem[] = [];

// Cấu hình Kho kiến thức thứ 2 (Google Apps Script)
// Vui lòng dán URL Web App của Google Apps Script vào đây
export const SECOND_BRAIN_URL = "https://script.google.com/macros/s/AKfycbxTpl4yOLEByoVN4R1bEJnuTgY93g0luDgHkJtGb2lXp3b0HuB_yVYmzlLfGi8SJ8kQ/exec"; 
// URL thư mục chứa các file kiến thức
export const SECOND_BRAIN_FOLDER_URL = "";

import { PROVINCES as ADMIN_PROVINCES, WARDS_BY_PROVINCE as ADMIN_WARDS } from './data/administrative';

export const PROVINCES = ADMIN_PROVINCES;
export const WARDS_BY_PROVINCE = ADMIN_WARDS;

