import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLlmConfigDto, UpdateLlmConfigDto, ChatDto } from './llm.dto';
import { LlmSchedulerService } from './llm-scheduler.service';
import OpenAI from 'openai';
import { Prisma, UserRole, MemberRole } from '@prisma/client';

const PROVIDER_CONFIGS: Record<string, { name: string; baseUrl: string; models: string[] }> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  zhipu: {
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
  },
  moonshot: {
    name: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    models: [],
  },
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private prisma: PrismaService,
    private schedulerService: LlmSchedulerService,
  ) {}

  getProviders() {
    return Object.entries(PROVIDER_CONFIGS).map(([key, config]) => ({
      id: key,
      name: config.name,
      baseUrl: config.baseUrl,
      models: config.models,
    }));
  }

  async getConfigs(userId: string, teamId?: string, userRole?: UserRole) {
    let userTeamIds: string[] = [];
    
    if (userRole !== UserRole.SUPER_ADMIN) {
      const memberships = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      userTeamIds = memberships.map(m => m.teamId);
    }

    const configs = await this.prisma.llmConfig.findMany({
      where: userRole === UserRole.SUPER_ADMIN
        ? {}
        : {
            OR: [
              { isGlobal: true },
              { teams: { some: { teamId: { in: userTeamIds } } } },
            ],
          },
      include: {
        teams: {
          select: {
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return configs.map(config => ({
      ...config,
      apiKey: this.maskApiKey(config.apiKey),
      teamIds: config.teams.map(t => t.teamId),
      teamNames: config.teams.map(t => t.team.name),
    }));
  }

  async getConfig(id: string, userId?: string, userRole?: UserRole) {
    const config = await this.prisma.llmConfig.findUnique({
      where: { id },
      include: {
        teams: {
          select: {
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
    });
    
    if (!config) {
      throw new NotFoundException('LLM configuration not found');
    }

    if (userRole !== UserRole.SUPER_ADMIN && userId) {
      const isGlobal = config.isGlobal;
      const configTeamIds = config.teams.map(t => t.teamId);
      
      const memberships = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const userTeamIds = memberships.map(m => m.teamId);
      
      const hasAccess = configTeamIds.some(tid => userTeamIds.includes(tid));
      
      if (!isGlobal && !hasAccess) {
        throw new ForbiddenException('You do not have access to this configuration');
      }
    }
    
    return {
      ...config,
      apiKey: this.maskApiKey(config.apiKey),
      teamIds: config.teams.map(t => t.teamId),
      teamNames: config.teams.map(t => t.team.name),
    };
  }

  async createConfig(dto: CreateLlmConfigDto, userId: string, userRole?: UserRole) {
    if (dto.isGlobal && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can create global configurations');
    }

    if (dto.teamIds && dto.teamIds.length > 0 && userRole !== UserRole.SUPER_ADMIN) {
      for (const teamId of dto.teamIds) {
        const membership = await this.prisma.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId,
              teamId: teamId,
            },
          },
        });
        
        if (!membership || (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN)) {
          throw new ForbiddenException(`You do not have permission to create configurations for team ${teamId}`);
        }
      }
    }

    const config = await this.prisma.llmConfig.create({
      data: {
        name: dto.name,
        provider: dto.provider,
        baseUrl: dto.baseUrl || PROVIDER_CONFIGS[dto.provider]?.baseUrl || '',
        apiKey: dto.apiKey,
        model: dto.model,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        maxTokens: dto.maxTokens ?? 4096,
        temperature: dto.temperature ?? 0.7,
        isGlobal: dto.isGlobal ?? false,
        creatorId: userId,
        teams: dto.teamIds && dto.teamIds.length > 0
          ? {
              create: dto.teamIds.map(teamId => ({ teamId })),
            }
          : undefined,
      },
      include: {
        teams: {
          select: {
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
    });

    return {
      ...config,
      apiKey: this.maskApiKey(config.apiKey),
      teamIds: config.teams.map(t => t.teamId),
      teamNames: config.teams.map(t => t.team.name),
    };
  }

  async updateConfig(id: string, dto: UpdateLlmConfigDto, userId: string, userRole?: UserRole) {
    const existing = await this.prisma.llmConfig.findUnique({
      where: { id },
      include: { teams: true },
    });
    
    if (!existing) {
      throw new NotFoundException('LLM configuration not found');
    }

    if (userRole !== UserRole.SUPER_ADMIN) {
      if (existing.isGlobal) {
        throw new ForbiddenException('Only super admins can modify global configurations');
      }
      
      const existingTeamIds = existing.teams.map(t => t.teamId);
      
      if (existingTeamIds.length > 0) {
        const memberships = await this.prisma.teamMember.findMany({
          where: { 
            userId,
            teamId: { in: existingTeamIds },
          },
        });
        
        const hasAdminAccess = memberships.some(
          m => m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN
        );
        
        if (!hasAdminAccess) {
          throw new ForbiddenException('You do not have permission to modify this configuration');
        }
      }
    }

    if (dto.isGlobal !== undefined && dto.isGlobal && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can make configurations global');
    }

    if (dto.teamIds !== undefined) {
      await this.prisma.llmConfigTeam.deleteMany({
        where: { llmConfigId: id },
      });
      
      if (dto.teamIds.length > 0) {
        await this.prisma.llmConfigTeam.createMany({
          data: dto.teamIds.map(teamId => ({ llmConfigId: id, teamId })),
        });
      }
    }

    const config = await this.prisma.llmConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.provider !== undefined && { provider: dto.provider }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.apiKey !== undefined && { apiKey: dto.apiKey }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.isGlobal !== undefined && { isGlobal: dto.isGlobal }),
      },
      include: {
        teams: {
          select: {
            teamId: true,
            team: { select: { name: true } },
          },
        },
      },
    });

    return {
      ...config,
      apiKey: this.maskApiKey(config.apiKey),
      teamIds: config.teams.map(t => t.teamId),
      teamNames: config.teams.map(t => t.team.name),
    };
  }

  async deleteConfig(id: string, userId: string, userRole?: UserRole) {
    const existing = await this.prisma.llmConfig.findUnique({
      where: { id },
      include: { teams: true },
    });
    
    if (!existing) {
      throw new NotFoundException('LLM configuration not found');
    }

    if (userRole !== UserRole.SUPER_ADMIN) {
      if (existing.isGlobal) {
        throw new ForbiddenException('Only super admins can delete global configurations');
      }
      
      const existingTeamIds = existing.teams.map(t => t.teamId);
      
      if (existingTeamIds.length > 0) {
        const memberships = await this.prisma.teamMember.findMany({
          where: { 
            userId,
            teamId: { in: existingTeamIds },
          },
        });
        
        const hasAdminAccess = memberships.some(
          m => m.role === MemberRole.OWNER || m.role === MemberRole.ADMIN
        );
        
        if (!hasAdminAccess) {
          throw new ForbiddenException('You do not have permission to delete this configuration');
        }
      }
    }

    await this.prisma.llmConfig.delete({
      where: { id },
    });

    return { message: 'LLM configuration deleted successfully' };
  }

  async getDefaultConfig() {
    const config = await this.prisma.llmConfig.findFirst({
      where: { isActive: true, isDefault: true },
    });
    
    if (!config) {
      const anyConfig = await this.prisma.llmConfig.findFirst({
        where: { isActive: true },
      });
      return anyConfig;
    }
    
    return config;
  }

  async getClient(): Promise<OpenAI | null> {
    const config = await this.getDefaultConfig();
    
    if (!config) {
      return null;
    }

    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(dto: ChatDto) {
    let config: Prisma.LlmConfigGetPayload<{}> | null = null;
    
    if (dto.configId) {
      config = await this.prisma.llmConfig.findUnique({
        where: { id: dto.configId },
      });
    } else {
      config = await this.getDefaultConfig();
    }

    if (!config) {
      throw new BadRequestException('No LLM configuration available. Please configure an LLM provider first.');
    }

    if (!config.isActive) {
      throw new BadRequestException('The LLM configuration is not active.');
    }

    const configId = config.id;
    const maxConcurrency = config.maxConcurrency || 5;
    
    this.logger.log(`Chat request for config ${configId}, maxConcurrency: ${maxConcurrency}, current running: ${this.schedulerService.getRunningCount(configId)}`);

    return this.schedulerService.scheduleRequest(configId, async () => {
      return this.executeChat(config!, dto);
    });
  }

  private async executeChat(config: Prisma.LlmConfigGetPayload<{}>, dto: ChatDto) {
    this.logger.log(`Executing chat for config ${config.id}`);

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: 180000,
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (dto.systemPrompt) {
      messages.push({ role: 'system', content: dto.systemPrompt });
    }
    
    if (dto.messages && Array.isArray(dto.messages)) {
      for (const msg of dto.messages) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: dto.maxTokens || config.maxTokens,
        temperature: dto.temperature ?? config.temperature,
      });

      this.logger.log(`Chat completed for config ${config.id}, tokens used: ${response.usage?.total_tokens}`);

      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: response.usage,
      };
    } catch (error: any) {
      this.logger.error(`Chat failed for config ${config.id}: ${error.message}`);
      throw new BadRequestException(`LLM API error: ${error.message}`);
    }
  }

  async testConfig(id: string) {
    const config = await this.getConfig(id);

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'Hello, this is a test message. Please respond with "OK".' }],
        max_tokens: 10,
      });

      return {
        success: true,
        message: 'Connection successful',
        response: response.choices[0]?.message?.content,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '****';
    }
    return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
  }
}
