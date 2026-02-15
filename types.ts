import { Node, Edge } from '@xyflow/react';

export type Language = 'zh' | 'en';

export enum NodeType {
  START = 'start',
  PROCESS = 'process',
  API_REQUEST = 'api',
  CONDITION = 'condition',
  LLM = 'llm', 
  DELAY = 'delay', // New: Delay/Wait
  DB_QUERY = 'db', // New: Database SQL
  END = 'end',
}

export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  SKIPPED = 'skipped', // Added SKIPPED status
}

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

export interface FormField {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'boolean' | 'select' | 'textarea' | 'file'; // Added 'file'
    required: boolean;
    placeholder?: string;
    options?: string; // Comma separated for select
    multiple?: boolean; // Added for file input
}

export interface NodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  status: NodeStatus;
  type: NodeType; 
  
  // Node Specific Configurations
  config: {
    // HTTP Request
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    authType?: 'none' | 'bearer' | 'basic' | 'oauth2';
    authConfig?: {
        token?: string;
        username?: string;
        password?: string;
        // OAuth 2.0
        clientId?: string;
        clientSecret?: string;
        accessTokenUrl?: string;
        scope?: string;
        grantType?: 'client_credentials' | 'authorization_code';
    };
    headers?: KeyValuePair[];
    params?: KeyValuePair[];
    body?: string; // JSON string
    preRequestScript?: string; // JavaScript code running before request
    testScript?: string; // JavaScript code running after response
    
    // Process (JS Sandbox)
    code?: string;
    
    // Condition
    conditionExpression?: string; // JS Expression returning boolean
    
    // LLM (OpenAI Compatible)
    llmConfig?: {
        provider?: 'openai' | 'azure' | 'custom';
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        temperature?: number;
        systemPrompt?: string;
        userPrompt?: string;
        maxTokens?: number;
        responseFormat?: 'text' | 'json'; // New: JSON Mode
    };

    // Delay
    delayConfig?: {
        duration: number; // Value
        unit: 'ms' | 'seconds' | 'minutes'; // Multiplier
    };

    // Database
    dbConfig?: {
        type?: 'mysql' | 'postgres' | 'mssql';
        connectionString?: string;
        query?: string; // SQL
    };
    
    // Start / Trigger
    triggerType?: 'webhook' | 'schedule' | 'form' | 'manual';
    cronExpression?: string;
    // For Webhook
    webhookMethod?: 'POST' | 'GET' | 'PUT'; 
    // For Form
    formTitle?: string;
    formDescription?: string;
    formFields?: FormField[];
    
    // End
    responseBody?: string;
    responseStatus?: number; // New: HTTP Status Code
    
    // Common
    timeout?: number;
    retries?: number;
  };
  
  logs?: string[];
  lastRun?: string;
  duration?: number;
}

export type WorkflowNode = Node<NodeData>;
export type WorkflowEdge = Edge;

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
}

export interface WorkflowVersionHistory {
    version: string;
    date: string;
    author: string;
    description: string;
    snapshot?: {
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
    };
}

// Team & User Interfaces
export interface Team {
    id: string;
    name: string;
    slug: string;
    avatar?: string; // Color or Image URL
    membersCount: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
}

// Global API Key Interface
export interface ApiKey {
    id: string;
    name: string; // Label/Description
    key: string; // The secret key
    status: 'active' | 'revoked';
    createdAt: string;
    lastUsed?: string;
}

// New Interface for Dashboard
export interface WorkflowMetadata {
  id: string;
  teamId: string; // Belonging Team
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  updatedAt: string;
  nodesCount: number;
  successRate: number;
  runs: number;
  version: number; // Keep numerical for simple checks, or allow string
  versionStr: string; // Display string like "1.2.0"
  apiKey?: string; // Workflow-level API Key
  
  // Optional graph data for persistent storage/export from dashboard
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  
  // History
  history?: WorkflowVersionHistory[];
}

export interface ExecutionStepLog {
    nodeId: string;
    nodeLabel: string;
    status: 'success' | 'failed' | 'skipped';
    duration: number;
    logs: string[];
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startTime: string;
  duration: number;
  trigger: 'manual' | 'webhook' | 'schedule' | 'partial'; // Added 'partial'
  steps?: ExecutionStepLog[]; // Detailed logs
}

// New Interface for Real-time Trace Panel
export interface TraceLog {
    id: string;
    nodeId: string;
    nodeLabel: string;
    type: NodeType;
    status: 'running' | 'success' | 'error' | 'skipped';
    startTime: number;
    duration?: number;
    message?: string;
}

// Saved/Favorited Node Template
export interface SavedNodeTemplate {
    id: string;
    name: string; // Custom name for the saved item
    tags: string[];
    createdAt: string;
    nodeType: NodeType;
    data: NodeData; // The full configuration to restore
}

export type DashboardTab = 'workflows' | 'executions' | 'settings';