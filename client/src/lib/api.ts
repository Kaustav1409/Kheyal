import { User, Deadline, ParsePreview, RankedDeadlinesResponse } from '../types';

class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Sends HttpOnly session cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong', response.status, data.details);
  }

  return data as T;
}

export const api = {
  // Auth
  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  async login(email: string, password: string): Promise<{ user: User; message: string }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async signup(email: string, password: string, timezone?: string): Promise<{ user: User; message: string }> {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, timezone }),
    });
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return request('/auth/logout', {
      method: 'POST',
    });
  },

  // Deadlines
  async parseDeadline(text: string, timezone?: string): Promise<{ preview: ParsePreview }> {
    return request('/deadlines/parse', {
      method: 'POST',
      body: JSON.stringify({ text, timezone }),
    });
  },

  async createDeadline(data: {
    title: string;
    subject?: string | null;
    dueAt?: string | null;
    hasDueTime?: boolean;
    effortHours?: number | null;
  }): Promise<{ deadline: Deadline; remindersScheduled: number }> {
    return request('/deadlines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDeadlines(status = 'active', subject?: string): Promise<{ deadlines: Deadline[] }> {
    const params = new URLSearchParams({ status });
    if (subject) params.append('subject', subject);
    return request(`/deadlines?${params.toString()}`);
  },

  async getRankedNext(): Promise<RankedDeadlinesResponse> {
    return request('/deadlines/next');
  },

  async getDeadline(id: string): Promise<{ deadline: Deadline }> {
    return request(`/deadlines/${id}`);
  },

  async updateDeadline(id: string, data: Partial<Deadline>): Promise<{ deadline: Deadline }> {
    return request(`/deadlines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteDeadline(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/deadlines/${id}`, {
      method: 'DELETE',
    });
  },

  // Push
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return request('/push/vapid-public-key');
  },

  async subscribePush(subscription: PushSubscriptionJSON): Promise<{ success: boolean }> {
    return request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  },

  async unsubscribePush(endpoint: string): Promise<{ success: boolean }> {
    return request('/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  },
};
