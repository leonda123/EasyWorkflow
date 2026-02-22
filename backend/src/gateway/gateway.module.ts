import { Module } from '@nestjs/common';
import { WorkflowGateway } from './workflow.gateway';

@Module({
  providers: [WorkflowGateway],
  exports: [WorkflowGateway],
})
export class GatewayModule {}
