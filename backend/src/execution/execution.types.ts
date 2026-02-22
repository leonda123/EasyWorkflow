export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: string;
    config: any;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface LoopContext {
  item: any;
  index: number;
  count: number;
  first: boolean;
  last: boolean;
  iteration: number;
  results: any[];
}

export interface LoopConfig {
  mode: 'count' | 'array' | 'condition';
  count?: number;
  countPath?: string;
  arrayPath?: string;
  conditionExpression?: string;
  maxIterations?: number;
  loopVariable?: string;
  indexVariable?: string;
  parallel?: boolean;
  concurrency?: number;
  continueOnError?: boolean;
  loopBodyNodes?: string[];
  collectOutputs?: boolean;
  outputVariable?: string;
}

export interface ExecutionContext {
  trigger: {
    body: any;
    headers: any;
    query: any;
  };
  steps: {
    [nodeId: string]: any;
  };
  globals: any;
  loop?: LoopContext;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  input?: any;
  error?: string;
  logs: string[];
}

export interface ExecutionStepResult {
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
}

export interface ExecutionResult {
  executionId: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  steps: ExecutionStepResult[];
  output?: any;
  duration: number;
  error?: string;
}

export interface TraceLog {
  id: string;
  nodeId: string;
  nodeLabel: string;
  type: string;
  status: 'running' | 'success' | 'error' | 'skipped';
  startTime: number;
  duration?: number;
  message?: string;
}
