import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, MemberRole } from '@prisma/client';

export const TEAM_ROLES_KEY = 'teamRoles';

@Injectable()
export class TeamRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTeamRoles = this.reflector.getAllAndOverride<MemberRole[]>(TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body || {};
    
    const teamIds: string[] = [];
    if (body.teamId) {
      teamIds.push(body.teamId);
    }
    if (body.teamIds && Array.isArray(body.teamIds)) {
      teamIds.push(...body.teamIds);
    }
    const queryTeamId = request.query.teamId;
    if (queryTeamId && !teamIds.includes(queryTeamId)) {
      teamIds.push(queryTeamId);
    }

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (teamIds.length === 0) {
      if (requiredTeamRoles) {
        throw new ForbiddenException('Team ID is required');
      }
      return true;
    }

    if (!requiredTeamRoles) {
      return true;
    }

    for (const teamId of teamIds) {
      const membership = await this.prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: user.id,
            teamId: teamId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this team');
      }

      const roleHierarchy: Record<MemberRole, number> = {
        [MemberRole.OWNER]: 4,
        [MemberRole.ADMIN]: 3,
        [MemberRole.EDITOR]: 2,
        [MemberRole.VIEWER]: 1,
      };

      const userRoleLevel = roleHierarchy[membership.role];
      const hasRequiredRole = requiredTeamRoles.some(
        (requiredRole) => userRoleLevel >= roleHierarchy[requiredRole],
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException('Insufficient team permissions');
      }
    }

    return true;
  }
}
