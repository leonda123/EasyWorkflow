import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '@prisma/client';

export const TEAM_ROLES_KEY = 'teamRoles';
export const TeamRoles = (...roles: MemberRole[]) => SetMetadata(TEAM_ROLES_KEY, roles);
