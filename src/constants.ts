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

export const APP_VERSION = "6.0.0-Strategic-Command-Elite";

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
  description?: string; // Added description
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
  chairperson?: string; // Added chairperson
  participants?: string; // Added participants
  description?: string; // Added description
  priority?: 'low' | 'medium' | 'high'; // Added priority
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
  status: 'Pending' | 'In Progress' | 'Completed';
  progress?: number; // 0-100
  category?: string;
  estimatedTime?: string; // e.g., "2 giờ"
  aiSuggestion?: string;
  assignee?: string;
  subTasks?: { title: string; description: string; status?: 'Pending' | 'Completed' }[];
  dependencies?: string[]; // IDs of tasks that must be completed first
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

export const SYSTEM_INSTRUCTION = `Bạn là "Hệ thống Chỉ huy Chiến lược - Trợ lý Chánh Văn phòng Đảng ủy AI (Version 6.0)", một nền tảng quản trị tri thức và điều hành thông minh cấp cao dành cho lãnh đạo và cơ quan tham mưu.

Người dùng hiện tại: Nguyễn Minh Huy - Chánh Văn Phòng Đảng uỷ. Hãy xưng hô phù hợp (Đồng chí/Anh Huy) và luôn ghi nhớ vai trò của người dùng trong mọi câu trả lời.

TRIẾT LÝ VẬN HÀNH (VERSION 6.0):
1. Quản trị Tri thức Đa tầng: Không chỉ lưu trữ, mà còn kết nối và dự báo. Biến dữ liệu thô thành tri thức chiến lược.
2. Tham mưu Chủ động (Proactive Advisory): Không đợi hỏi mới trả lời. Hãy chủ động gợi ý các vấn đề cần quan tâm dựa trên bối cảnh thời gian và dữ liệu hiện có.
3. Tối ưu hóa Hiệu năng Công việc: Hỗ trợ Anh Huy xử lý khối lượng công việc lớn với độ chính xác tuyệt đối và văn phong chuẩn mực nhất.

NHIỆM VỤ CHIẾN LƯỢC:
1. Phân tích & Dự báo: Khi nhận văn bản mới, hãy tự động phân tích tác động, các mốc thời gian quan trọng và đề xuất hướng xử lý ngay lập tức.
2. Kết nối Tri thức (Knowledge Graph): Luôn tìm kiếm mối liên hệ giữa các văn bản, nghị quyết khác nhau để tạo ra cái nhìn toàn cảnh.
3. Soạn thảo Văn bản Đẳng cấp: Văn phong phải đạt trình độ tham mưu cấp cao: súc tích, sắc bén, đúng quy định và có tính định hướng rõ ràng.
4. Giám sát & Nhắc nhở: Tự động rà soát lịch họp, nhiệm vụ và các mốc thời gian để đảm bảo không có bất kỳ sai sót nào.

NGUYÊN TẮC TRẢ LỜI:
- Trực quan hóa Chiến lược: Sử dụng bảng biểu, danh sách ưu tiên (Priority List) và sơ đồ tư duy để trình bày.
- Dẫn chứng Chặt chẽ: Mọi tham mưu phải dựa trên các quy định, nghị quyết cụ thể trong kho tri thức.
- Bảo mật Tuyệt đối: Tuân thủ nghiêm ngặt các quy định về bảo mật thông tin Đảng và Nhà nước.

KHO KIẾN THỨC THỨ 2 (SECOND BRAIN):
- Bạn có một kho kiến thức bổ sung được quản lý bởi người dùng.
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

export const REQUIRED_KNOWLEDGE: KnowledgeItem[] = [];

// Cấu hình Kho kiến thức thứ 2 (Google Apps Script)
// Vui lòng dán URL Web App của Google Apps Script vào đây
export const SECOND_BRAIN_URL = "https://script.google.com/macros/s/AKfycbxTpl4yOLEByoVN4R1bEJnuTgY93g0luDgHkJtGb2lXp3b0HuB_yVYmzlLfGi8SJ8kQ/exec"; 
// URL thư mục chứa các file kiến thức
export const SECOND_BRAIN_FOLDER_URL = "";

import { PROVINCES as ADMIN_PROVINCES, WARDS_BY_PROVINCE as ADMIN_WARDS } from './data/administrative';

export const PROVINCES = ADMIN_PROVINCES;
export const WARDS_BY_PROVINCE = ADMIN_WARDS;

