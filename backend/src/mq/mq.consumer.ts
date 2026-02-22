import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MqService } from './mq.service';
import { QUEUE_NAMES, WorkflowExecuteMessage } from './mq.types';

@Injectable()
export class MqConsumer implements OnModuleInit {
  private readonly logger = new Logger(MqConsumer.name);
  private consuming = false;

  constructor(private mqService: MqService) {}

  async onModuleInit() {
    setTimeout(async () => {
      if (this.mqService.isEnabled()) {
        await this.startConsuming();
      }
    }, 2000);
  }

  async startConsuming(): Promise<void> {
    if (this.consuming) return;

    const channel = this.mqService.getChannel();
    if (!channel) {
      this.logger.warn('Cannot start consuming: MQ channel not available');
      return;
    }

    this.consuming = true;
    this.logger.log('Starting to consume workflow execution messages...');

    await this.mqService.consume(
      QUEUE_NAMES.WORKFLOW_EXECUTE,
      async (message: WorkflowExecuteMessage) => {
        this.logger.log(`Received execution message: ${message.executionId}`);
        this.logger.log(`Workflow: ${message.workflowId}, Team: ${message.teamId}`);
        
        await this.mqService.publish(QUEUE_NAMES.WORKFLOW_CALLBACK, {
          executionId: message.executionId,
          status: 'RECEIVED',
          timestamp: Date.now(),
        });
      },
    );
  }

  stopConsuming(): void {
    this.consuming = false;
    this.logger.log('Stopped consuming messages');
  }
}
