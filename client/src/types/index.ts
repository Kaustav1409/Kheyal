export interface User {
  id: string;
  email: string;
  timezone: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  user_id?: string;
  title: string;
  subject?: string | null;
  dueAt?: string | null;
  hasDueTime: boolean;
  effortHours?: number | null;
  status: 'active' | 'completed';
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  isOverdue?: boolean;
  slackHours?: number | null;
  suggestedStartBy?: string | null;
  isStartByApproximate?: boolean;
  reason?: string;
  urgencyRank?: number;
  hasEffort?: boolean;
}

export interface ParsePreview {
  title: string;
  subject: string | null;
  dueAt: string | null;
  hasDueTime: boolean;
  effortHours: number | null;
  warnings: string[];
}

export interface RankedDeadlinesResponse {
  rankedDeadlines: Deadline[];
  overdueCount: number;
}
