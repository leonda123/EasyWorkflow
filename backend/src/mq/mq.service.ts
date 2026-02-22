import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { PrismaService } from '../prisma/prisma.service';
import { MqConfigDto, MqConnectionTestResult, MqStatus, QUEUE_NAMES } from './mq.types';

@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqService.name);
  private connection: any = null;
  private channel: any = null;
  private config: any | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly encryptionKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-encryption-key-32ch';
  }

  async onModuleInit() {
    await this.loadConfig();
    if (this.config?.enabled) {
      await this.connect();
    } else {
      this.logger.log('MQ is disabled, skipping connection');
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async loadConfig(): Promise<any | null> {
    try {
      this.config = await this.prisma.mqConfig.findFirst();
      if (!this.config) {
        this.config = await this.prisma.mqConfig.create({
          data: {
            host: 'localhost',
            port: 5672,
            username: 'guest',
            password: this.encryptPassword('guest'),
            vhost: '/',
            enabled: true,
          },
        });
      }
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load MQ config:', error);
      return null;
    }
  }

  private encryptPassword(password: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPassword(encrypted: string): string {
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encrypted;
    }
  }

  async connect(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }
    
    if (!this.config) return false;

    try {
      const password = this.decryptPassword(this.config.password);
      
      this.connection = await amqp.connect({
        hostname: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: password,
        vhost: this.config.vhost,
      });

      this.connection.on('error', (err: Error) => {
        this.logger.error('MQ connection error:', err);
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('MQ connection closed');
        this.channel = null;
        this.connection = null;
        this.scheduleReconnect();
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(this.config.prefetchCount || 10);

      await this.channel.assertQueue(QUEUE_NAMES.WORKFLOW_EXECUTE, {
        durable: true,
        messageTtl: this.config.messageTtl || 86400000,
      });

      await this.channel.assertQueue(QUEUE_NAMES.WORKFLOW_CALLBACK, {
        durable: true,
      });

      await this.channel.assertQueue(QUEUE_NAMES.WORKFLOW_DELAYED, {
        durable: true,
        messageTtl: this.config.messageTtl || 86400000,
      });

      await this.updateConnectionStatus(true);
      this.logger.log('MQ connected successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to MQ:', error.message);
      await this.updateConnectionStatus(false);
      return false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    if (!this.config?.enabled) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.logger.log('Attempting to reconnect to MQ...');
      await this.connect();
    }, this.config?.retryDelay || 5000);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.channel) {
      try {
        await this.channel.close();
      } catch (e) {
        this.logger.warn('Error closing channel:', e.message);
      }
      this.channel = null;
    }

    if (this.connection) {
      try {
        await this.connection.close();
      } catch (e) {
        this.logger.warn('Error closing connection:', e.message);
      }
      this.connection = null;
    }

    await this.updateConnectionStatus(false);
    this.logger.log('MQ disconnected');
  }

  private async updateConnectionStatus(connected: boolean): Promise<void> {
    try {
      if (this.config) {
        this.config = await this.prisma.mqConfig.update({
          where: { id: this.config.id },
          data: {
            connected,
            lastCheckAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to update connection status:', error);
    }
  }

  async testConnection(config: Partial<MqConfigDto>): Promise<MqConnectionTestResult> {
    try {
      let password = config.password;
      if (!password) {
        const currentConfig = await this.loadConfig();
        password = currentConfig ? this.decryptPassword(currentConfig.password) : 'guest';
      }

      const testConn = await amqp.connect({
        hostname: config.host || 'localhost',
        port: config.port || 5672,
        username: config.username || 'guest',
        password: password,
        vhost: config.vhost || '/',
      });

      const testChannel = await testConn.createChannel();
      await testChannel.close();
      await testConn.close();

      return {
        success: true,
        message: '连接成功',
        details: {
          host: config.host || 'localhost',
          port: config.port || 5672,
          vhost: config.vhost || '/',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error.message}`,
      };
    }
  }

  async getConfig(): Promise<any> {
    const config = await this.loadConfig();
    if (config) {
      const { password, ...safeConfig } = config;
      return {
        ...safeConfig,
        hasPassword: !!password,
      };
    }
    return null;
  }

  async updateConfig(data: Partial<MqConfigDto> & { id?: string }): Promise<any> {
    const existing = await this.prisma.mqConfig.findFirst();

    const updateData: any = {};
    if (data.host !== undefined) updateData.host = data.host;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined) updateData.password = this.encryptPassword(data.password);
    if (data.vhost !== undefined) updateData.vhost = data.vhost;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.maxRetries !== undefined) updateData.maxRetries = data.maxRetries;
    if (data.retryDelay !== undefined) updateData.retryDelay = data.retryDelay;
    if (data.prefetchCount !== undefined) updateData.prefetchCount = data.prefetchCount;
    if (data.messageTtl !== undefined) updateData.messageTtl = data.messageTtl;

    if (existing) {
      this.config = await this.prisma.mqConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      this.config = await this.prisma.mqConfig.create({
        data: {
          host: data.host || 'localhost',
          port: data.port || 5672,
          username: data.username || 'guest',
          password: this.encryptPassword(data.password || 'guest'),
          vhost: data.vhost || '/',
          enabled: data.enabled ?? true,
          maxRetries: data.maxRetries || 3,
          retryDelay: data.retryDelay || 5000,
          prefetchCount: data.prefetchCount || 10,
          messageTtl: data.messageTtl || 86400000,
        },
      });
    }

    if (data.enabled !== undefined) {
      if (data.enabled) {
        await this.connect();
      } else {
        await this.disconnect();
      }
    }

    const { password, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      hasPassword: !!password,
    };
  }

  isEnabled(): boolean {
    return this.config?.enabled && !!this.connection && !!this.channel;
  }

  isConnected(): boolean {
    return !!this.connection && !!this.channel;
  }

  getChannel(): any {
    return this.channel;
  }

  async getQueueLength(): Promise<number> {
    if (!this.channel) return 0;

    try {
      const info = await this.channel.checkQueue(QUEUE_NAMES.WORKFLOW_EXECUTE);
      return info.messageCount;
    } catch {
      return 0;
    }
  }

  async getStatus(): Promise<MqStatus> {
    return {
      enabled: this.config?.enabled || false,
      connected: this.isConnected(),
      queueLength: await this.getQueueLength(),
      lastCheckAt: this.config?.lastCheckAt,
    };
  }

  async publish(queue: string, message: any): Promise<boolean> {
    if (!this.channel) {
      this.logger.warn('Cannot publish: MQ channel not available');
      return false;
    }

    try {
      const sent = this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          timestamp: Date.now(),
        },
      );

      if (!sent) {
        await new Promise(resolve => this.channel.once('drain', resolve));
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to publish message:', error);
      return false;
    }
  }

  async consume(
    queue: string,
    handler: (message: any) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Cannot consume: MQ channel not available');
      return;
    }

    await this.channel.consume(queue, async (msg: any) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        this.channel.ack(msg);
      } catch (error) {
        this.logger.error('Error processing message:', error);
        
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
        const maxRetries = this.config?.maxRetries || 3;

        if (retryCount < maxRetries) {
          this.channel.nack(msg, false, true);
        } else {
          this.logger.error(`Message failed after ${maxRetries} retries, discarding`);
          this.channel.ack(msg);
        }
      }
    });
  }
}
