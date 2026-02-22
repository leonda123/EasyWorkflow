import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { LlmSchedulerService } from './llm-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LlmController],
  providers: [LlmService, LlmSchedulerService],
  exports: [LlmService, LlmSchedulerService],
})
export class LlmModule {}
