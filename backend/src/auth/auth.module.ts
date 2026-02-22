import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { HybridAuthGuard } from './hybrid-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'easyworkflow-jwt-secret-key-2024',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, HybridAuthGuard],
  exports: [AuthService, HybridAuthGuard, JwtModule],
})
export class AuthModule {}
