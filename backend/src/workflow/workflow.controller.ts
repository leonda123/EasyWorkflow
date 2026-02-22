import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  DeployWorkflowDto,
  ImportWorkflowDto,
  UpdateStatusDto,
} from './workflow.dto';

@Controller('teams/:teamId/workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Post()
  create(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowService.create(req.user.id, teamId, dto);
  }

  @Get()
  findAll(@Request() req: any, @Param('teamId') teamId: string) {
    return this.workflowService.findAll(req.user.id, teamId);
  }

  @Get(':id')
  findOne(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.workflowService.findOne(req.user.id, teamId, id);
  }

  @Put(':id')
  update(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.update(req.user.id, teamId, id, dto);
  }

  @Delete(':id')
  delete(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.workflowService.delete(req.user.id, teamId, id);
  }

  @Post(':id/deploy')
  deploy(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: DeployWorkflowDto,
  ) {
    return this.workflowService.deploy(req.user.id, teamId, id, dto);
  }

  @Post(':id/rollback/:version')
  rollback(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.workflowService.rollback(req.user.id, teamId, id, version);
  }

  @Post('import')
  import(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() dto: ImportWorkflowDto,
  ) {
    return this.workflowService.import(req.user.id, teamId, dto);
  }

  @Get(':id/export')
  export(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.workflowService.export(req.user.id, teamId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.workflowService.updateStatus(req.user.id, teamId, id, dto.status);
  }
}

@Controller('teams/:teamId')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(private workflowService: WorkflowService) {}

  @Get('deployments')
  getDeployments(@Request() req: any, @Param('teamId') teamId: string) {
    return this.workflowService.getDeployments(req.user.id, teamId);
  }
}

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowStatsController {
  constructor(private workflowService: WorkflowService) {}

  @Get(':id/stats')
  getStats(@Request() req: any, @Param('id') id: string) {
    return this.workflowService.getStats(req.user.id, id);
  }

  @Get(':id/executions')
  getExecutions(
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowService.getExecutions(req.user.id, id, limit ? parseInt(limit) : 10);
  }
}
