import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmSchedulerService } from './llm-scheduler.service';
import { CreateLlmConfigDto, UpdateLlmConfigDto, ChatDto, TestConfigDto } from './llm.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TeamRoleGuard } from '../auth/guards/team-role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TeamRoles } from '../auth/decorators/team-roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole, MemberRole } from '@prisma/client';

@Controller('llm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly schedulerService: LlmSchedulerService,
  ) {}

  @Get('providers')
  @Public()
  getProviders() {
    return this.llmService.getProviders();
  }

  @Get('configs')
  getConfigs(@Req() req: any, @Query('teamId') teamId?: string) {
    return this.llmService.getConfigs(req.user.id, teamId, req.user.role);
  }

  @Get('configs/:id')
  getConfig(@Param('id') id: string, @Req() req: any) {
    return this.llmService.getConfig(id, req.user.id, req.user.role);
  }

  @Post('configs')
  @UseGuards(TeamRoleGuard)
  @TeamRoles(MemberRole.OWNER, MemberRole.ADMIN)
  createConfig(@Body() dto: CreateLlmConfigDto, @Req() req: any) {
    return this.llmService.createConfig(dto, req.user.id, req.user.role);
  }

  @Put('configs/:id')
  updateConfig(@Param('id') id: string, @Body() dto: UpdateLlmConfigDto, @Req() req: any) {
    return this.llmService.updateConfig(id, dto, req.user.id, req.user.role);
  }

  @Delete('configs/:id')
  deleteConfig(@Param('id') id: string, @Req() req: any) {
    return this.llmService.deleteConfig(id, req.user.id, req.user.role);
  }

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.llmService.chat(dto);
  }

  @Post('configs/:id/test')
  testConfig(@Param('id') id: string, @Req() req: any) {
    return this.llmService.testConfig(id);
  }

  @Get('configs/:id/queue-stats')
  getQueueStats(@Param('id') id: string) {
    return this.schedulerService.getQueueStats(id);
  }
}
