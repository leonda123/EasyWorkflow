import { create } from 'zustand';
import { WorkflowMetadata, ExecutionLog, DashboardTab, SavedNodeTemplate, NodeData, WorkflowVersionHistory, Team, User, Language, ApiKey } from '../types';

interface AppState {
  currentView: 'dashboard' | 'editor';
  dashboardTab: DashboardTab;
  activeWorkflowId: string | null;
  
  // Auth State
  isAuthenticated: boolean;
  
  // Settings
  language: Language;

  // Team Management State
  currentUser: User;
  currentTeam: Team;
  teams: Team[];
  teamMembers: User[]; // List of members in current team
  
  workflows: WorkflowMetadata[];
  executions: ExecutionLog[];
  savedNodes: SavedNodeTemplate[]; // Favorites list
  apiKeys: ApiKey[]; // Global API Keys
  
  // Actions
  login: (email: string) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  switchTeam: (teamId: string) => void;
  createTeam: (name: string, slug: string) => void;
  inviteMember: (email: string, role: User['role']) => void;
  removeMember: (userId: string) => void;
  
  navigateToEditor: (id: string) => void;
  navigateToDashboard: () => void;
  setDashboardTab: (tab: DashboardTab) => void;
  createWorkflow: () => void;
  deleteWorkflow: (id: string) => void;
  importWorkflow: (data: WorkflowMetadata) => void;
  deployWorkflow: (id: string, version: string, description: string) => void;
  generateWorkflowApiKey: (id: string) => void;
  addExecution: (exec: ExecutionLog) => void;
  
  // API Key Actions
  generateGlobalApiKey: (name: string) => void;
  revokeGlobalApiKey: (id: string) => void;
  
  // Saved Node Actions
  saveNodeTemplate: (nodeData: NodeData, name: string, tags: string[]) => void;
  updateSavedNode: (id: string, updates: Partial<SavedNodeTemplate>) => void;
  deleteSavedNode: (id: string) => void;
}

// Mock Teams
const mockTeams: Team[] = [
    { id: 't1', name: 'Engineering', slug: 'eng', avatar: 'bg-blue-600', membersCount: 3 },
    { id: 't2', name: 'Marketing', slug: 'mkt', avatar: 'bg-purple-600', membersCount: 5 },
    { id: 't3', name: 'Operations', slug: 'ops', avatar: 'bg-orange-600', membersCount: 8 }
];

const mockUser: User = {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@easyflow.com',
    role: 'owner',
    avatar: undefined
};

// Mock Members for initial team
const mockMembers: User[] = [
    mockUser,
    { id: 'u2', name: 'John Smith', email: 'john@easyflow.com', role: 'editor', avatar: undefined },
    { id: 'u3', name: 'Alice Li', email: 'alice@easyflow.com', role: 'viewer', avatar: undefined }
];

const mockHistory: WorkflowVersionHistory[] = [
    { version: '1.0.0', date: '2023-10-25 10:00', author: 'Admin', description: 'Initial Release' },
    { version: '1.1.0', date: '2023-10-26 14:30', author: 'Admin', description: 'Added Webhook Trigger' }
];

const mockWorkflows: WorkflowMetadata[] = [
  {
    id: 'wf-1',
    teamId: 't1', // Engineering
    name: '用户注册流程',
    description: '处理新用户注册，发送欢迎邮件，并同步到 CRM 系统。',
    status: 'active',
    updatedAt: '2 分钟前',
    nodesCount: 5,
    successRate: 98.5,
    runs: 1240,
    version: 1.2,
    versionStr: '1.2.0',
    apiKey: 'wf_key_live_7382...',
    history: mockHistory
  },
  {
    id: 'wf-2',
    teamId: 't2', // Marketing
    name: '周报自动生成器',
    description: '从数据库拉取数据，生成 PDF，并推送到钉钉群。',
    status: 'inactive',
    updatedAt: '3 天前',
    nodesCount: 8,
    successRate: 92.0,
    runs: 45,
    version: 2.0,
    versionStr: '2.0.0',
    history: []
  },
  {
    id: 'wf-3',
    teamId: 't1', // Engineering
    name: '支付回调处理',
    description: '处理 Stripe Webhooks 更新订单状态。',
    status: 'active',
    updatedAt: '1 小时前',
    nodesCount: 4,
    successRate: 99.9,
    runs: 8500,
    version: 3.5,
    versionStr: '3.5.1',
    apiKey: 'wf_key_live_9921...',
    history: []
  },
];

