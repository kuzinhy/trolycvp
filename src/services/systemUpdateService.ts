import { SystemIssue, IntegrationSuggestion, ScanHistory } from '../types/systemUpdate';

// Mock Data
const MOCK_ISSUES: SystemIssue[] = [
  { id: '1', name: 'Lỗi kết nối API', description: 'API dịch vụ thời tiết không phản hồi.', severity: 'high', status: 'needs_action', detectedAt: new Date(), fixAction: async () => { await new Promise(r => setTimeout(r, 1000)); } },
  { id: '2', name: 'Cảnh báo bảo mật', description: 'Có phiên đăng nhập lạ từ IP không xác định.', severity: 'medium', status: 'warning', detectedAt: new Date(), fixAction: async () => { await new Promise(r => setTimeout(r, 1000)); } },
];

const MOCK_INTEGRATIONS: IntegrationSuggestion[] = [
  { id: '1', name: 'Google Analytics', purpose: 'Phân tích người dùng', benefit: 'Hiểu rõ hành vi người dùng', priority: 'very_suitable', complexity: 'low', isAvailable: true, action: async () => {} },
  { id: '2', name: 'Slack Integration', purpose: 'Thông báo', benefit: 'Nhận thông báo tức thời', priority: 'consider', complexity: 'medium', isAvailable: true, action: async () => {} },
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
