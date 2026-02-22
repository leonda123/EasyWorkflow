import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface QueueItem {
  id: string;
  request: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

@Injectable()
export class LlmSchedulerService {
  private readonly logger = new Logger(LlmSchedulerService.name);
  private queues: Map<string, QueueItem[]> = new Map();
  private runningCounts: Map<string, number> = new Map();

  constructor(private prisma: PrismaService) {}

  async scheduleRequest(configId: string, request: any): Promise<any> {
    const config = await this.prisma.llmConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('LLM 配置不存在');
    }

    const maxConcurrency = config.maxConcurrency || 5;
    const queueEnabled = config.queueEnabled ?? true;
    const currentRunning = this.runningCounts.get(configId) || 0;

    if (currentRunning < maxConcurrency) {
      return this.executeImmediately(configId, request);
    } else if (queueEnabled) {
      return this.enqueue(configId, request);
    } else {
      throw new Error('并发数已达上限，请稍后重试');
    }
  }

  private async executeImmediately(configId: string, request: any): Promise<any> {
    const currentCount = this.runningCounts.get(configId) || 0;
    this.runningCounts.set(configId, currentCount + 1);

    await this.prisma.llmConfig.update({
      where: { id: configId },
      data: { currentRunning: currentCount + 1 },
    });

    try {
      const result = await request();
      return result;
    } finally {
      await this.releaseSlot(configId);
    }
  }

  private enqueue(configId: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      if (!this.queues.has(configId)) {
        this.queues.set(configId, []);
      }

      this.queues.get(configId)!.push(item);
      this.logger.log(`Request enqueued for config ${configId}, queue length: ${this.queues.get(configId)!.length}`);
    });
  }

  private async releaseSlot(configId: string): Promise<void> {
    const currentCount = this.runningCounts.get(configId) || 0;
    const newCount = Math.max(0, currentCount - 1);
    this.runningCounts.set(configId, newCount);

    await this.prisma.llmConfig.update({
      where: { id: configId },
      data: { currentRunning: newCount },
    });

    const queue = this.queues.get(configId);
    if (queue && queue.length > 0) {
      const nextItem = queue.shift()!;
      this.logger.log(`Processing next queued request for config ${configId}`);
      
      this.executeImmediately(configId, nextItem.request)
        .then(nextItem.resolve)
        .catch(nextItem.reject);
    }
  }

  getQueueLength(configId: string): number {
    return this.queues.get(configId)?.length || 0;
  }

  getRunningCount(configId: string): number {
    return this.runningCounts.get(configId) || 0;
  }

  async getQueueStats(configId: string): Promise<{
    queueLength: number;
    runningCount: number;
    maxConcurrency: number;
  }> {
    const config = await this.prisma.llmConfig.findUnique({
      where: { id: configId },
    });

    return {
      queueLength: this.getQueueLength(configId),
      runningCount: this.getRunningCount(configId),
      maxConcurrency: config?.maxConcurrency || 5,
    };
  }
}
