import { create } from 'zustand';
import {
  Connection,
  EdgeChange,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from '@xyflow/react';
import { WorkflowNode, WorkflowEdge, NodeStatus, NodeType, TraceLog, ExecutionStepLog } from '../types';
import { api } from '../lib/api';
import type { 
  ExecutionStartedEvent, 
  NodeStartedEvent, 
  NodeCompletedEvent, 
  ExecutionCompletedEvent 
} from '../hooks/useWorkflowSocket';

interface FlowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isRunning: boolean;
  hasUnsavedChanges: boolean;
  abortController: AbortController | null;
  currentWorkflowId: string | null;
  currentExecutionId: string | null;
  
  // Clipboard State
  copiedNodes: WorkflowNode[];
  
  // Trace / Console State
  traceLogs: TraceLog[];
  isTraceOpen: boolean;
  tracePosition: 'bottom' | 'right';
  traceWidth: number;

  // Actions
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: WorkflowNode) => void;
  deleteNode: (id: string) => void; // Explicit delete action
  setGraph: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void; // New action for import
  setSelectedNode: (id: string | null) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNode['data']>) => void;
  updateNodeConfig: (id: string, config: Partial<WorkflowNode['data']['config']>) => void;
  setRunning: (isRunning: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  setCurrentWorkflowId: (id: string | null) => void;
  setCurrentExecutionId: (id: string | null) => void;
  stopWorkflow: () => void;
  resetStatuses: () => void;
  markAsSaved: () => void;
  
  // Clipboard Actions
  copySelection: () => void;
  copyNodes: (nodes: WorkflowNode[]) => void; // Allow copying specific nodes
  pasteSelection: (position?: { x: number, y: number }) => void; // Allow pasting at specific pos

  // Execution Action (Moved from Header)
  runWorkflow: (input?: any, targetNodeId?: string, workflowId?: string, teamId?: string) => Promise<{ success: boolean; steps: ExecutionStepLog[]; executionId?: string }>;

  // WebSocket Execution Handlers
  handleExecutionStarted: (event: ExecutionStartedEvent) => void;
  handleNodeStarted: (event: NodeStartedEvent) => void;
  handleNodeCompleted: (event: NodeCompletedEvent) => void;
  handleExecutionCompleted: (event: ExecutionCompletedEvent) => void;

  // Validation Action
  validateWorkflow: () => { valid: boolean; errors: string[] };

  // Trace Actions
  addTraceLog: (log: TraceLog) => void;
  clearTraceLogs: () => void;
  setTraceOpen: (isOpen: boolean) => void;
  setTracePosition: (position: 'bottom' | 'right') => void;
  setTraceWidth: (width: number) => void;
}

const initialNodes: WorkflowNode[] = [
  {
    id: 'start-1',
    type: 'custom',
    position: { x: 50, y: 250 },
    data: { 
      label: 'Start / Webhook', 
      description: 'Waiting for POST request',
      status: NodeStatus.IDLE,
      type: NodeType.START,
      config: {
        triggerType: 'webhook',
      }
    },
  },
  {
    id: 'process-1',
    type: 'custom',
    position: { x: 350, y: 250 },
    data: { 
      label: 'Validate User', 
      description: 'Check input format',
      status: NodeStatus.IDLE, 
      type: NodeType.PROCESS,
      config: {
        code: `// Available variables: $, inputs\nif (!inputs.body.userId) {\n  throw new Error("Missing userId");\n}\nreturn { isValid: true, ts: Date.now() };`
      }
    },
  },
  {
    id: 'api-1',
    type: 'custom',
    position: { x: 650, y: 150 },
    data: { 
      label: 'Fetch User Data', 
      description: 'GET /users/:id',
      status: NodeStatus.IDLE, 
      type: NodeType.API_REQUEST,
      config: {
        method: 'GET',
        url: 'https://api.example.com/users/{{inputs.body.userId}}',
        headers: [{ id: '1', key: 'Authorization', value: 'Bearer {{secrets.API_KEY}}' }],
        params: [],
        body: ''
      }
    },
  },
  {
    id: 'end-1',
    type: 'custom',
    position: { x: 950, y: 250 },
    data: { 
      label: 'Success Response', 
      description: 'Return 200 OK',
      status: NodeStatus.IDLE, 
      type: NodeType.END,
      config: {
        responseBody: '{\n  "success": true,\n  "data": {{steps.api-1.data}}\n}'
      }
    },
  },
];

const initialEdges: WorkflowEdge[] = [
  { 
    id: 'e1-2', 
    source: 'start-1', 
    target: 'process-1', 
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
  },
  { 
    id: 'e2-3', 
    source: 'process-1', 
    target: 'api-1', 
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
  },
  { 
    id: 'e3-4', 
    source: 'api-1', 
    target: 'end-1', 
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
  },
];

