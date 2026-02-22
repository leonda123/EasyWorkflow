import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { DatabaseConfig } from './database.service';

@Controller('database')
@UseGuards(JwtAuthGuard)
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post('test')
  async testConnection(@Body() config: DatabaseConfig) {
    return this.databaseService.testConnection(config);
  }
}
