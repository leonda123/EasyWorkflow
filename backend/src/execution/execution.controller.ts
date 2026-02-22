import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
} from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { OrchestratorService } from './orchestrator.service';
import { RunWorkflowDto } from '../workflow/workflow.dto';

@Controller('teams/:teamId')
export class ExecutionController {
  constructor(
    private executionService: ExecutionService,
    private orchestratorService: OrchestratorService,
  ) {}

  @Get('executions')
  findAll(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.executionService.findAll(
      req.user.id,
      teamId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('executions/:id')
  findOne(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.executionService.findOne(req.user.id, teamId, id);
  }

  @Get('executions/:id/progress')
  getProgress(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.executionService.getProgress(req.user.id, teamId, id);
  }

  @Post('workflows/:workflowId/run')
  async runWorkflow(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: RunWorkflowDto,
  ) {
    const result = await this.orchestratorService.executeWorkflow(
      workflowId,
      dto.targetNodeId ? 'PARTIAL' : 'MANUAL',
      dto.input || {},
      dto.targetNodeId,
      req.user.id,
    );

    return result;
  }
}
