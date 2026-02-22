export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export class User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Team {
  id: string;
  name: string;
  slug: string;
  avatarColor?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: MemberRole;
  joinedAt: Date;
}

export class ApiKey {
  id: string;
  teamId: string;
  workflowId?: string;
  name: string;
  maskedKey: string;
  secretHash: string;
  status: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export class Workflow {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  status: string;
  version: number;
  versionStr: string;
  definition: any;
  runsCount: number;
  successRate: number;
  cronConfig?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowVersion {
  id: string;
  workflowId: string;
  versionStr: string;
  definition: any;
  description?: string;
  authorName: string;
  createdAt: Date;
}

export class Execution {
  id: string;
  workflowId: string;
  teamId: string;
  triggerUserId?: string;
  status: string;
  triggerType: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  inputData?: any;
}

export class ExecutionStep {
  id: string;
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  outputData?: any;
  logs: string[];
  errorMessage?: string;
}