const mockStepLogs = [
    { nodeId: 'n1', nodeLabel: 'Start', status: 'success' as const, duration: 10, logs: ['Received Webhook', 'Parsing Payload...'] },
    { nodeId: 'n2', nodeLabel: 'Process Data', status: 'success' as const, duration: 150, logs: ['Validating Schema...', 'Transforming Data...'] },
    { nodeId: 'n3', nodeLabel: 'Save DB', status: 'success' as const, duration: 240, logs: ['Connecting to PostgreSQL...', 'Insert Success'] },
];

const mockExecutions: ExecutionLog[] = [
  { id: 'ex-1', workflowId: 'wf-1', workflowName: '用户注册流程', status: 'success', startTime: '2023-10-27 10:30:00', duration: 450, trigger: 'webhook', steps: mockStepLogs },
  { id: 'ex-2', workflowId: 'wf-1', workflowName: '用户注册流程', status: 'success', startTime: '2023-10-27 10:25:00', duration: 320, trigger: 'webhook', steps: mockStepLogs },
  { id: 'ex-3', workflowId: 'wf-3', workflowName: '支付回调处理', status: 'failed', startTime: '2023-10-27 09:15:00', duration: 120, trigger: 'webhook', steps: [
      { nodeId: 'n1', nodeLabel: 'Start', status: 'success' as const, duration: 10, logs: ['Received Event'] },
      { nodeId: 'n2', nodeLabel: 'Verify Signature', status: 'failed' as const, duration: 110, logs: ['Error: Invalid Signature'] }
  ] },
  { id: 'ex-4', workflowId: 'wf-2', workflowName: '周报自动生成器', status: 'success', startTime: '2023-10-26 18:00:00', duration: 1500, trigger: 'schedule', steps: mockStepLogs },
  { id: 'ex-5', workflowId: 'wf-1', workflowName: '用户注册流程', status: 'success', startTime: '2023-10-26 14:20:00', duration: 410, trigger: 'manual', steps: mockStepLogs },
];

const mockApiKeys: ApiKey[] = [
    {
        id: 'k1',
        name: 'Default Production Key',
        key: 'sk_live_master_29dk394k203k20k3',
        status: 'active',
        createdAt: '2023-01-15',
        lastUsed: '刚刚'
    },
    {
        id: 'k2',
        name: 'CI/CD Pipeline',
        key: 'sk_live_ci_998234823423423',
        status: 'revoked',
        createdAt: '2023-05-10',
        lastUsed: '2023-06-01'
    }
];

