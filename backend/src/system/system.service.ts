import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'system' },
    });

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { id: 'system' },
      });
    }

    return settings;
  }

  async updateSettings(data: {
    easyBotEnabled?: boolean;
    processNodeAiEnabled?: boolean;
    easyBotLlmConfigId?: string | null;
    processNodeAiLlmConfigId?: string | null;
  }) {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: 'system' },
    });

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          id: 'system',
          ...data,
        },
      });
    } else {
      settings = await this.prisma.systemSettings.update({
        where: { id: 'system' },
        data,
      });
    }

    return settings;
  }

  async getAiSettings() {
    const settings = await this.getSettings();
    return {
      easyBotEnabled: settings.easyBotEnabled,
      processNodeAiEnabled: settings.processNodeAiEnabled,
      easyBotLlmConfigId: settings.easyBotLlmConfigId,
      processNodeAiLlmConfigId: settings.processNodeAiLlmConfigId,
    };
  }
}
