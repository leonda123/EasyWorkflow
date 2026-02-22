import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole, WorkflowStatus } from '@prisma/client';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  DeployWorkflowDto,
  ImportWorkflowDto,
  RunWorkflowDto,
} from './workflow.dto';

interface WorkflowDefinition {
  nodes: any[];
  edges: any[];
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, teamId: string, dto: CreateWorkflowDto) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR]);

    return this.prisma.workflow.create({
      data: {
        teamId,
        name: dto.name,
        description: dto.description,
        definition: dto.definition || { nodes: [], edges: [] },
        status: WorkflowStatus.DRAFT,
      },
    });
  }

  async findAll(userId: string, teamId: string) {
    await this.checkTeamAccess(userId, teamId);

    const workflows = await this.prisma.workflow.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return workflows.map((w) => {
      const definition = w.definition as unknown as WorkflowDefinition;
      return {
        id: w.id,
        teamId: w.teamId,
        name: w.name,
        description: w.description,
        status: w.status.toLowerCase(),
        version: w.version,
        versionStr: w.versionStr,
        runsCount: w.runsCount,
        successRate: w.successRate,
        nodesCount: this.countNodes(definition),
        updatedAt: w.updatedAt,
        createdAt: w.createdAt,
        history: w.versions.map((v) => ({
          version: v.versionStr,
          date: v.createdAt,
          author: v.authorName,
          description: v.description,
          snapshot: v.definition,
        })),
      };
    });
  }

  async findOne(userId: string, teamId: string, workflowId: string) {
    await this.checkTeamAccess(userId, teamId);

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow || workflow.teamId !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    const definition = workflow.definition as unknown as WorkflowDefinition;

    return {
      id: workflow.id,
      teamId: workflow.teamId,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status.toLowerCase(),
      version: workflow.version,
      versionStr: workflow.versionStr,
      definition: workflow.definition,
      runsCount: workflow.runsCount,
      successRate: workflow.successRate,
      cronConfig: workflow.cronConfig,
      nodes: definition?.nodes || [],
      edges: definition?.edges || [],
      history: workflow.versions.map((v) => ({
        version: v.versionStr,
        date: v.createdAt,
        author: v.authorName,
        description: v.description,
        snapshot: v.definition,
      })),
      updatedAt: workflow.updatedAt,
      createdAt: workflow.createdAt,
    };
  }

  async update(userId: string, teamId: string, workflowId: string, dto: UpdateWorkflowDto) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR]);

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.teamId !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    const definition = dto.definition as unknown as WorkflowDefinition;

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...dto,
        cronConfig: this.extractCronConfig(definition),
      },
    });
  }

  async delete(userId: string, teamId: string, workflowId: string) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.teamId !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });

    return { message: 'Workflow deleted successfully' };
  }

  async deploy(userId: string, teamId: string, workflowId: string, dto: DeployWorkflowDto) {
    const membership = await this.checkTeamAccess(userId, teamId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.EDITOR,
    ]);

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.teamId !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    const existingVersion = await this.prisma.workflowVersion.findFirst({
      where: { workflowId, versionStr: dto.versionStr },
    });

    if (existingVersion) {
      throw new BadRequestException('Version already exists');
    }

    await this.prisma.workflowVersion.create({
      data: {
        workflowId,
        versionStr: dto.versionStr,
        definition: workflow.definition as any,
        description: dto.description,
        authorName: membership.user?.name || 'Unknown',
      },
    });

    const [major, minor, patch] = dto.versionStr.split('.').map(Number);
    const newVersion = major + minor / 10 + patch / 100;

    const definition = workflow.definition as unknown as WorkflowDefinition;

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        versionStr: dto.versionStr,
        version: newVersion,
        status: WorkflowStatus.ACTIVE,
        cronConfig: this.extractCronConfig(definition),
      },
    });
  }

  async rollback(userId: string, teamId: string, workflowId: string, versionStr: string) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const version = await this.prisma.workflowVersion.findFirst({
      where: { workflowId, versionStr },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        definition: version.definition as any,
        versionStr: version.versionStr,
      },
    });
  }

  async import(userId: string, teamId: string, dto: ImportWorkflowDto) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR]);

    if (!dto.data.meta || !dto.data.nodes || !dto.data.edges) {
      throw new BadRequestException('Invalid workflow data structure');
    }

    return this.prisma.workflow.create({
      data: {
        teamId,
        name: dto.data.meta.name,
        description: dto.data.meta.description,
        definition: {
          nodes: dto.data.nodes,
          edges: dto.data.edges,
        } as any,
        status: WorkflowStatus.DRAFT,
      },
    });
  }

  async export(userId: string, teamId: string, workflowId: string) {
    await this.checkTeamAccess(userId, teamId);

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.teamId !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    const definition = workflow.definition as unknown as WorkflowDefinition;

    return {
      meta: {
        name: workflow.name,
        description: workflow.description,
        version: workflow.versionStr,
        exportedAt: new Date().toISOString(),
      },
      nodes: definition?.nodes || [],
      edges: definition?.edges || [],
    };
  }

  async getDeployments(userId: string, teamId: string) {
    await this.checkTeamAccess(userId, teamId);

    const workflows = await this.prisma.workflow.findMany({
      where: {
        teamId,
        status: { in: [WorkflowStatus.ACTIVE, WorkflowStatus.INACTIVE] },
      },
      select: {
        id: true,
        name: true,
        description: true,
        versionStr: true,
        status: true,
        updatedAt: true,
        definition: true,
        executions: {
          select: {
            id: true,
            status: true,
            duration: true,
            startTime: true,
          },
          orderBy: { startTime: 'desc' },
          take: 100,
        },
        versions: {
          select: {
            versionStr: true,
            createdAt: true,
            authorName: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

    return {
      deployments: workflows.map((wf) => {
        const totalCalls = wf.executions.length;
        const successCalls = wf.executions.filter((e) => e.status === 'SUCCESS').length;
        const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0;
        const avgDuration =
          totalCalls > 0
            ? Math.round(
                wf.executions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalCalls,
              )
            : 0;
        const lastExec = wf.executions[0];

        return {
          id: wf.id,
          workflowId: wf.id,
          workflowName: wf.name,
          description: wf.description,
          version: wf.versionStr,
          status: wf.status.toLowerCase(),
          publishedAt: wf.versions[0]?.createdAt?.toISOString() || wf.updatedAt.toISOString(),
          publishedBy: wf.versions[0]?.authorName || 'Unknown',
          totalCalls,
          successRate: Math.round(successRate * 10) / 10,
          avgDuration,
          lastCalledAt: lastExec?.startTime?.toISOString(),
          webhookUrl: `${baseUrl}/api/v1/hooks/${wf.id}`,
          definition: wf.definition,
        };
      }),
    };
  }

  async updateStatus(userId: string, teamId: string, workflowId: string, status: 'active' | 'inactive') {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR]);

    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || workflow.teamId !== teamId) {
      throw new NotFoundException('Workflow not found');
    }

    const newStatus = status === 'active' ? WorkflowStatus.ACTIVE : WorkflowStatus.INACTIVE;

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: { status: newStatus },
    });
  }

  async getStats(userId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        executions: {
          select: {
            id: true,
            status: true,
            duration: true,
            startTime: true,
          },
          orderBy: { startTime: 'desc' },
          take: 1000,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const totalCalls = workflow.executions.length;
    const successCalls = workflow.executions.filter((e) => e.status === 'SUCCESS').length;
    const failedCalls = workflow.executions.filter((e) => e.status === 'FAILED').length;
    const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0;
    const avgDuration =
      totalCalls > 0
        ? Math.round(
            workflow.executions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalCalls,
          )
        : 0;

    const callsByDay: { date: string; calls: number }[] = [];
    const dayMap = new Map<string, number>();

    workflow.executions.forEach((e) => {
      const date = e.startTime.toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });

    dayMap.forEach((calls, date) => {
      callsByDay.push({ date, calls });
    });

    callsByDay.sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCalls,
      successCalls,
      failedCalls,
      successRate: Math.round(successRate * 10) / 10,
      avgDuration,
      callsByDay: callsByDay.slice(-30),
    };
  }

  async getExecutions(userId: string, workflowId: string, limit: number = 10) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const executions = await this.prisma.execution.findMany({
      where: { workflowId },
      select: {
        id: true,
        status: true,
        duration: true,
        startTime: true,
        endTime: true,
        triggerType: true,
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    return {
      executions: executions.map((e) => ({
        id: e.id,
        status: e.status,
        duration: e.duration,
        startTime: e.startTime,
        endTime: e.endTime,
        triggerType: e.triggerType,
      })),
    };
  }

  private async checkTeamAccess(
    userId: string,
    teamId: string,
    allowedRoles: MemberRole[] = [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR, MemberRole.VIEWER],
  ) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException('Team not found');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return membership;
  }

  private countNodes(definition: WorkflowDefinition | null): number {
    if (!definition || !definition.nodes) return 0;
    return definition.nodes.length;
  }

  private extractCronConfig(definition: WorkflowDefinition | null): string | null {
    if (!definition || !definition.nodes) return null;
    const startNode = definition.nodes.find((n: any) => n.data?.type === 'start');
    if (startNode?.data?.config?.triggerType === 'schedule') {
      return startNode.data.config.cronExpression || null;
    }
    return null;
  }
}
