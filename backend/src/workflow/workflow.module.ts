import { Module } from '@nestjs/common';
import { WorkflowController, DeploymentController, WorkflowStatsController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  controllers: [WorkflowController, DeploymentController, WorkflowStatsController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
