import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MqService } from './mq.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { MqConfigDto } from './mq.types';

@Controller('mq')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MqController {
  constructor(private readonly mqService: MqService) {}

  @Get('config')
  @Roles(UserRole.SUPER_ADMIN)
  async getConfig() {
    return this.mqService.getConfig();
  }

  @Post('config')
  @Roles(UserRole.SUPER_ADMIN)
  async updateConfig(@Body() data: Partial<MqConfigDto>) {
    return this.mqService.updateConfig(data);
  }

  @Post('test')
  @Roles(UserRole.SUPER_ADMIN)
  async testConnection(@Body() config: Partial<MqConfigDto>) {
    return this.mqService.testConnection(config);
  }

  @Post('toggle')
  @Roles(UserRole.SUPER_ADMIN)
  async toggle(@Body('enabled') enabled: boolean) {
    return this.mqService.updateConfig({ enabled });
  }

  @Get('status')
  async getStatus() {
    return this.mqService.getStatus();
  }

  @Post('reconnect')
  @Roles(UserRole.SUPER_ADMIN)
  async reconnect() {
    if (this.mqService.isEnabled()) {
      await this.mqService.disconnect();
    }
    const success = await this.mqService.connect();
    return {
      success,
      message: success ? '重新连接成功' : '重新连接失败',
    };
  }
}
