import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { ExecutionProgress } from '../gateway/workflow.events';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, teamId: string, limit = 20, offset = 0) {
    await this.checkTeamAccess(userId, teamId);

    const executions = await this.prisma.execution.findMany({
      where: { teamId },
      select: {
        id: true,
        workflowId: true,
        status: true,
        triggerType: true,
        startTime: true,
        endTime: true,
        duration: true,
        workflow: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.execution.count({
      where: { teamId },
    });

    return {
      data: executions.map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        workflowName: e.workflow.name,
        status: e.status.toLowerCase(),
        triggerType: e.triggerType.toLowerCase(),
        startTime: e.startTime,
        endTime: e.endTime,
        duration: e.duration,
      })),
      total,
      limit,
      offset,
    };
  }

  async findOne(userId: string, teamId: string, executionId: string) {
    await this.checkTeamAccess(userId, teamId);

    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
        steps: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!execution || execution.teamId !== teamId) {
      throw new NotFoundException('Execution not found');
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflow.name,
      status: execution.status.toLowerCase(),
      triggerType: execution.triggerType.toLowerCase(),
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration,
      inputData: execution.inputData,
      outputData: execution.outputData,
      steps: execution.steps.map((s) => ({
        id: s.id,
        nodeId: s.nodeId,
        nodeLabel: s.nodeLabel,
        nodeType: s.nodeType,
        status: s.status,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        inputData: s.inputData,
        outputData: s.outputData,
        logs: s.logs,
        errorMessage: s.errorMessage,
      })),
    };
  }

  private async checkTeamAccess(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!membership) {
      throw new NotFoundException('Team not found');
    }

    return membership;
  }

  async getProgress(userId: string, teamId: string, executionId: string): Promise<ExecutionProgress> {
    await this.checkTeamAccess(userId, teamId);

    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        steps: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!execution || execution.teamId !== teamId) {
      throw new NotFoundException('Execution not found');
    }

    const steps = execution.steps;
    const totalNodes = steps.length;
    const completedNodes = steps.filter(s => s.status === 'success' || s.status === 'failed').length;
    const runningNode = steps.find(s => s.status === 'running');
    
    const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    return {
      executionId,
      status: execution.status,
      currentNodeId: runningNode?.nodeId || null,
      currentNodeLabel: runningNode?.nodeLabel || null,
      completedNodes,
      totalNodes,
      progress,
      nodeStatuses: steps.map(s => ({
        nodeId: s.nodeId,
        nodeLabel: s.nodeLabel,
        status: s.status,
        duration: s.duration,
      })),
    };
  }
}
