import { Controller, Post, Get, Put, Param, Body, Headers, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { Public } from '../auth/public.decorator';

@Controller('hooks')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  @Public()
  @Post(':workflowId')
  async handlePost(
    @Param('workflowId') workflowId: string,
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any,
  ) {
    return this.webhookService.handleWebhook(workflowId, 'POST', body, headers, query);
  }

  @Public()
  @Get(':workflowId')
  async handleGet(
    @Param('workflowId') workflowId: string,
    @Headers() headers: any,
    @Query() query: any,
  ) {
    return this.webhookService.handleWebhook(workflowId, 'GET', {}, headers, query);
  }

  @Public()
  @Put(':workflowId')
  async handlePut(
    @Param('workflowId') workflowId: string,
    @Body() body: any,
    @Headers() headers: any,
    @Query() query: any,
  ) {
    return this.webhookService.handleWebhook(workflowId, 'PUT', body, headers, query);
  }
}
