import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { SystemService } from './system.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('settings')
  @Roles(UserRole.SUPER_ADMIN)
  async getSettings() {
    return this.systemService.getSettings();
  }

  @Put('settings')
  @Roles(UserRole.SUPER_ADMIN)
  async updateSettings(
    @Body() data: {
      easyBotEnabled?: boolean;
      processNodeAiEnabled?: boolean;
      easyBotLlmConfigId?: string | null;
      processNodeAiLlmConfigId?: string | null;
    },
  ) {
    return this.systemService.updateSettings(data);
  }

  @Get('ai-settings')
  async getAiSettings() {
    return this.systemService.getAiSettings();
  }
}
