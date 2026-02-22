import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-code')
  async generateCode(
    @Body() params: {
      description: string;
      context?: {
        inputFields?: string[];
        sampleData?: any;
        previousSteps?: string[];
      };
    },
  ) {
    return this.aiService.generateCode(params);
  }
}
