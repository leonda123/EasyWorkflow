const API_BASE = import.meta.env.VITE_API_URL !== undefined
  ? '/api/v1'
  : 'http://localhost:3001/api/v1';
export const BACKEND_URL = import.meta.env.VITE_API_URL !== undefined
  ? ''
  : 'http://localhost:3001';

let authToken: string | null = localStorage.getItem('token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => authToken;

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text);
};

export const api = {
  auth: {
    register: (email: string, name: string, password: string) =>
      request<{ user: any; token: string; defaultTeam: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      }),

    login: (email: string, password: string) =>
      request<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: () => request<any>('/auth/me'),
  },

  teams: {
    list: () => request<any[]>('/teams'),

    get: (id: string) => request<any>(`/teams/${id}`),

    create: (name: string, avatarColor?: string) =>
      request<any>('/teams', {
        method: 'POST',
        body: JSON.stringify({ name, avatarColor }),
      }),

    update: (id: string, data: { name?: string; avatarColor?: string }) =>
      request<any>(`/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/teams/${id}`, { method: 'DELETE' }),

    inviteMember: (teamId: string, email: string, role: string) =>
      request<any>(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),

    updateMemberRole: (teamId: string, memberId: string, role: string) =>
      request<any>(`/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }),

    removeMember: (teamId: string, memberId: string) =>
      request<{ message: string }>(`/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      }),

    leaveTeam: (teamId: string) =>
      request<{ message: string }>(`/teams/${teamId}/leave`, { method: 'POST' }),
  },

  workflows: {
    list: (teamId: string) =>
      request<any[]>(`/teams/${teamId}/workflows`),

    get: (teamId: string, id: string) =>
      request<any>(`/teams/${teamId}/workflows/${id}`),

    create: (teamId: string, name: string, description?: string, definition?: any) =>
      request<any>(`/teams/${teamId}/workflows`, {
        method: 'POST',
        body: JSON.stringify({ name, description, definition }),
      }),

    update: (teamId: string, id: string, data: { name?: string; description?: string; definition?: any }) =>
      request<any>(`/teams/${teamId}/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (teamId: string, id: string) =>
      request<{ message: string }>(`/teams/${teamId}/workflows/${id}`, {
        method: 'DELETE',
      }),

    deploy: (teamId: string, id: string, versionStr: string, description?: string) =>
      request<any>(`/teams/${teamId}/workflows/${id}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ versionStr, description }),
      }),

    rollback: (teamId: string, id: string, version: string) =>
      request<any>(`/teams/${teamId}/workflows/${id}/rollback/${version}`, {
        method: 'POST',
      }),

    import: (teamId: string, data: any) =>
      request<any>(`/teams/${teamId}/workflows/import`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      }),

    export: (teamId: string, id: string) =>
      request<any>(`/teams/${teamId}/workflows/${id}/export`),

    run: (teamId: string, workflowId: string, input?: any, targetNodeId?: string) =>
      request<{
        executionId: string;
        status: 'SUCCESS' | 'FAILED';
        steps: Array<{
          nodeId: string;
          nodeLabel: string;
          nodeType: string;
          success: boolean;
          status: 'success' | 'failed' | 'skipped';
          duration: number;
          logs: string[];
          input?: any;
          output?: any;
          error?: string;
        }>;
        output?: any;
        duration: number;
        error?: string;
      }>(
        `/teams/${teamId}/workflows/${workflowId}/run`,
        {
          method: 'POST',
          body: JSON.stringify({ input, targetNodeId }),
        }
      ),

    getDeployments: (teamId: string) =>
      request<{ deployments: any[] }>(`/teams/${teamId}/deployments`),

    updateStatus: (teamId: string, workflowId: string, status: 'active' | 'inactive') =>
      request<any>(`/teams/${teamId}/workflows/${workflowId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    getStats: (workflowId: string) =>
      request<any>(`/workflows/${workflowId}/stats`),

    getExecutions: (workflowId: string, limit = 10) =>
      request<{ executions: any[] }>(`/workflows/${workflowId}/executions?limit=${limit}`),
  },

  executions: {
    list: (teamId: string, limit = 20, offset = 0) =>
      request<{ data: any[]; total: number }>(
        `/teams/${teamId}/executions?limit=${limit}&offset=${offset}`
      ),

    get: (teamId: string, id: string) =>
      request<any>(`/teams/${teamId}/executions/${id}`),

    getProgress: (teamId: string, id: string) =>
      request<{
        executionId: string;
        status: string;
        currentNodeId: string | null;
        currentNodeLabel: string | null;
        completedNodes: number;
        totalNodes: number;
        progress: number;
        nodeStatuses: Array<{
          nodeId: string;
          nodeLabel: string;
          status: string;
          duration: number | null;
        }>;
      }>(`/teams/${teamId}/executions/${id}/progress`),
  },

  apiKeys: {
    list: (teamId: string) =>
      request<any[]>(`/teams/${teamId}/api-keys`),

    create: (teamId: string, name: string, workflowId?: string) =>
      request<any>(`/teams/${teamId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name, workflowId }),
      }),

    revoke: (teamId: string, id: string) =>
      request<{ message: string }>(`/teams/${teamId}/api-keys/${id}/revoke`, {
        method: 'POST',
      }),

    delete: (teamId: string, id: string) =>
      request<{ message: string }>(`/teams/${teamId}/api-keys/${id}`, {
        method: 'DELETE',
      }),

    getGlobal: () =>
      request<any>('/api-keys/global'),

    createGlobal: (data: { customKey?: string }) =>
      request<any>('/api-keys/global', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    toggleGlobal: (data: { enabled: boolean }) =>
      request<any>('/api-keys/global/toggle', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteGlobal: () =>
      request<{ message: string }>('/api-keys/global', {
        method: 'DELETE',
      }),

    getWorkflow: (teamId: string, workflowId: string) =>
      request<any>(`/teams/${teamId}/workflows/${workflowId}/api-key`),

    createWorkflow: (teamId: string, workflowId: string, data: { customKey?: string }) =>
      request<any>(`/teams/${teamId}/workflows/${workflowId}/api-key`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    toggleWorkflow: (teamId: string, workflowId: string, data: { enabled: boolean }) =>
      request<any>(`/teams/${teamId}/workflows/${workflowId}/api-key/toggle`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteWorkflow: (teamId: string, workflowId: string) =>
      request<{ message: string }>(`/teams/${teamId}/workflows/${workflowId}/api-key`, {
        method: 'DELETE',
      }),
  },

  admin: {
    stats: () =>
      request<{
        users: { total: number; active: number; superAdmins: number };
        teams: number;
        workflows: number;
        executions: number;
      }>('/admin/stats'),

    users: {
      list: (page = 1, limit = 20, search?: string) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(search && { search }),
        });
        return request<{
          data: any[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>(`/admin/users?${params}`);
      },

      get: (id: string) => request<any>(`/admin/users/${id}`),

      create: (data: { name: string; email: string; password: string; role?: string; teamId?: string; createDefaultTeam?: boolean }) =>
        request<any>('/admin/users', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (id: string, data: { name?: string; email?: string; role?: string; isActive?: boolean }) =>
        request<any>(`/admin/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (id: string) =>
        request<{ message: string }>(`/admin/users/${id}`, {
          method: 'DELETE',
        }),

      setRole: (id: string, role: string) =>
        request<any>(`/admin/users/${id}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role }),
        }),

      setStatus: (id: string, isActive: boolean) =>
        request<any>(`/admin/users/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ isActive }),
        }),
    },
  },

  llm: {
    providers: () =>
      request<any[]>('/llm/providers'),

    configs: {
      list: (teamId?: string) => request<any[]>(`/llm/configs${teamId ? `?teamId=${teamId}` : ''}`),

      get: (id: string) => request<any>(`/llm/configs/${id}`),

      create: (data: { name: string; provider: string; baseUrl: string; apiKey: string; model: string; isActive?: boolean; isDefault?: boolean; maxTokens?: number; temperature?: number; teamIds?: string[]; isGlobal?: boolean }) =>
        request<any>('/llm/configs', {
          method: 'POST',
          body: JSON.stringify(data),
        }),

      update: (id: string, data: Partial<{ name: string; provider: string; baseUrl: string; apiKey: string; model: string; isActive: boolean; isDefault: boolean; maxTokens: number; temperature: number; teamIds: string[]; isGlobal: boolean }>) =>
        request<any>(`/llm/configs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),

      delete: (id: string) =>
        request<{ message: string }>(`/llm/configs/${id}`, {
          method: 'DELETE',
        }),

      test: (id: string) =>
        request<{ success: boolean; message: string; response?: string }>(`/llm/configs/${id}/test`, {
          method: 'POST',
        }),
    },

    chat: (messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: { configId?: string; systemPrompt?: string; maxTokens?: number; temperature?: number }) =>
      request<{ content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }>('/llm/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, ...options }),
      }),
  },

  notifications: {
    getSettings: (teamId: string) =>
      request<{
        id: string;
        teamId: string;
        userId: string;
        emailEnabled: boolean;
        email: string | null;
        onFailure: boolean;
        onSuccess: boolean;
        cooldownMinutes: number;
        lastNotifiedAt: string | null;
      }>(`/teams/${teamId}/notifications/settings`),

    updateSettings: (teamId: string, data: {
      emailEnabled?: boolean;
      email?: string;
      onFailure?: boolean;
      onSuccess?: boolean;
      cooldownMinutes?: number;
    }) =>
      request<any>(`/teams/${teamId}/notifications/settings`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  database: {
    testConnection: (config: {
      type?: string;
      host?: string;
      port?: number;
      database?: string;
      username?: string;
      password?: string;
      connectionString?: string;
    }) =>
      request<{ success: boolean; message: string; version?: string }>('/database/test', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
  },

  ai: {
    generateCode: (params: {
      description: string;
      context?: {
        inputFields?: string[];
        sampleData?: any;
        previousSteps?: string[];
      };
    }) =>
      request<{ code: string; explanation: string }>('/ai/generate-code', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  mq: {
    getConfig: () =>
      request<any>('/mq/config'),

    updateConfig: (data: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      vhost?: string;
      enabled?: boolean;
      maxRetries?: number;
      retryDelay?: number;
      prefetchCount?: number;
      messageTtl?: number;
    }) =>
      request<any>('/mq/config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    testConnection: (config: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      vhost?: string;
    }) =>
      request<{ success: boolean; message: string; details?: { host: string; port: number; vhost: string } }>('/mq/test', {
        method: 'POST',
        body: JSON.stringify(config),
      }),

    toggle: (enabled: boolean) =>
      request<any>('/mq/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),

    getStatus: () =>
      request<{ enabled: boolean; connected: boolean; queueLength: number; lastCheckAt?: string }>('/mq/status'),

    reconnect: () =>
      request<{ success: boolean; message: string }>('/mq/reconnect', {
        method: 'POST',
      }),
  },

  email: {
    getConfig: () =>
      request<any>('/email/config'),

    updateConfig: (data: {
      host?: string;
      port?: number;
      secure?: boolean;
      username?: string;
      password?: string;
      fromEmail?: string;
      fromName?: string;
      enabled?: boolean;
    }) =>
      request<any>('/email/config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    testConnection: (config: {
      host?: string;
      port?: number;
      secure?: boolean;
      username?: string;
      password?: string;
    }) =>
      request<{ success: boolean; message: string }>('/email/test', {
        method: 'POST',
        body: JSON.stringify(config),
      }),

    sendTestEmail: (to: string) =>
      request<{ success: boolean; message: string }>('/email/send-test', {
        method: 'POST',
        body: JSON.stringify({ to }),
      }),

    getStatus: () =>
      request<{ enabled: boolean }>('/email/status'),
  },

  system: {
    getSettings: () =>
      request<{
        id: string;
        easyBotEnabled: boolean;
        processNodeAiEnabled: boolean;
        easyBotLlmConfigId: string | null;
        processNodeAiLlmConfigId: string | null;
        createdAt: string;
        updatedAt: string;
      }>('/system/settings'),

    updateSettings: (data: {
      easyBotEnabled?: boolean;
      processNodeAiEnabled?: boolean;
      easyBotLlmConfigId?: string | null;
      processNodeAiLlmConfigId?: string | null;
    }) =>
      request<any>('/system/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getAiSettings: () =>
      request<{
        easyBotEnabled: boolean;
        processNodeAiEnabled: boolean;
        easyBotLlmConfigId: string | null;
        processNodeAiLlmConfigId: string | null;
      }>('/system/ai-settings'),
  },
};
