import { Module } from '@nestjs/common';
import { MqService } from './mq.service';
import { MqController } from './mq.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MqController],
  providers: [MqService],
  exports: [MqService],
})
export class MqModule {}
