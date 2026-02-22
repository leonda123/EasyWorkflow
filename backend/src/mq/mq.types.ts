export interface MqConfigDto {
  host: string;
  port: number;
  username: string;
  password?: string;
  vhost: string;
  enabled: boolean;
  maxRetries?: number;
  retryDelay?: number;
  prefetchCount?: number;
  messageTtl?: number;
}

export interface MqConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    host: string;
    port: number;
    vhost: string;
  };
}

export interface MqStatus {
  enabled: boolean;
  connected: boolean;
  queueLength: number;
  lastCheckAt?: Date;
}

export interface WorkflowExecuteMessage {
  executionId: string;
  workflowId: string;
  teamId: string;
  triggerData: any;
  timestamp: number;
}

export interface WorkflowCallbackMessage {
  executionId: string;
  status: 'SUCCESS' | 'FAILED';
  result?: any;
  error?: string;
  timestamp: number;
}

export const QUEUE_NAMES = {
  WORKFLOW_EXECUTE: 'workflow.execute',
  WORKFLOW_CALLBACK: 'workflow.callback',
  WORKFLOW_DELAYED: 'workflow.delayed',
} as const;
