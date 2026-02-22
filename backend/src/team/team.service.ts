import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto, InviteMemberDto, UpdateMemberRoleDto } from './team.dto';
import { MemberRole } from '@prisma/client';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        slug: this.generateSlug(dto.name),
        avatarColor: dto.avatarColor || 'bg-blue-600',
        ownerId: userId,
      },
    });

    await this.prisma.teamMember.create({
      data: {
        userId,
        teamId: team.id,
        role: MemberRole.OWNER,
      },
    });

    return team;
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: {
              select: { members: true, workflows: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      avatarColor: m.team.avatarColor,
      membersCount: m.team._count.members,
      workflowsCount: m.team._count.workflows,
      role: m.role,
    }));
  }

  async findOne(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
      include: {
        team: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Team not found');
    }

    return {
      id: membership.team.id,
      name: membership.team.name,
      slug: membership.team.slug,
      avatarColor: membership.team.avatarColor,
      owner: membership.team.owner,
      members: membership.team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      role: membership.role,
    };
  }

  async update(userId: string, teamId: string, dto: UpdateTeamDto) {
    await this.checkPermission(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    return this.prisma.team.update({
      where: { id: teamId },
      data: dto,
    });
  }

  async delete(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only team owner can delete the team');
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { message: 'Team deleted successfully' };
  }

  async inviteMember(userId: string, teamId: string, dto: InviteMemberDto) {
    await this.checkPermission(userId, teamId, [MemberRole.OWNER, MemberRole.ADMIN]);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found with this email');
    }

    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId: existingUser.id, teamId },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a team member');
    }

    return this.prisma.teamMember.create({
      data: {
        userId: existingUser.id,
        teamId,
        role: dto.role as MemberRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async updateMemberRole(
    userId: string,
    teamId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.checkPermission(userId, teamId, [MemberRole.OWNER]);

    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role: dto.role as MemberRole },
    });
  }

  async removeMember(userId: string, teamId: string, memberId: string) {
    const membership = await this.checkPermission(userId, teamId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove team owner');
    }

    if (member.userId === userId && membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    await this.prisma.teamMember.delete({
      where: { id: memberId },
    });

    return { message: 'Member removed successfully' };
  }

  async leaveTeam(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this team');
    }

    if (membership.role === MemberRole.OWNER) {
      throw new ForbiddenException('Owner cannot leave the team. Transfer ownership first.');
    }

    await this.prisma.teamMember.delete({
      where: { id: membership.id },
    });

    return { message: 'Left team successfully' };
  }

  private async checkPermission(
    userId: string,
    teamId: string,
    allowedRoles: MemberRole[],
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

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${randomSuffix}`;
  }
}
