import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams/:teamId/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('settings')
  getSettings(@Request() req: any, @Param('teamId') teamId: string) {
    return this.notificationService.getSettings(req.user.id, teamId);
  }

  @Patch('settings')
  updateSettings(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body()
    body: {
      emailEnabled?: boolean;
      email?: string;
      onFailure?: boolean;
      onSuccess?: boolean;
      cooldownMinutes?: number;
    },
  ) {
    return this.notificationService.updateSettings(req.user.id, teamId, body);
  }
}
