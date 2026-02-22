import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { EmailConfigDto } from './email.types';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('config')
  @Roles(UserRole.SUPER_ADMIN)
  async getConfig() {
    return this.emailService.getConfig();
  }

  @Post('config')
  @Roles(UserRole.SUPER_ADMIN)
  async updateConfig(@Body() data: Partial<EmailConfigDto>) {
    return this.emailService.updateConfig(data);
  }

  @Post('test')
  @Roles(UserRole.SUPER_ADMIN)
  async testConnection(@Body() data: Partial<EmailConfigDto>) {
    return this.emailService.testConnection(data);
  }

  @Post('send-test')
  @Roles(UserRole.SUPER_ADMIN)
  async sendTestEmail(@Body('to') to: string) {
    return this.emailService.sendTestEmail(to);
  }

  @Get('status')
  async getStatus() {
    return {
      enabled: this.emailService.isEnabled(),
    };
  }
}
