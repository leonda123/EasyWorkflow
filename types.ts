import { Node, Edge } from '@xyflow/react';

export type Language = 'zh' | 'en';

export type UserRole = 'user' | 'super_admin';

export enum NodeType {
  START = 'start',
  PROCESS = 'process',
  API_REQUEST = 'api',
  CONDITION = 'condition',
  LLM = 'llm', 
  DELAY = 'delay',
  DB_QUERY = 'db',
  END = 'end',
  PRESET_DATA = 'preset_data',
  WORKFLOW_CALL = 'workflow_call',
  FILE_PARSER = 'file_parser',
  LOOP = 'loop',
}

export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  SKIPPED = 'skipped',
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
    type: 'text' | 'number' | 'email' | 'boolean' | 'select' | 'textarea' | 'file';
    required: boolean;
    placeholder?: string;
    options?: string;
    multiple?: boolean;
}

export interface NodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  status: NodeStatus;
  type: NodeType; 
  
  config: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    authType?: 'none' | 'bearer' | 'basic' | 'oauth2';
    authConfig?: {
        token?: string;
        username?: string;
        password?: string;
        clientId?: string;
        clientSecret?: string;
        accessTokenUrl?: string;
        scope?: string;
        grantType?: 'client_credentials' | 'authorization_code';
    };
    headers?: KeyValuePair[];
    params?: KeyValuePair[];
    body?: string;
    preRequestScript?: string;
    testScript?: string;
    
    code?: string;
    aiGenerated?: boolean;
    aiPrompt?: string;
    aiExplanation?: string;
    
    conditionExpression?: string;
    
    llmConfig?: {
        provider?: 'openai' | 'azure' | 'custom';
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        temperature?: number;
        systemPrompt?: string;
        userPrompt?: string;
        maxTokens?: number;
        responseFormat?: 'text' | 'json';
        useServerConfig?: boolean;
        configId?: string;
    };

    delayConfig?: {
        duration: number;
        unit: 'ms' | 'seconds' | 'minutes';
    };

    dbConfig?: {
        type?: 'mysql' | 'postgresql' | 'mssql';
        connectionName?: string;
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        connectionString?: string;
        query?: string;
        useConnectionString?: boolean;
    };
    
    triggerType?: 'webhook' | 'schedule' | 'form' | 'manual';
    cronExpression?: string;
    webhookMethod?: 'POST' | 'GET' | 'PUT'; 
    formTitle?: string;
    formDescription?: string;
    formFields?: FormField[];
    
    responseBody?: string;
    responseStatus?: number;
    
    timeout?: number;
    retries?: number;
    
    presetData?: any;
    presetDataConfig?: PresetDataConfig;
    
    conditionConfig?: ConditionConfig;
    
    outputConfig?: ProcessOutputConfig;
    
    targetWorkflowId?: string;
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
    
    fileParserConfig?: FileParserConfig;
    
    loopConfig?: LoopConfig;
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

export interface Team {
    id: string;
    name: string;
    slug: string;
    avatar?: string;
    membersCount: number;
    role?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    systemRole?: UserRole;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: UserRole;
    isActive: boolean;
    teamsCount?: number;
    ownedTeamsCount?: number;
    executionsCount?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    status: 'active' | 'revoked';
    createdAt: string;
    lastUsed?: string;
}

export interface WorkflowMetadata {
  id: string;
  teamId: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  updatedAt: string;
  nodesCount: number;
  successRate: number;
  runs: number;
  version: number;
  versionStr: string;
  apiKey?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  history?: WorkflowVersionHistory[];
  definition?: any;
}

export interface ExecutionStepLog {
    nodeId: string;
    nodeLabel: string;
    status: 'success' | 'failed' | 'skipped';
    duration: number;
    logs: string[];
    input?: any;
    output?: any;
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startTime: string;
  duration: number;
  trigger: 'manual' | 'webhook' | 'schedule' | 'partial';
  steps?: ExecutionStepLog[];
  input?: any;
  output?: any;
}

export interface TraceLog {
    id: string;
    nodeId: string;
    nodeLabel: string;
    type: NodeType;
    status: 'running' | 'success' | 'error' | 'skipped';
    startTime: number;
    duration?: number;
    message?: string;
    input?: any;
    output?: any;
    logs?: string[];
}

export interface SavedNodeTemplate {
    id: string;
    name: string;
    tags: string[];
    createdAt: string;
    nodeType: NodeType;
    data: NodeData;
}

export type DashboardTab = 'workflows' | 'deployments' | 'executions' | 'settings' | 'admin';

export interface DeploymentInfo {
    id: string;
    workflowId: string;
    workflowName: string;
    description?: string;
    version: string;
    status: 'active' | 'inactive';
    publishedAt: string;
    publishedBy: string;
    totalCalls: number;
    successRate: number;
    avgDuration: number;
    lastCalledAt?: string;
    webhookUrl: string;
    apiKey?: string;
    definition?: { nodes: any[]; edges: any[] };
}

export interface WorkflowStats {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    successRate: number;
    avgDuration: number;
    callsByDay: { date: string; calls: number }[];
}

export interface SystemStats {
    users: {
        total: number;
        active: number;
        superAdmins: number;
    };
    teams: number;
    workflows: number;
    executions: number;
}

export interface LlmConfig {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    isActive: boolean;
    isDefault: boolean;
    maxTokens: number;
    temperature: number;
    createdAt: string;
    updatedAt: string;
}

export interface LlmProvider {
    id: string;
    name: string;
    baseUrl: string;
    models: string[];
}

export type ConditionOperator = 
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'startsWith'
  | 'endsWith'
  | 'inArray'
  | 'notInArray';

export type ConditionValueType = 'string' | 'number' | 'boolean' | 'variable';

export interface ConditionRule {
  id: string;
  variablePath: string;
  variableLabel?: string;
  operator: ConditionOperator;
  value: string;
  valueType: ConditionValueType;
}

export interface ConditionGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: ConditionRule[];
}

export interface ConditionBranch {
  id: string;
  label: string;
  type: 'if' | 'else_if' | 'else';
  condition?: string;
  order: number;
  handleId: string;
}

export interface ConditionConfig {
  mode: 'expression' | 'builder';
  expression?: string;
  groups?: ConditionGroup[];
  branches?: ConditionBranch[];
  defaultBranch?: string;
}

export type OutputVariableType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface OutputVariable {
  id: string;
  name: string;
  type: OutputVariableType;
  description?: string;
  sourcePath?: string;
  defaultValue?: any;
}

export interface ProcessOutputConfig {
  mode: 'auto' | 'custom';
  variables?: OutputVariable[];
}

export type PresetFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface PresetField {
  id: string;
  key: string;
  type: PresetFieldType;
  value: string;
  isVariable: boolean;
}

export interface PresetDataConfig {
  mode: 'static' | 'dynamic';
  fields?: PresetField[];
  presetData?: any;
}

export interface FileParserConfig {
  fileSource: string;
  outputFormat: 'text' | 'structured';
  extractMetadata: boolean;
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
