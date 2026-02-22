import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string, teamId: string) {
    let settings = await this.prisma.notificationSettings.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!settings) {
      settings = await this.prisma.notificationSettings.create({
        data: { teamId, userId },
      });
    }

    return settings;
  }

  async updateSettings(
    userId: string,
    teamId: string,
    data: {
      emailEnabled?: boolean;
      email?: string;
      onFailure?: boolean;
      onSuccess?: boolean;
      cooldownMinutes?: number;
    },
  ) {
    return this.prisma.notificationSettings.upsert({
      where: { teamId_userId: { teamId, userId } },
      update: data,
      create: { teamId, userId, ...data },
    });
  }

  async sendFailureNotification(
    teamId: string,
    workflowId: string,
    workflowName: string,
    executionId: string,
    errorMessage: string,
  ): Promise<void> {
    this.logger.log(`Checking notification settings for team ${teamId}`);

    const settings = await this.prisma.notificationSettings.findMany({
      where: { teamId, onFailure: true, emailEnabled: true },
      include: { user: true },
    });

    if (settings.length === 0) {
      this.logger.log('No notification settings found for failure notifications');
      return;
    }

    for (const setting of settings) {
      if (!setting.email) continue;

      const cooldownMs = setting.cooldownMinutes * 60 * 1000;
      if (setting.lastNotifiedAt) {
        const timeSinceLastNotification =
          Date.now() - setting.lastNotifiedAt.getTime();
        if (timeSinceLastNotification < cooldownMs) {
          this.logger.log(
            `Skipping notification for user ${setting.userId} due to cooldown`,
          );
          continue;
        }
      }

      this.logger.log(
        `Would send failure notification to ${setting.email} for workflow ${workflowName}`,
      );

      this.logger.log(
        `Email notification: Workflow "${workflowName}" failed. Error: ${errorMessage}`,
      );

      await this.prisma.notificationSettings.update({
        where: { id: setting.id },
        data: { lastNotifiedAt: new Date() },
      });
    }
  }

  async sendSuccessNotification(
    teamId: string,
    workflowName: string,
    duration: number,
  ): Promise<void> {
    const settings = await this.prisma.notificationSettings.findMany({
      where: { teamId, onSuccess: true, emailEnabled: true },
    });

    for (const setting of settings) {
      if (!setting.email) continue;

      this.logger.log(
        `Would send success notification to ${setting.email} for workflow ${workflowName}`,
      );

      this.logger.log(
        `Email notification: Workflow "${workflowName}" completed successfully in ${duration}ms`,
      );
    }
  }
}
