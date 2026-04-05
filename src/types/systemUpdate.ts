export type IssueStatus = 'normal' | 'warning' | 'needs_action';
export type Severity = 'low' | 'medium' | 'high';

export interface SystemIssue {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  status: IssueStatus;
  detectedAt: Date;
  fixAction?: () => Promise<void>;
}

export type IntegrationPriority = 'very_suitable' | 'consider' | 'not_necessary';

export interface IntegrationSuggestion {
  id: string;
  name: string;
  purpose: string;
  benefit: string;
  priority: IntegrationPriority;
  complexity: 'low' | 'medium' | 'high';
  isAvailable: boolean;
  action: () => Promise<void>;
}

export interface ScanHistory {
  id: string;
  timestamp: Date;
  issuesFound: number;
  status: 'success' | 'warning' | 'failed';
}

export interface ScanSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  lastRun: Date | null;
  nextRun: Date | null;
}
