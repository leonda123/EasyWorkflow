import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ExecutionModule } from '../execution/execution.module';
import { ApiKeyModule } from '../api-key/api-key.module';

@Module({
  imports: [ExecutionModule, ApiKeyModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
