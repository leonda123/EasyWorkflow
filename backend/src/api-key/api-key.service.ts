import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole, UserRole } from '@prisma/client';
import { CreateApiKeyDto, CreateGlobalApiKeyDto, CreateWorkflowApiKeyDto, UpdateApiKeyDto, ToggleApiKeyDto } from './api-key.dto';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, teamId: string, dto: CreateApiKeyDto) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const rawKey = this.generateApiKey();
    const secretHash = await bcrypt.hash(rawKey, 10);
    const maskedKey = this.maskKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        teamId,
        workflowId: dto.workflowId,
        name: dto.name,
        maskedKey,
        secretHash,
        status: 'active',
        keyType: 'random',
        isGlobal: false,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      maskedKey: apiKey.maskedKey,
      workflowId: apiKey.workflowId,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(userId: string, teamId: string) {
    await this.checkTeamAccess(userId, teamId);

    const apiKeys = await this.prisma.apiKey.findMany({
      where: { teamId, isGlobal: false },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey: k.maskedKey,
      status: k.status,
      keyType: k.keyType,
      workflowId: k.workflowId,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async getGlobalApiKey(userId: string) {
    await this.checkSuperAdmin(userId);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { isGlobal: true },
    });

    if (!apiKey) {
      return null;
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      maskedKey: apiKey.maskedKey,
      status: apiKey.status,
      keyType: apiKey.keyType,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
    };
  }

  async createGlobalApiKey(userId: string, dto: CreateGlobalApiKeyDto) {
    await this.checkSuperAdmin(userId);

    await this.prisma.apiKey.deleteMany({
      where: { isGlobal: true },
    });

    const rawKey = dto.customKey || this.generateApiKey();
    const secretHash = await bcrypt.hash(rawKey, 10);
    const maskedKey = this.maskKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        teamId: null,
        name: 'Global API Key',
        maskedKey,
        secretHash,
        status: 'active',
        keyType: dto.customKey ? 'custom' : 'random',
        isGlobal: true,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      maskedKey: apiKey.maskedKey,
      status: apiKey.status,
      keyType: apiKey.keyType,
      createdAt: apiKey.createdAt,
    };
  }

  async toggleGlobalApiKey(userId: string, dto: ToggleApiKeyDto) {
    await this.checkSuperAdmin(userId);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { isGlobal: true },
    });

    if (!apiKey) {
      throw new NotFoundException('Global API Key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { status: dto.enabled ? 'active' : 'disabled' },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  async deleteGlobalApiKey(userId: string) {
    await this.checkSuperAdmin(userId);

    const result = await this.prisma.apiKey.deleteMany({
      where: { isGlobal: true },
    });

    if (result.count === 0) {
      throw new NotFoundException('Global API Key not found');
    }

    return { message: 'Global API Key deleted successfully' };
  }

  async getWorkflowApiKey(userId: string, teamId: string, workflowId: string) {
    await this.checkTeamAccess(userId, teamId);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { workflowId, isGlobal: false },
    });

    if (!apiKey) {
      return null;
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      maskedKey: apiKey.maskedKey,
      status: apiKey.status,
      keyType: apiKey.keyType,
      workflowId: apiKey.workflowId,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
    };
  }

  async createWorkflowApiKey(userId: string, teamId: string, workflowId: string, dto: CreateWorkflowApiKeyDto) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    await this.prisma.apiKey.deleteMany({
      where: { workflowId, isGlobal: false },
    });

    const rawKey = dto.customKey || this.generateApiKey();
    const secretHash = await bcrypt.hash(rawKey, 10);
    const maskedKey = this.maskKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        teamId,
        workflowId,
        name: `Workflow API Key`,
        maskedKey,
        secretHash,
        status: 'active',
        keyType: dto.customKey ? 'custom' : 'random',
        isGlobal: false,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      maskedKey: apiKey.maskedKey,
      status: apiKey.status,
      keyType: apiKey.keyType,
      workflowId: apiKey.workflowId,
      createdAt: apiKey.createdAt,
    };
  }

  async toggleWorkflowApiKey(userId: string, teamId: string, workflowId: string, dto: ToggleApiKeyDto) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { workflowId, isGlobal: false },
    });

    if (!apiKey) {
      throw new NotFoundException('Workflow API Key not found');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { status: dto.enabled ? 'active' : 'disabled' },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  async deleteWorkflowApiKey(userId: string, teamId: string, workflowId: string) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const result = await this.prisma.apiKey.deleteMany({
      where: { workflowId, isGlobal: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Workflow API Key not found');
    }

    return { message: 'Workflow API Key deleted successfully' };
  }

  async revoke(userId: string, teamId: string, keyId: string) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey || apiKey.teamId !== teamId) {
      throw new NotFoundException('API Key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'revoked' },
    });

    return { message: 'API Key revoked successfully' };
  }

  async delete(userId: string, teamId: string, keyId: string) {
    await this.checkTeamAccess(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey || apiKey.teamId !== teamId) {
      throw new NotFoundException('API Key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    return { message: 'API Key deleted successfully' };
  }

  async validate(key: string, workflowId?: string): Promise<{ teamId: string | null; workflowId?: string } | null> {
    if (workflowId) {
      const workflowKey = await this.prisma.apiKey.findFirst({
        where: { workflowId, isGlobal: false, status: 'active' },
      });

      if (workflowKey) {
        const isValid = await bcrypt.compare(key, workflowKey.secretHash);
        if (isValid) {
          await this.prisma.apiKey.update({
            where: { id: workflowKey.id },
            data: { lastUsedAt: new Date() },
          });
          return {
            teamId: workflowKey.teamId,
            workflowId: workflowKey.workflowId || undefined,
          };
        }
      }
    }

    const globalKey = await this.prisma.apiKey.findFirst({
      where: { isGlobal: true, status: 'active' },
    });

    if (globalKey) {
      const isValid = await bcrypt.compare(key, globalKey.secretHash);
      if (isValid) {
        await this.prisma.apiKey.update({
          where: { id: globalKey.id },
          data: { lastUsedAt: new Date() },
        });
        return {
          teamId: globalKey.teamId,
          workflowId: globalKey.workflowId || undefined,
        };
      }
    }

    const apiKeys = await this.prisma.apiKey.findMany({
      where: { status: 'active', isGlobal: false },
    });

    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(key, apiKey.secretHash);
      if (isValid) {
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          teamId: apiKey.teamId,
          workflowId: apiKey.workflowId || undefined,
        };
      }
    }

    return null;
  }

  private generateApiKey(): string {
    const prefix = 'sk_live_';
    const randomBytes = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join('');
    return prefix + randomBytes;
  }

  private maskKey(key: string): string {
    return key.substring(0, 12) + '...' + key.substring(key.length - 4);
  }

  private async checkTeamAccess(
    userId: string,
    teamId: string,
    allowedRoles: MemberRole[] = [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.EDITOR, MemberRole.VIEWER],
  ) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!membership) {
      throw new NotFoundException('Team not found');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return membership;
  }

  private async checkSuperAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can manage global API keys');
    }
  }
}
