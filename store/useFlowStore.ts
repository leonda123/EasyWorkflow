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

interface FlowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isRunning: boolean;
  
  // Clipboard State
  copiedNodes: WorkflowNode[];
  
  // Trace / Console State
  traceLogs: TraceLog[];
  isTraceOpen: boolean;

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
  resetStatuses: () => void;
  
  // Clipboard Actions
  copySelection: () => void;
  copyNodes: (nodes: WorkflowNode[]) => void; // Allow copying specific nodes
  pasteSelection: (position?: { x: number, y: number }) => void; // Allow pasting at specific pos

  // Execution Action (Moved from Header)
  runWorkflow: (targetNodeId?: string) => Promise<{ success: boolean; steps: ExecutionStepLog[] }>;

  // Trace Actions
  addTraceLog: (log: TraceLog) => void;
  clearTraceLogs: () => void;
  setTraceOpen: (isOpen: boolean) => void;
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
  copiedNodes: [], // Clipboard
  traceLogs: [],
  isTraceOpen: false,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
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
    });
  },

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },

  deleteNode: (id) => {
      set((state) => ({
          nodes: state.nodes.filter(n => n.id !== id),
          edges: state.edges.filter(e => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
      }));
  },

  setGraph: (nodes, edges) => {
    set({ nodes, edges });
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
    }));
  },

  setRunning: (isRunning) => set({ isRunning }),

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

  runWorkflow: async (targetNodeId?: string) => {
      const { nodes, edges, updateNodeData, resetStatuses, addTraceLog, clearTraceLogs, setRunning, setTraceOpen } = get();
      
      if (get().isRunning) return { success: false, steps: [] };

      setRunning(true);
      resetStatuses();
      clearTraceLogs();
      setTraceOpen(true);

      const startTime = Date.now();
      let hasCriticalError = false;
      const executionSteps: ExecutionStepLog[] = [];

      // --- 0. Calculate Nodes to Run (Partial Run Logic) ---
      let allowedNodes = new Set<string>();
      if (targetNodeId) {
          const ancestors = getAncestors(targetNodeId, edges);
          allowedNodes = ancestors;
          allowedNodes.add(targetNodeId);
          
          addTraceLog({
              id: `trace-sys-init`,
              nodeId: 'system',
              nodeLabel: 'System',
              type: NodeType.PROCESS,
              status: 'success',
              startTime: Date.now(),
              message: `分段运行模式：将只执行 ${allowedNodes.size} 个节点。`
          });
      }

      // --- 1. Build Graph Dependencies ---
      const adjacency = new Map<string, string[]>(); 
      const inDegree = new Map<string, number>();

      nodes.forEach(node => {
          adjacency.set(node.id, []);
          inDegree.set(node.id, 0);
      });

      edges.forEach(edge => {
          const children = adjacency.get(edge.source) || [];
          children.push(edge.target);
          adjacency.set(edge.source, children);

          const currentInDegree = inDegree.get(edge.target) || 0;
          inDegree.set(edge.target, currentInDegree + 1);
      });

      // --- 2. Identify Start Nodes ---
      let readyQueue: WorkflowNode[] = nodes.filter(node => (inDegree.get(node.id) || 0) === 0);
      if (readyQueue.length === 0) {
          readyQueue = nodes.filter(n => n.data.type === 'start');
      }

      // --- 3. Execution Loop ---
      while (readyQueue.length > 0) {
          if (hasCriticalError) break;

          const currentBatch = [...readyQueue];
          readyQueue = []; 
          
          const nextLevelCandidates = new Set<string>();

          await Promise.all(currentBatch.map(async (node) => {
               if (hasCriticalError) return;

               // **PARTIAL RUN CHECK**
               if (targetNodeId && !allowedNodes.has(node.id)) {
                   // Skip execution, but satisfy children dependencies if necessary?
                   // No, if a parent is skipped (because it's not in the path), the children shouldn't run either in a partial run scenario 
                   // UNLESS they are part of the path.
                   // But getAncestors ensures we only select nodes that ARE strictly upstream.
                   // Nodes that are NOT upstream and NOT the target are effectively "downstream" or "parallel unrelated branches".
                   // We just skip them.
                   return;
               }

               const stepStartTime = Date.now();
               updateNodeData(node.id, { status: NodeStatus.RUNNING, lastRun: new Date().toISOString() });
               
               addTraceLog({
                  id: `trace-${node.id}-start`,
                  nodeId: node.id,
                  nodeLabel: node.data.label,
                  type: node.data.type,
                  status: 'running',
                  startTime: stepStartTime,
                  message: '开始执行...'
               });

               let logs: string[] = [];

               // --- Node Logic Simulation (Copied from Header) ---
               if (node.data.type === NodeType.LLM) {
                   const config = node.data.config.llmConfig;
                   const sysPrompt = replaceVariables(config?.systemPrompt || '', get().nodes);
                   
                   addTraceLog({
                      id: `trace-${node.id}-llm-prompt`,
                      nodeId: node.id,
                      nodeLabel: node.data.label,
                      type: node.data.type,
                      status: 'running',
                      startTime: Date.now(),
                      message: `Sending prompt to ${config?.provider || 'OpenAI'}...`
                   });
                   await new Promise(r => setTimeout(r, 1500));
                   logs = [
                       `[INFO] Provider: ${config?.provider || 'openai'}`,
                       `[INFO] Model: ${config?.model || 'gpt-3.5-turbo'}`,
                       `[SUCCESS] AI Response received.`
                   ];
               } else if (node.data.type === NodeType.DELAY) {
                   const dConfig = node.data.config.delayConfig || { duration: 1, unit: 'seconds' };
                   let ms = dConfig.duration;
                   if (dConfig.unit === 'seconds') ms *= 1000;
                   if (dConfig.unit === 'minutes') ms *= 60000;
                   
                   addTraceLog({
                      id: `trace-${node.id}-delay-start`,
                      nodeId: node.id,
                      nodeLabel: node.data.label,
                      type: node.data.type,
                      status: 'running',
                      startTime: Date.now(),
                      message: `Waiting for ${dConfig.duration} ${dConfig.unit}...`
                   });
                   await new Promise(r => setTimeout(r, ms));
                   logs = [`[INFO] Sleep finished (${ms}ms).`];
               } else if (node.data.type === NodeType.DB_QUERY) {
                   const dbConfig = node.data.config.dbConfig;
                   const query = replaceVariables(dbConfig?.query || '', get().nodes);
                   addTraceLog({
                      id: `trace-${node.id}-db-query`,
                      nodeId: node.id,
                      nodeLabel: node.data.label,
                      type: node.data.type,
                      status: 'running',
                      startTime: Date.now(),
                      message: `Executing SQL: ${query.substring(0, 30)}...`
                   });
                   await new Promise(r => setTimeout(r, 1000)); 
                   logs = [
                       `[INFO] Connecting to ${dbConfig?.type || 'postgres'}...`,
                       `[SUCCESS] 5 rows affected.`
                   ];
               } else if (node.data.type === NodeType.API_REQUEST) {
                   logs.push(`[INFO] Preparing request...`);
                   if (node.data.config.preRequestScript) {
                       logs.push(`[SCRIPT] Executing pre-request script...`);
                       await new Promise(r => setTimeout(r, 100)); 
                   }
                   if (node.data.config.authType === 'oauth2') {
                       logs.push(`[AUTH] Fetching OAuth2 token...`);
                       await new Promise(r => setTimeout(r, 500)); 
                       logs.push(`[AUTH] Token acquired.`);
                   }
                   await new Promise(r => setTimeout(r, 1000));
                   logs.push(`[INFO] Response status: 200 OK`);
                   if (node.data.config.testScript) {
                       logs.push(`[SCRIPT] Executing test script...`);
                       await new Promise(r => setTimeout(r, 100)); 
                       logs.push(`[TEST] Assertions passed.`);
                   }
                   logs.push(`[SUCCESS] Request completed.`);
               } else {
                   await new Promise(r => setTimeout(r, 800));
                   logs = [`[INFO] 执行业务逻辑...`, `[SUCCESS] 完成.`];
               }

               const isSuccess = Math.random() > 0.05; 
               const duration = Math.floor(Date.now() - stepStartTime);
               
               if (!isSuccess) {
                   logs.push(`[ERROR] 发生未知错误.`);
                   hasCriticalError = true;
               }

               updateNodeData(node.id, { 
                  status: isSuccess ? NodeStatus.SUCCESS : NodeStatus.ERROR,
                  duration: duration,
                  logs: logs
               });

               executionSteps.push({
                  nodeId: node.id,
                  nodeLabel: node.data.label,
                  status: isSuccess ? 'success' : 'failed',
                  duration: duration,
                  logs: logs
               });

               addTraceLog({
                  id: `trace-${node.id}-end`,
                  nodeId: node.id,
                  nodeLabel: node.data.label,
                  type: node.data.type,
                  status: isSuccess ? 'success' : 'error',
                  startTime: Date.now(),
                  duration: duration,
                  message: isSuccess ? '执行成功。' : '执行异常，流程终止。'
               });

               if (isSuccess) {
                   // If this was the target node, we stop propagating to children
                   if (targetNodeId && node.id === targetNodeId) {
                        return;
                   }

                   const children = adjacency.get(node.id) || [];
                   children.forEach(childId => {
                       const currentDegree = inDegree.get(childId)!;
                       const newDegree = currentDegree - 1;
                       inDegree.set(childId, newDegree);
                       
                       if (newDegree === 0) {
                           nextLevelCandidates.add(childId);
                       }
                   });
               }
          }));

          const nextNodes = Array.from(nextLevelCandidates)
              .map(id => nodes.find(n => n.id === id))
              .filter((n): n is WorkflowNode => !!n);
              
          readyQueue = nextNodes;
      }

      setRunning(false);
      return { success: !hasCriticalError, steps: executionSteps };
  },

  addTraceLog: (log) => set((state) => ({ traceLogs: [...state.traceLogs, log] })),
  clearTraceLogs: () => set({ traceLogs: [] }),
  setTraceOpen: (isOpen) => set({ isTraceOpen: isOpen }),
}));