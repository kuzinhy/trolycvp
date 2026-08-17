import { SystemIssue, IntegrationSuggestion, ScanHistory } from '../types/systemUpdate';

// Mock Data
const MOCK_ISSUES: SystemIssue[] = [
  { id: '1', name: 'Lỗi kết nối API', description: 'API dịch vụ thời tiết không phản hồi.', severity: 'high', status: 'needs_action', detectedAt: new Date(), fixAction: async () => { await new Promise(r => setTimeout(r, 1000)); } },
  { id: '2', name: 'Cảnh báo bảo mật', description: 'Có phiên đăng nhập lạ từ IP không xác định.', severity: 'medium', status: 'warning', detectedAt: new Date(), fixAction: async () => { await new Promise(r => setTimeout(r, 1000)); } },
];

const MOCK_INTEGRATIONS: IntegrationSuggestion[] = [
  { id: '1', name: 'Google Workspace (Calendar, Gmail, Docs, Sheets)', purpose: 'Đồng bộ dữ liệu văn phòng', benefit: 'Đã sẵn sàng. Đã được cấp quyền OAuth2.', priority: 'very_suitable', complexity: 'medium', isAvailable: true, status: 'completed' },
  { id: '2', name: 'Gemini Live API & Multimodal', purpose: 'Trợ lý giọng nói thời gian thực', benefit: 'Hỗ trợ giao tiếp bằng giọng nói tự nhiên, độ trễ thấp.', priority: 'very_suitable', complexity: 'high', isAvailable: true, status: 'in_progress' },
  { id: '3', name: 'Google Search Grounding', purpose: 'Đã tích hợp', benefit: 'Trợ lý đã có khả năng truy suất tin tức thời gian thực từ Google.', priority: 'consider', complexity: 'low', isAvailable: true, status: 'completed' },
  { id: '4', name: 'Google Maps Platform', purpose: 'Bản đồ chiến lược', benefit: 'Tương tác bản đồ động, tối ưu công tác.', priority: 'consider', complexity: 'medium', isAvailable: true, status: 'in_progress' },
  { id: '5', name: 'Firebase Tối ưu (Firestore/Auth)', purpose: 'Bảo mật & Realtime', benefit: 'Được quản lý tự động thông qua Security Rules chuyên sâu.', priority: 'consider', complexity: 'medium', isAvailable: true, status: 'in_progress' },
];

export const systemUpdateService = {
  runHealthCheck: async (): Promise<SystemIssue[]> => {
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    return MOCK_ISSUES;
  },

  getIntegrationSuggestions: async (): Promise<IntegrationSuggestion[]> => {
    await new Promise(r => setTimeout(r, 1000));
    return MOCK_INTEGRATIONS;
  },

  getScanHistory: async (): Promise<ScanHistory[]> => {
    return [
      { id: 'h1', timestamp: new Date(Date.now() - 86400000), issuesFound: 0, status: 'success' },
      { id: 'h2', timestamp: new Date(Date.now() - 172800000), issuesFound: 2, status: 'warning' },
    ];
  }
};
