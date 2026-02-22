import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../execution/orchestrator.service';
import { ApiKeyService } from '../api-key/api-key.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private orchestrator: OrchestratorService,
    private apiKeyService: ApiKeyService,
  ) {}

  async handleWebhook(workflowId: string, method: string, body: any, headers: any, query: any) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (workflow.status !== 'ACTIVE') {
      throw new NotFoundException('Workflow is not active');
    }

    const definition = workflow.definition as any;
    const startNode = definition?.nodes?.find((n: any) => n.data?.type === 'start');

    if (!startNode) {
      throw new NotFoundException('Workflow does not have a start node');
    }

    const triggerType = startNode.data?.config?.triggerType || 'webhook';
    if (triggerType !== 'webhook') {
      throw new NotFoundException('Workflow does not have a webhook trigger');
    }

    const expectedMethod = startNode.data?.config?.webhookMethod || 'POST';
    if (method.toUpperCase() !== expectedMethod) {
      throw new NotFoundException(`Expected ${expectedMethod} method`);
    }

    const requireAuth = startNode.data?.config?.requireAuth === true;
    const apiKey = this.extractApiKey(headers, query);

    if (requireAuth || apiKey) {
      if (!apiKey) {
        throw new UnauthorizedException('API Key is required');
      }

      const validationResult = await this.apiKeyService.validate(apiKey, workflowId);
      if (!validationResult) {
        throw new UnauthorizedException('Invalid API Key');
      }
    }

    const executionId = await this.orchestrator.executeWorkflow(
      workflowId,
      'WEBHOOK',
      { body, headers, query },
    );

    this.logger.log(`Webhook triggered execution: ${executionId}`);

    return {
      executionId,
      message: 'Workflow triggered successfully',
    };
  }

  private extractApiKey(headers: any, query: any): string | null {
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return authHeader;
    }

    if (query.api_key || query.apiKey) {
      return query.api_key || query.apiKey;
    }

    return null;
  }
}