// Helper: Replace Variables
const replaceVariables = (text: string, contextNodes: WorkflowNode[]) => {
    let result = text;
    // Regex for {{steps.nodeId.key}}
    const regex = /{{steps\.([a-zA-Z0-9-_]+)\.([a-zA-Z0-9._]+)}}/g;
    
    return result.replace(regex, (match, nodeId, path) => {
        const node = contextNodes.find(n => n.id === nodeId);
        if (node && node.data.status === NodeStatus.SUCCESS) {
            return `[Value from ${node.data.label}]`; 
        }
        return match;
    });
};

// Helper: Find all ancestors for Partial Run
const getAncestors = (targetId: string, edges: WorkflowEdge[]): Set<string> => {
    const ancestors = new Set<string>();
    const queue = [targetId];
    
    // Reverse traversal to find everything upstream
    while(queue.length > 0) {
        const curr = queue.shift()!;
        // Find edges where target is current
        edges.forEach(e => {
            if(e.target === curr && !ancestors.has(e.source)) {
                ancestors.add(e.source);
                queue.push(e.source);
            }
        });
    }
    return ancestors;
};

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  isRunning: false,
  abortController: null,
  currentWorkflowId: null,
  currentExecutionId: null,
  hasUnsavedChanges: false,
  copiedNodes: [], // Clipboard
  traceLogs: [],
  isTraceOpen: false,
  tracePosition: (localStorage.getItem('tracePosition') as 'bottom' | 'right') || 'bottom',
  traceWidth: parseInt(localStorage.getItem('traceWidth') || '400', 10),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      hasUnsavedChanges: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      hasUnsavedChanges: true,
    });
  },

  onConnect: (connection) => {
    const edge = { 
      ...connection, 
      id: `e${connection.source}-${connection.target}-${Date.now()}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    } as WorkflowEdge;
    set({
      edges: addEdge(edge, get().edges),
      hasUnsavedChanges: true,
    });
  },

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      hasUnsavedChanges: true,
    }));
  },

  deleteNode: (id) => {
      set((state) => ({
          nodes: state.nodes.filter(n => n.id !== id),
          edges: state.edges.filter(e => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          hasUnsavedChanges: true,
      }));
  },

  setGraph: (nodes, edges) => {
    set({ nodes, edges, hasUnsavedChanges: true });
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        selected: n.id === id,
      })),
    }));
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
      hasUnsavedChanges: true,
    }));
  },

  updateNodeConfig: (id, config) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return { 
            ...node, 
            data: { 
              ...node.data, 
              config: { ...node.data.config, ...config } 
            } 
          };
        }
        return node;
      }),
      hasUnsavedChanges: true,
    }));
  },

  setRunning: (isRunning) => set({ isRunning }),
  setAbortController: (controller) => set({ abortController: controller }),
  setCurrentWorkflowId: (id) => set({ currentWorkflowId: id }),
  setCurrentExecutionId: (id) => set({ currentExecutionId: id }),
  stopWorkflow: () => {
    const { abortController, addTraceLog, currentWorkflowId } = get();
    if (abortController) {
      abortController.abort();
      addTraceLog({
        id: `trace-sys-stopped`,
        nodeId: 'system',
        nodeLabel: 'System',
        type: NodeType.PROCESS,
        status: 'error',
        startTime: Date.now(),
        message: '工作流执行已手动停止'
      });
    }
    set({ isRunning: false, abortController: null });
  },

  markAsSaved: () => set({ hasUnsavedChanges: false }),

  resetStatuses: () => {
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: NodeStatus.IDLE, logs: [], lastRun: undefined, duration: undefined },
      })),
    }));
  },

  copySelection: () => {
      const selectedNodes = get().nodes.filter(n => n.selected);
      if (selectedNodes.length > 0) {
          set({ copiedNodes: selectedNodes });
      }
  },

  copyNodes: (nodes) => {
      set({ copiedNodes: nodes });
  },

  pasteSelection: (position) => {
      const copied = get().copiedNodes;
      if (copied.length === 0) return;

      // Calculate position offset logic
      let offsetX = 50;
      let offsetY = 50;

      if (position) {
          // If a specific position is requested (e.g. mouse cursor)
          // We align the top-left most node of the copied group to this position
          // Or align the center of the bounding box.
          // Let's use top-left of bounding box for predictable placement.
          const minX = Math.min(...copied.map(n => n.position.x));
          const minY = Math.min(...copied.map(n => n.position.y));
          
          offsetX = position.x - minX;
          offsetY = position.y - minY;
      }

      const newNodes = copied.map(node => {
          // Deep Clone Data
          const newData = JSON.parse(JSON.stringify(node.data));
          // Reset runtime status
          newData.status = NodeStatus.IDLE;
          newData.logs = [];
          newData.lastRun = undefined;
          newData.duration = undefined;

          // Re-generate IDs in config to avoid key collisions
          if (newData.config && Array.isArray(newData.config.headers)) {
              newData.config.headers = newData.config.headers.map((h: any) => ({ ...h, id: `h-${Date.now()}-${Math.random()}` }));
          }
          if (newData.config && Array.isArray(newData.config.params)) {
              newData.config.params = newData.config.params.map((p: any) => ({ ...p, id: `p-${Date.now()}-${Math.random()}` }));
          }

          return {
              ...node,
              id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              // Apply offset to original position
              position: position 
                  ? { x: node.position.x + offsetX, y: node.position.y + offsetY }
                  : { x: node.position.x + 50, y: node.position.y + 50 }, 
              data: newData,
              selected: true // Select pasted nodes
          };
      });

      // Deselect existing
      const existingNodes = get().nodes.map(n => ({...n, selected: false}));

      set({
          nodes: [...existingNodes, ...newNodes]
      });
      
      // Select the first new node for convenience
      if(newNodes.length > 0) {
        get().setSelectedNode(newNodes[0].id);
      }
  },

  runWorkflow: async (input?: any, targetNodeId?: string, workflowId?: string, teamId?: string) => {
      const { nodes, updateNodeData, resetStatuses, addTraceLog, clearTraceLogs, setRunning, setTraceOpen, setCurrentWorkflowId, setCurrentExecutionId } = get();
      
      if (get().isRunning) return { success: false, steps: [] };

      if (!workflowId) {
        addTraceLog({
          id: `trace-sys-error`,
          nodeId: 'system',
          nodeLabel: 'System',
          type: NodeType.PROCESS,
          status: 'error',
          startTime: Date.now(),
          message: '错误: 工作流 ID 为空，请先保存工作流'
        });
        return { success: false, steps: [] };
      }

      if (!teamId) {
        addTraceLog({
          id: `trace-sys-error`,
          nodeId: 'system',
          nodeLabel: 'System',
          type: NodeType.PROCESS,
          status: 'error',
          startTime: Date.now(),
          message: '错误: 团队 ID 为空，请选择团队'
        });
        return { success: false, steps: [] };
      }

      setRunning(true);
      setCurrentWorkflowId(workflowId);
      resetStatuses();
      clearTraceLogs();
      setTraceOpen(true);

      try {
        const result = await api.workflows.run(
          teamId,
          workflowId,
          input,
          targetNodeId
        );
        
        if (get().currentWorkflowId !== workflowId) {
          setRunning(false);
          return { success: false, steps: [] };
        }

        setCurrentExecutionId(result.executionId);

        addTraceLog({
            id: `trace-sys-started-${Date.now()}`,
            nodeId: 'system',
            nodeLabel: 'System',
            type: NodeType.PROCESS,
            status: 'success',
            startTime: Date.now(),
            message: `执行已启动 (ID: ${result.executionId.slice(0, 8)}...)`
        });

        return { 
          success: result.status === 'SUCCESS', 
          steps: result.steps || [], 
          executionId: result.executionId,
          output: result.output
        };

      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || '未知错误';
        
        addTraceLog({
            id: `trace-sys-error-${Date.now()}`,
            nodeId: 'system',
            nodeLabel: 'System',
            type: NodeType.PROCESS,
            status: 'error',
            startTime: Date.now(),
            message: `启动失败: ${errorMessage}`
        });
        
        setRunning(false);
        return { success: false, steps: [] };
      }
  },

  handleExecutionStarted: (event: ExecutionStartedEvent) => {
    const { setCurrentExecutionId } = get();
    setCurrentExecutionId(event.executionId);
  },

  handleNodeStarted: (event: NodeStartedEvent) => {
    const { updateNodeData } = get();
    updateNodeData(event.nodeId, { 
      status: NodeStatus.RUNNING 
    });
  },

  handleNodeCompleted: (event: NodeCompletedEvent) => {
    const { updateNodeData, addTraceLog, nodes } = get();
    updateNodeData(event.nodeId, { 
      status: event.status === 'success' ? NodeStatus.SUCCESS : NodeStatus.ERROR,
      duration: event.duration,
      logs: event.logs
    });
    
    const logId = `trace-${event.nodeId}-${Date.now()}`;
    const node = nodes.find(n => n.id === event.nodeId);
    addTraceLog({
      id: logId,
      nodeId: event.nodeId,
      nodeLabel: event.nodeLabel || node?.data?.label || 'Unknown',
      type: node?.data?.type as any || NodeType.PROCESS,
      status: event.status === 'success' ? 'success' : 'error',
      startTime: Date.now(),
      duration: event.duration,
      message: event.status === 'success' 
        ? `执行成功 (${event.duration}ms)` 
        : `执行失败: ${event.error || '未知错误'}`,
      output: event.output,
      logs: event.logs
    });
  },

  handleExecutionCompleted: (event: ExecutionCompletedEvent) => {
    const { addTraceLog, setRunning, setCurrentExecutionId, traceLogs } = get();
    setRunning(false);
    setCurrentExecutionId(null);
    
    const logId = `trace-sys-done-${Date.now()}`;
    if (event.status === 'SUCCESS') {
      addTraceLog({
        id: logId,
        nodeId: 'system',
        nodeLabel: 'System',
        type: NodeType.PROCESS,
        status: 'success',
        startTime: Date.now(),
        duration: event.duration,
        message: `工作流执行完成，耗时 ${event.duration}ms`
      });
    } else {
      addTraceLog({
        id: `trace-sys-error-${Date.now()}`,
        nodeId: 'system',
        nodeLabel: 'System',
        type: NodeType.PROCESS,
        status: 'error',
        startTime: Date.now(),
        message: `执行失败: ${event.error || '未知错误'}`
      });
    }
  },

  validateWorkflow: () => {
      const { nodes, edges } = get();
      const errors: string[] = [];
      
      if (nodes.length === 0) {
        errors.push('工作流为空，请添加节点');
        return { valid: false, errors };
      }
      
      const startNodes = nodes.filter(n => n.data.type === NodeType.START);
      if (startNodes.length === 0) {
        errors.push('缺少触发器节点 (Start)');
      }
      
      const endNodes = nodes.filter(n => n.data.type === NodeType.END);
      if (endNodes.length === 0) {
        errors.push('缺少结束节点 (End)');
      }
      
      const connectedNodeIds = new Set<string>();
      edges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });
      
      const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id) && nodes.length > 1);
      if (orphanNodes.length > 0) {
        errors.push(`存在 ${orphanNodes.length} 个未连接的节点: ${orphanNodes.map(n => n.data.label).join(', ')}`);
      }
      
      startNodes.forEach(node => {
        const hasOutgoingEdge = edges.some(e => e.source === node.id);
        if (!hasOutgoingEdge && nodes.length > 1) {
          errors.push(`触发器节点 "${node.data.label}" 没有连接到任何节点`);
        }
      });
      
      endNodes.forEach(node => {
        const hasIncomingEdge = edges.some(e => e.target === node.id);
        if (!hasIncomingEdge && nodes.length > 1) {
          errors.push(`结束节点 "${node.data.label}" 没有任何输入连接`);
        }
      });
      
      nodes.forEach(node => {
        if (node.data.type === NodeType.API_REQUEST) {
          if (!node.data.config?.url) {
            errors.push(`API 节点 "${node.data.label}" 缺少 URL 配置`);
          }
        }
        if (node.data.type === NodeType.LLM) {
          const llmConfig = node.data.config?.llmConfig;
          const useServerConfig = llmConfig?.useServerConfig !== false;
          
          if (useServerConfig) {
            if (!llmConfig?.configId) {
              errors.push(`LLM 节点 "${node.data.label}" 未选择服务端配置`);
            }
          } else {
            if (!llmConfig?.apiKey || !llmConfig?.model || !llmConfig?.baseUrl) {
              errors.push(`LLM 节点 "${node.data.label}" 自定义配置不完整`);
            }
          }
        }
        if (node.data.type === NodeType.DB_QUERY) {
          const dbConfig = node.data.config?.dbConfig;
          if (dbConfig?.useConnectionString) {
            if (!dbConfig.connectionString) {
              errors.push(`数据库节点 "${node.data.label}" 缺少连接字符串`);
            }
          } else {
            if (!dbConfig?.host || !dbConfig?.database || !dbConfig?.username) {
              errors.push(`数据库节点 "${node.data.label}" 连接配置不完整`);
            }
          }
        }
      });
      
      return { valid: errors.length === 0, errors };
  },

  addTraceLog: (log) => set((state) => ({ traceLogs: [...state.traceLogs, log] })),
  clearTraceLogs: () => set({ traceLogs: [] }),
  setTraceOpen: (isOpen) => set({ isTraceOpen: isOpen }),
  setTracePosition: (position) => {
    localStorage.setItem('tracePosition', position);
    set({ tracePosition: position });
  },
  setTraceWidth: (width) => {
    localStorage.setItem('traceWidth', width.toString());
    set({ traceWidth: width });
  },
}));