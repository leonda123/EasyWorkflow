import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ExecutionModule } from './execution/execution.module';
import { WebhookModule } from './webhook/webhook.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AdminModule } from './admin/admin.module';
import { LlmModule } from './llm/llm.module';
import { NotificationModule } from './notification/notification.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './ai/ai.module';
import { MqModule } from './mq/mq.module';
import { EmailModule } from './email/email.module';
import { GatewayModule } from './gateway/gateway.module';
import { SystemModule } from './system/system.module';
import { HybridAuthGuard } from './auth/hybrid-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TeamModule,
    WorkflowModule,
    ExecutionModule,
    WebhookModule,
    ApiKeyModule,
    AdminModule,
    LlmModule,
    NotificationModule,
    DatabaseModule,
    AiModule,
    MqModule,
    EmailModule,
    GatewayModule,
    SystemModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: HybridAuthGuard,
    },
  ],
})
export class AppModule {}
