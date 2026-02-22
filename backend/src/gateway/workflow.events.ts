export interface ExecutionStartedEvent {
  event: 'execution:started';
  executionId: string;
  totalNodes: number;
  nodeOrder: string[];
}

export interface NodeStartedEvent {
  event: 'node:started';
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

export interface NodeCompletedEvent {
  event: 'node:completed';
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  status: 'success' | 'failed';
  duration: number;
  output?: any;
  logs?: string[];
  error?: string;
}

export interface ExecutionCompletedEvent {
  event: 'execution:completed';
  executionId: string;
  status: 'SUCCESS' | 'FAILED';
  duration: number;
  output?: any;
  error?: string;
}

export type WorkflowEvent = 
  | ExecutionStartedEvent 
  | NodeStartedEvent 
  | NodeCompletedEvent 
  | ExecutionCompletedEvent;

export class SubscribeExecutionDto {
  executionId: string;
}

export interface ExecutionProgress {
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
}