// Mock saved nodes
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

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  dashboardTab: 'workflows',
  activeWorkflowId: null,
  isAuthenticated: false, // Default to false
  language: 'zh', // Default language
  
  currentUser: mockUser,
  currentTeam: mockTeams[0],
  teams: mockTeams,
  teamMembers: mockMembers,
  
  workflows: mockWorkflows,
  executions: mockExecutions,
  savedNodes: mockSavedNodes,
  apiKeys: mockApiKeys,

  login: (email: string) => {
      // Simulate login
      const name = email.split('@')[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      
      set({ 
          isAuthenticated: true,
          currentUser: { ...mockUser, email, name: capitalized }
      });
  },

  logout: () => {
      set({ isAuthenticated: false, currentView: 'dashboard' });
  },

  setLanguage: (lang) => set({ language: lang }),

  inviteMember: (email, role) => {
      const newUser: User = {
          id: `u-${Date.now()}`,
          name: email.split('@')[0],
          email: email,
          role: role,
          avatar: undefined
      };
      
      set(state => ({
          teamMembers: [...state.teamMembers, newUser],
          currentTeam: {
              ...state.currentTeam,
              membersCount: state.currentTeam.membersCount + 1
          },
          teams: state.teams.map(t => 
             t.id === state.currentTeam.id ? { ...t, membersCount: t.membersCount + 1 } : t
          )
      }));
  },

  removeMember: (userId) => {
      set(state => ({
          teamMembers: state.teamMembers.filter(m => m.id !== userId),
          currentTeam: {
              ...state.currentTeam,
              membersCount: Math.max(0, state.currentTeam.membersCount - 1)
          },
          teams: state.teams.map(t => 
             t.id === state.currentTeam.id ? { ...t, membersCount: Math.max(0, t.membersCount - 1) } : t
          )
      }));
  },

  switchTeam: (teamId) => {
      const team = get().teams.find(t => t.id === teamId);
      if (team) {
          set({ currentTeam: team });
          set({ dashboardTab: 'workflows' });
      }
  },

  createTeam: (name, slug) => {
      const colors = ['bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-red-600'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newTeam: Team = {
          id: `t-${Date.now()}`,
          name: name,
          slug: slug,
          avatar: randomColor,
          membersCount: 1
      };
      
      set(state => ({
          teams: [...state.teams, newTeam],
          currentTeam: newTeam,
          dashboardTab: 'workflows',
          // Reset members for new team (just admin)
          teamMembers: [state.currentUser]
      }));
  },

  navigateToEditor: (id) => set({ currentView: 'editor', activeWorkflowId: id }),
  navigateToDashboard: () => set({ currentView: 'dashboard', activeWorkflowId: null }),
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  
  createWorkflow: () => {
    const { currentTeam } = get();
    const newWorkflow: WorkflowMetadata = {
      id: `wf-${Date.now()}`,
      teamId: currentTeam.id,
      name: '未命名工作流',
      description: '新的工作流草稿',
      status: 'draft',
      updatedAt: '刚刚',
      nodesCount: 1,
      successRate: 0,
      runs: 0,
      version: 0.1,
      versionStr: '0.1.0',
      history: []
    };
    set((state) => ({
      workflows: [newWorkflow, ...state.workflows],
      currentView: 'editor',
      activeWorkflowId: newWorkflow.id
    }));
  },

  deleteWorkflow: (id) => {
      set((state) => ({
          workflows: state.workflows.filter(w => w.id !== id),
          currentView: state.activeWorkflowId === id ? 'dashboard' : state.currentView,
          activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId
      }));
  },

  importWorkflow: (data) => {
      const { currentTeam } = get();
      set((state) => ({
          workflows: [{...data, teamId: currentTeam.id}, ...state.workflows]
      }));
  },

  deployWorkflow: (id, version, description) => {
    set((state) => ({
      workflows: state.workflows.map(wf => {
        if (wf.id === id) {
             const newHistoryEntry: WorkflowVersionHistory = {
                 version: version,
                 date: new Date().toLocaleString(),
                 author: state.currentUser.name,
                 description: description,
             };
             
             return { 
                ...wf, 
                status: 'active', 
                updatedAt: '刚刚',
                version: parseFloat(version),
                versionStr: version,
                history: [newHistoryEntry, ...(wf.history || [])]
            };
        }
        return wf;
      })
    }));
  },

  generateWorkflowApiKey: (id) => {
      set((state) => ({
          workflows: state.workflows.map(wf => 
              wf.id === id ? {
                  ...wf,
                  apiKey: `wf_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`
              } : wf
          )
      }));
  },

  generateGlobalApiKey: (name) => {
      const newKey: ApiKey = {
          id: `k-${Date.now()}`,
          name: name,
          key: `sk_live_${Math.random().toString(36).substring(2)}_${Math.random().toString(36).substring(2)}`,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
      };
      set(state => ({ apiKeys: [newKey, ...state.apiKeys] }));
  },

  revokeGlobalApiKey: (id) => {
      set(state => ({
          apiKeys: state.apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' } : k)
      }));
  },

  addExecution: (exec) => {
    set((state) => ({
      executions: [exec, ...state.executions]
    }));
  },

  saveNodeTemplate: (nodeData, name, tags) => {
      const newTemplate: SavedNodeTemplate = {
          id: `tpl-${Date.now()}`,
          name: name,
          tags: tags,
          createdAt: new Date().toISOString().split('T')[0],
          nodeType: nodeData.type,
          data: JSON.parse(JSON.stringify(nodeData)) // Deep copy
      };
      newTemplate.data.label = name; 
      newTemplate.data.status = 'idle' as any;
      newTemplate.data.logs = [];
      newTemplate.data.lastRun = undefined;
      newTemplate.data.duration = undefined;

      set((state) => ({
          savedNodes: [newTemplate, ...state.savedNodes]
      }));
  },

  updateSavedNode: (id, updates) => {
      set((state) => ({
          savedNodes: state.savedNodes.map(node => 
            node.id === id ? { ...node, ...updates } : node
          )
      }));
  },

  deleteSavedNode: (id) => {
      set((state) => ({
          savedNodes: state.savedNodes.filter(n => n.id !== id)
      }));
  }
}));