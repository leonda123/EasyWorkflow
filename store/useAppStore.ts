import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkflowMetadata, ExecutionLog, DashboardTab, SavedNodeTemplate, NodeData, WorkflowVersionHistory, Team, User, Language, ApiKey } from '../types';
import { api, setAuthToken, getAuthToken } from '../lib/api';

interface AppState {
  dashboardTab: DashboardTab;
  
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  language: Language;
  mcpEnabled: boolean;

  currentUser: User | null;
  currentTeam: Team | null;
  teams: Team[];
  teamMembers: User[];
  
  workflows: WorkflowMetadata[];
  executions: ExecutionLog[];
  savedNodes: SavedNodeTemplate[];
  apiKeys: ApiKey[];
  
  loading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, name: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  setMcpEnabled: (enabled: boolean) => void;
  
  loadTeams: () => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  createTeam: (name: string, slug: string) => Promise<void>;
  loadTeamMembers: (teamId: string) => Promise<void>;
  inviteMember: (email: string, role: User['role']) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  
  setDashboardTab: (tab: DashboardTab) => void;
  
  loadWorkflows: () => Promise<void>;
  loadWorkflow: (teamId: string, workflowId: string) => Promise<WorkflowMetadata | undefined>;
  createWorkflow: (name: string, description?: string) => Promise<string | undefined>;
  updateWorkflow: (teamId: string, workflowId: string, data: { name?: string; description?: string; definition?: any }) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  importWorkflow: (data: WorkflowMetadata) => Promise<void>;
  deployWorkflow: (id: string, version: string, description: string) => Promise<void>;
  rollbackWorkflow: (teamId: string, workflowId: string, version: string) => Promise<any>;
  generateWorkflowApiKey: (id: string) => Promise<void>;
  addExecution: (exec: ExecutionLog) => void;
  
  loadExecutions: () => Promise<void>;
  
  generateGlobalApiKey: (name: string) => Promise<void>;
  revokeGlobalApiKey: (id: string) => Promise<void>;
  loadApiKeys: () => Promise<void>;
  
  saveNodeTemplate: (nodeData: NodeData, name: string, tags: string[]) => void;
  updateSavedNode: (id: string, updates: Partial<SavedNodeTemplate>) => void;
  deleteSavedNode: (id: string) => void;
}

const mockSavedNodes: SavedNodeTemplate[] = [
  {
    id: 'tpl-1',
    name: '钉钉通知机器人',
    tags: ['通知', 'IM'],
    createdAt: '2023-10-20',
    nodeType: 'api' as any,
    data: {
      label: '发送钉钉消息',
      description: '通过 Webhook 发送群消息',
      type: 'api' as any,
      status: 'idle' as any,
      config: {
        method: 'POST',
        url: 'https://oapi.dingtalk.com/robot/send?access_token=...',
        headers: [{ id: '1', key: 'Content-Type', value: 'application/json' }],
        body: '{\n "msgtype": "text",\n "text": {\n  "content": "Hello"\n }\n}'
      }
    }
  }
];

const getInitialMcpEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem('mcpEnabled');
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
};

