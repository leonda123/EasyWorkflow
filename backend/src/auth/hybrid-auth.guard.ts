import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class HybridAuthGuard {
  private readonly logger = new Logger(HybridAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Please login to continue');
    }

    const [type, token] = authorization.split(' ');

    if (type === 'Bearer') {
      const user = await this.validateJwtToken(token);
      if (user) {
        request.user = user;
        return true;
      }

      const apiKeyUser = await this.validateApiKey(token, request.params?.teamId);
      if (apiKeyUser) {
        request.user = apiKeyUser;
        return true;
      }
    }

    throw new UnauthorizedException('Please login to continue');
  }

  private async validateJwtToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });
      if (!user || !user.isActive) {
        return null;
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (e) {
      return null;
    }
  }

  private async validateApiKey(token: string, teamId?: string) {
    if (!token || !token.startsWith('sk_live_')) {
      this.logger.debug(`Token does not start with sk_live_: ${token?.substring(0, 10)}...`);
      return null;
    }

    this.logger.debug(`Validating API key for teamId: ${teamId}`);

    const apiKeys = await this.prisma.apiKey.findMany({
      where: { status: 'active' },
    });

    this.logger.debug(`Found ${apiKeys.length} active API keys`);

    for (const key of apiKeys) {
      const match = await bcrypt.compare(token, key.secretHash);
      this.logger.debug(`Comparing with key ${key.maskedKey}, match: ${match}, key.teamId: ${key.teamId}, isGlobal: ${key.isGlobal}`);
      
      if (match) {
        if (key.isGlobal) {
          const globalUser = await this.prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          });
          if (globalUser) {
            return { ...globalUser, isApiKey: true };
          }
        } else if (key.teamId === teamId) {
          const teamMember = await this.prisma.teamMember.findFirst({
            where: { teamId: key.teamId },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                },
              },
            },
          });
          this.logger.debug(`Found teamMember: ${!!teamMember}`);
          if (teamMember) {
            return { ...teamMember.user, isApiKey: true };
          }
        }
      }
    }

    return null;
  }
}
