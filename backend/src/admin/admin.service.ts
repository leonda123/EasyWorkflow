import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, MemberRole } from '@prisma/client';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              memberships: true,
              ownedTeams: true,
              triggeredExecutions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
        role: u.role.toLowerCase(),
        isActive: u.isActive,
        teamsCount: u._count.memberships,
        ownedTeamsCount: u._count.ownedTeams,
        executionsCount: u._count.triggeredExecutions,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            team: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        ownedTeams: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role.toLowerCase(),
      isActive: user.isActive,
      teams: user.memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        slug: m.team.slug,
        role: m.role.toLowerCase(),
      })),
      ownedTeams: user.ownedTeams,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createUser(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role || UserRole.USER,
      },
    });

    let defaultTeam = null;
    if (dto.createDefaultTeam !== false && !dto.teamId) {
      const team = await this.prisma.team.create({
        data: {
          name: `${dto.name}'s Team`,
          slug: this.generateSlug(dto.name),
          ownerId: user.id,
        },
      });

      await this.prisma.teamMember.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: MemberRole.OWNER,
        },
      });

      defaultTeam = {
        id: team.id,
        name: team.name,
        slug: team.slug,
      };
    }

    if (dto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });

      if (team) {
        await this.prisma.teamMember.create({
          data: {
            userId: user.id,
            teamId: dto.teamId,
            role: MemberRole.VIEWER,
          },
        });
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role.toLowerCase(),
      isActive: user.isActive,
      createdAt: user.createdAt,
      defaultTeam,
    };
  }

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${randomSuffix}`;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        isActive: dto.isActive,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role.toLowerCase(),
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });

    return {
      id: updatedUser.id,
      role: updatedUser.role.toLowerCase(),
    };
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return {
      id: updatedUser.id,
      isActive: updatedUser.isActive,
    };
  }

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      superAdmins,
      totalTeams,
      totalWorkflows,
      totalExecutions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } }),
      this.prisma.team.count(),
      this.prisma.workflow.count(),
      this.prisma.execution.count(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        superAdmins,
      },
      teams: totalTeams,
      workflows: totalWorkflows,
      executions: totalExecutions,
    };
  }
}
