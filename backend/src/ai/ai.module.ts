import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