const getInitialSavedNodes = (): SavedNodeTemplate[] => {
  return [];
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  dashboardTab: 'workflows',
  isAuthenticated: false,
  isAuthLoading: true,
  language: 'zh',
  mcpEnabled: getInitialMcpEnabled(),
  
  currentUser: null,
  currentTeam: null,
  teams: [],
  teamMembers: [],
  
  workflows: [],
  executions: [],
  savedNodes: getInitialSavedNodes(),
  apiKeys: [],
  
  loading: false,
  error: null,

  checkAuth: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ isAuthenticated: false, currentUser: null, isAuthLoading: false });
      return;
    }

    try {
      const user = await api.auth.me();
      set({
        isAuthenticated: true,
        isAuthLoading: false,
        currentUser: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatarUrl,
          role: 'owner',
          systemRole: user.role,
        },
      });
      
      await get().loadTeams();
    } catch {
      setAuthToken(null);
      set({ isAuthenticated: false, currentUser: null, isAuthLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const result = await api.auth.login(email, password);
      setAuthToken(result.token);
      
      set({
        isAuthenticated: true,
        isAuthLoading: false,
        currentUser: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          avatar: result.user.avatarUrl,
          role: 'owner',
          systemRole: result.user.role,
        },
        loading: false,
      });
      
      await get().loadTeams();
      return true;
    } catch (error: any) {
      set({ loading: false, error: error.message });
      return false;
    }
  },

  register: async (email: string, name: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const result = await api.auth.register(email, name, password);
      setAuthToken(result.token);
      
      set({
        isAuthenticated: true,
        isAuthLoading: false,
        currentUser: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          avatar: result.user.avatarUrl,
          role: 'owner',
          systemRole: result.user.role,
        },
        currentTeam: result.defaultTeam ? {
          id: result.defaultTeam.id,
          name: result.defaultTeam.name,
          slug: result.defaultTeam.slug,
          membersCount: 1,
        } : null,
        loading: false,
      });
      
      await get().loadTeams();
      return true;
    } catch (error: any) {
      set({ loading: false, error: error.message });
      return false;
    }
  },

  logout: () => {
    setAuthToken(null);
    set({
      isAuthenticated: false,
      isAuthLoading: false,
      currentUser: null,
      currentTeam: null,
      teams: [],
      workflows: [],
      executions: [],
    });
  },

  setLanguage: (lang) => set({ language: lang }),
  setMcpEnabled: (enabled) => {
    try {
      localStorage.setItem('mcpEnabled', String(enabled));
    } catch {
      // Ignore localStorage errors
    }
    set({ mcpEnabled: enabled });
  },

  loadTeams: async () => {
    try {
      const teams = await api.teams.list();
      const formattedTeams: Team[] = teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        avatar: t.avatarColor || 'bg-blue-600',
        membersCount: t.membersCount || 1,
        role: t.role,
      }));
      
      set({ teams: formattedTeams });
      
      if (formattedTeams.length > 0) {
        const persistedData = localStorage.getItem('easyworkflow-storage');
        let savedTeamId: string | null = null;
        
        if (persistedData) {
          try {
            const parsed = JSON.parse(persistedData);
            savedTeamId = parsed?.state?.lastTeamId || null;
          } catch {}
        }
        
        if (!savedTeamId) {
          savedTeamId = localStorage.getItem('currentTeamId');
        }
        
        const currentTeam = get().currentTeam;
        
        let targetTeam = null;
        
        if (savedTeamId) {
          targetTeam = formattedTeams.find(t => t.id === savedTeamId);
        }
        
        if (!targetTeam && currentTeam) {
          targetTeam = formattedTeams.find(t => t.id === currentTeam.id);
        }
        
        if (!targetTeam) {
          targetTeam = formattedTeams[0];
        }
        
        set({ currentTeam: targetTeam });
        await get().loadWorkflows();
        if (targetTeam) {
          await get().loadTeamMembers(targetTeam.id);
        }
      }
    } catch (error: any) {
      console.error('Failed to load teams:', error);
    }
  },

  switchTeam: async (teamId: string) => {
    const team = get().teams.find((t) => t.id === teamId);
    if (team) {
      localStorage.setItem('currentTeamId', teamId);
      set({ currentTeam: team, dashboardTab: 'workflows' });
      await get().loadWorkflows();
      await get().loadTeamMembers(teamId);
      window.location.href = '/';
    }
  },

  createTeam: async (name: string, slug: string) => {
    try {
      const team = await api.teams.create(name);
      const newTeam: Team = {
        id: team.id,
        name: team.name,
        slug: team.slug,
        avatar: team.avatarColor || 'bg-blue-600',
        membersCount: 1,
      };
      
      set((state) => ({
        teams: [...state.teams, newTeam],
        currentTeam: newTeam,
        dashboardTab: 'workflows',
        teamMembers: state.currentUser ? [state.currentUser] : [],
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  loadTeamMembers: async (teamId: string) => {
    try {
      const team = await api.teams.get(teamId);
      const members: User[] = team.members.map((m: any) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatarUrl,
        role: m.role.toLowerCase(),
      }));
      set({ teamMembers: members });
    } catch (error: any) {
      console.error('Failed to load team members:', error);
    }
  },

  inviteMember: async (email: string, role: User['role']) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      await api.teams.inviteMember(currentTeam.id, email, role.toUpperCase());
      await get().loadTeamMembers(currentTeam.id);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeMember: async (userId: string) => {
    const { currentTeam, teamMembers } = get();
    if (!currentTeam) return;

    const member = teamMembers.find((m) => m.id === userId);
    if (!member) return;

    try {
      await api.teams.removeMember(currentTeam.id, userId);
      set((state) => ({
        teamMembers: state.teamMembers.filter((m) => m.id !== userId),
        currentTeam: state.currentTeam
          ? { ...state.currentTeam, membersCount: Math.max(0, state.currentTeam.membersCount - 1) }
          : null,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setDashboardTab: (tab) => set({ dashboardTab: tab }),

  loadWorkflows: async () => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      const workflows = await api.workflows.list(currentTeam.id);
      const formatted: WorkflowMetadata[] = workflows.map((w: any) => ({
        id: w.id,
        teamId: w.teamId,
        name: w.name,
        description: w.description,
        status: w.status,
        updatedAt: new Date(w.updatedAt).toLocaleString(),
        nodesCount: w.nodesCount,
        successRate: w.successRate,
        runs: w.runsCount,
        version: w.version,
        versionStr: w.versionStr,
        history: (w.history || []).map((h: any) => ({
          version: h.version,
          date: h.date ? new Date(h.date).toLocaleString() : '',
          author: h.author || 'Unknown',
          description: h.description || '',
          snapshot: h.snapshot,
        })),
      }));
      
      set({ workflows: formatted });
    } catch (error: any) {
      console.error('Failed to load workflows:', error);
    }
  },

  loadWorkflow: async (teamId: string, workflowId: string) => {
    try {
      const workflow = await api.workflows.get(teamId, workflowId);
      const formatted: WorkflowMetadata = {
        id: workflow.id,
        teamId: workflow.teamId,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        updatedAt: new Date(workflow.updatedAt).toLocaleString(),
        nodesCount: workflow.nodesCount,
        successRate: workflow.successRate,
        runs: workflow.runsCount,
        version: workflow.version,
        versionStr: workflow.versionStr,
        history: workflow.history || [],
        definition: workflow.definition,
        apiKey: workflow.apiKey,
      };
      
      set((state) => ({
        workflows: state.workflows.some(w => w.id === workflow.id)
          ? state.workflows.map(w => w.id === workflow.id ? formatted : w)
          : [...state.workflows, formatted],
      }));
      
      return formatted;
    } catch (error: any) {
      console.error('Failed to load workflow:', error);
      throw error;
    }
  },

  createWorkflow: async (name: string, description?: string) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      const workflow = await api.workflows.create(currentTeam.id, name, description || '');
      
      const defaultDefinition = {
        nodes: [{
          id: 'start-1',
          type: 'custom',
          position: { x: 250, y: 250 },
          data: {
            label: 'Start / Webhook',
            description: 'Waiting for POST request',
            status: 'idle',
            type: 'start',
            config: { triggerType: 'webhook' }
          }
        }],
        edges: []
      };
      
      await api.workflows.update(currentTeam.id, workflow.id, { definition: defaultDefinition });
      
      const newWorkflow: WorkflowMetadata = {
        id: workflow.id,
        teamId: workflow.teamId,
        name: workflow.name,
        description: workflow.description || '',
        status: 'draft',
        updatedAt: '刚刚',
        nodesCount: 1,
        successRate: 0,
        runs: 0,
        version: 0.1,
        versionStr: '0.1.0',
        history: [],
        definition: defaultDefinition,
      };
      
      set((state) => ({
        workflows: [newWorkflow, ...state.workflows],
      }));
      
      return workflow.id;
    } catch (error: any) {
      set({ error: error.message });
      return undefined;
    }
  },

  updateWorkflow: async (teamId: string, workflowId: string, data: { name?: string; description?: string; definition?: any }) => {
    try {
      await api.workflows.update(teamId, workflowId, data);
      set((state) => ({
        workflows: state.workflows.map((w) => {
          if (w.id === workflowId) {
            return {
              ...w,
              name: data.name || w.name,
              description: data.description || w.description,
              definition: data.definition,
              updatedAt: '刚刚',
            };
          }
          return w;
        }),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteWorkflow: async (id: string) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      await api.workflows.delete(currentTeam.id, id);
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  importWorkflow: async (data: WorkflowMetadata) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      await api.workflows.import(currentTeam.id, {
        meta: { name: data.name, description: data.description },
        nodes: data.nodes || [],
        edges: data.edges || [],
      });
      await get().loadWorkflows();
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  rollbackWorkflow: async (teamId: string, workflowId: string, version: string) => {
    try {
      const result = await api.workflows.rollback(teamId, workflowId, version);
      set((state) => ({
        workflows: state.workflows.map((w) => {
          if (w.id === workflowId) {
            return {
              ...w,
              definition: result.definition,
              versionStr: result.versionStr,
              updatedAt: '刚刚',
            };
          }
          return w;
        }),
      }));
      return result;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deployWorkflow: async (id: string, version: string, description: string) => {
    const { currentTeam, currentUser } = get();
    if (!currentTeam) return;

    try {
      await api.workflows.deploy(currentTeam.id, id, version, description);
      
      set((state) => ({
        workflows: state.workflows.map((wf) => {
          if (wf.id === id) {
            const newHistoryEntry: WorkflowVersionHistory = {
              version,
              date: new Date().toLocaleString(),
              author: currentUser?.name || 'Unknown',
              description,
            };
            
            return {
              ...wf,
              status: 'active',
              updatedAt: '刚刚',
              version: parseFloat(version),
              versionStr: version,
              history: [newHistoryEntry, ...(wf.history || [])],
            };
          }
          return wf;
        }),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  generateWorkflowApiKey: async (id: string) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      const result = await api.apiKeys.createWorkflow(currentTeam.id, id, {});
      set((state) => ({
        workflows: state.workflows.map((wf) =>
          wf.id === id ? { ...wf, apiKey: result.key } : wf
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  loadExecutions: async () => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      const result = await api.executions.list(currentTeam.id);
      const formatted: ExecutionLog[] = result.data.map((e: any) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflowName || 'Unknown',
        status: e.status,
        startTime: new Date(e.startTime).toLocaleString(),
        duration: e.duration || 0,
        trigger: e.triggerType || 'manual',
        steps: (e.steps || []).map((s: any) => ({
          nodeId: s.nodeId,
          nodeLabel: s.nodeLabel,
          status: s.status,
          duration: s.duration || 0,
          logs: Array.isArray(s.logs) ? s.logs : [],
          input: s.inputData,
          output: s.outputData,
        })),
        input: e.inputData,
        output: e.outputData,
      }));
      
      set({ executions: formatted });
    } catch (error: any) {
      console.error('Failed to load executions:', error);
    }
  },

  addExecution: (exec) => {
    set((state) => ({
      executions: [exec, ...state.executions],
    }));
  },

  loadApiKeys: async () => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      const keys = await api.apiKeys.list(currentTeam.id);
      const formatted: ApiKey[] = keys.map((k: any) => ({
        id: k.id,
        name: k.name,
        key: k.maskedKey,
        status: k.status,
        createdAt: new Date(k.createdAt).toLocaleDateString(),
        lastUsed: k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : undefined,
      }));
      
      set({ apiKeys: formatted });
    } catch (error: any) {
      console.error('Failed to load API keys:', error);
    }
  },

  generateGlobalApiKey: async (name: string) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      const result = await api.apiKeys.create(currentTeam.id, name);
      const newKey: ApiKey = {
        id: result.id,
        name: result.name,
        key: result.key,
        status: 'active',
        createdAt: new Date(result.createdAt).toLocaleDateString(),
      };
      
      set((state) => ({ apiKeys: [newKey, ...state.apiKeys] }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  revokeGlobalApiKey: async (id: string) => {
    const { currentTeam } = get();
    if (!currentTeam) return;

    try {
      await api.apiKeys.revoke(currentTeam.id, id);
      set((state) => ({
        apiKeys: state.apiKeys.map((k) =>
          k.id === id ? { ...k, status: 'revoked' } : k
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  saveNodeTemplate: (nodeData, name, tags) => {
    const newTemplate: SavedNodeTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      tags,
      createdAt: new Date().toISOString().split('T')[0],
      nodeType: nodeData.type,
      data: JSON.parse(JSON.stringify(nodeData)),
    };
    newTemplate.data.label = name;
    newTemplate.data.status = 'idle' as any;
    newTemplate.data.logs = [];
    newTemplate.data.lastRun = undefined;
    newTemplate.data.duration = undefined;

    set((state) => ({
      savedNodes: [newTemplate, ...state.savedNodes],
    }));
  },

  updateSavedNode: (id, updates) => {
    set((state) => ({
      savedNodes: state.savedNodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    }));
  },

  deleteSavedNode: (id) => {
    set((state) => ({
      savedNodes: state.savedNodes.filter((n) => n.id !== id),
    }));
  },
}),
{
  name: 'easyworkflow-storage',
  partialize: (state) => ({
    savedNodes: state.savedNodes,
    language: state.language,
    mcpEnabled: state.mcpEnabled,
    lastTeamId: state.currentTeam?.id,
  }),
}
  )
);
