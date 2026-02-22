import { Module, forwardRef } from '@nestjs/common';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { OrchestratorService } from './orchestrator.service';
import { NodeHandlerService } from './node-handler.service';
import { SandboxService } from './sandbox.service';
import { VariableSubstitutionService } from './variable-substitution.service';
import { LlmModule } from '../llm/llm.module';
import { DatabaseModule } from '../database/database.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [LlmModule, DatabaseModule, forwardRef(() => GatewayModule)],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    OrchestratorService,
    NodeHandlerService,
    SandboxService,
    VariableSubstitutionService,
  ],
  exports: [OrchestratorService],
})
export class ExecutionModule {}
