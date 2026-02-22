import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateApiKeyDto, CreateGlobalApiKeyDto, CreateWorkflowApiKeyDto, ToggleApiKeyDto } from './api-key.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  // Global API Key endpoints (Super Admin only)
  @Get('api-keys/global')
  getGlobalApiKey(@Request() req: any) {
    return this.apiKeyService.getGlobalApiKey(req.user.id);
  }

  @Post('api-keys/global')
  createGlobalApiKey(
    @Request() req: any,
    @Body() dto: CreateGlobalApiKeyDto,
  ) {
    return this.apiKeyService.createGlobalApiKey(req.user.id, dto);
  }

  @Post('api-keys/global/toggle')
  toggleGlobalApiKey(
    @Request() req: any,
    @Body() dto: ToggleApiKeyDto,
  ) {
    return this.apiKeyService.toggleGlobalApiKey(req.user.id, dto);
  }

  @Delete('api-keys/global')
  deleteGlobalApiKey(@Request() req: any) {
    return this.apiKeyService.deleteGlobalApiKey(req.user.id);
  }

  // Team API Key endpoints
  @Post('teams/:teamId/api-keys')
  create(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.create(req.user.id, teamId, dto);
  }

  @Get('teams/:teamId/api-keys')
  findAll(@Request() req: any, @Param('teamId') teamId: string) {
    return this.apiKeyService.findAll(req.user.id, teamId);
  }

  @Post('teams/:teamId/api-keys/:id/revoke')
  revoke(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.revoke(req.user.id, teamId, id);
  }

  @Delete('teams/:teamId/api-keys/:id')
  delete(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.delete(req.user.id, teamId, id);
  }

  // Workflow specific API Key endpoints
  @Get('teams/:teamId/workflows/:workflowId/api-key')
  getWorkflowApiKey(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.apiKeyService.getWorkflowApiKey(req.user.id, teamId, workflowId);
  }

  @Post('teams/:teamId/workflows/:workflowId/api-key')
  createWorkflowApiKey(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateWorkflowApiKeyDto,
  ) {
    return this.apiKeyService.createWorkflowApiKey(req.user.id, teamId, workflowId, dto);
  }

  @Post('teams/:teamId/workflows/:workflowId/api-key/toggle')
  toggleWorkflowApiKey(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: ToggleApiKeyDto,
  ) {
    return this.apiKeyService.toggleWorkflowApiKey(req.user.id, teamId, workflowId, dto);
  }

  @Delete('teams/:teamId/workflows/:workflowId/api-key')
  deleteWorkflowApiKey(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.apiKeyService.deleteWorkflowApiKey(req.user.id, teamId, workflowId);
  }
}
