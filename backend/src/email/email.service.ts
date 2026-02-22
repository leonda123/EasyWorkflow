import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { EmailConfigDto, EmailTestResult, SendEmailDto } from './email.types';

@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private config: any | null = null;
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
      await this.initTransporter();
    }
  }

  async onModuleDestroy() {
    if (this.transporter) {
      this.transporter.close();
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

  async loadConfig(): Promise<any | null> {
    try {
      this.config = await this.prisma.emailConfig.findFirst();
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load email config:', error);
      return null;
    }
  }

  async initTransporter(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config || !this.config.enabled) {
      return false;
    }

    try {
      const password = this.decryptPassword(this.config.password);

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.username,
          pass: password,
        },
      });

      await this.transporter.verify();
      this.logger.log('Email transporter initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error.message);
      return false;
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
    return {
      host: '',
      port: 587,
      secure: false,
      username: '',
      fromEmail: '',
      fromName: 'EasyWorkflow',
      enabled: false,
      hasPassword: false,
    };
  }

  async updateConfig(data: Partial<EmailConfigDto>): Promise<any> {
    const existing = await this.prisma.emailConfig.findFirst();

    const updateData: any = {};
    if (data.host !== undefined) updateData.host = data.host;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.secure !== undefined) updateData.secure = data.secure;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined) updateData.password = this.encryptPassword(data.password);
    if (data.fromEmail !== undefined) updateData.fromEmail = data.fromEmail;
    if (data.fromName !== undefined) updateData.fromName = data.fromName;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;

    if (existing) {
      this.config = await this.prisma.emailConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      this.config = await this.prisma.emailConfig.create({
        data: {
          host: data.host || '',
          port: data.port || 587,
          secure: data.secure || false,
          username: data.username || '',
          password: this.encryptPassword(data.password || ''),
          fromEmail: data.fromEmail || '',
          fromName: data.fromName || 'EasyWorkflow',
          enabled: data.enabled || false,
        },
      });
    }

    if (data.enabled) {
      await this.initTransporter();
    } else {
      if (this.transporter) {
        this.transporter.close();
        this.transporter = null;
      }
    }

    const { password, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      hasPassword: !!password,
    };
  }

  async testConnection(data?: Partial<EmailConfigDto>): Promise<EmailTestResult> {
    try {
      let testConfig = data || this.config;
      
      if (!testConfig) {
        return {
          success: false,
          message: '邮箱配置不存在',
        };
      }

      const password = data?.password || (this.config ? this.decryptPassword(this.config.password) : '');

      const testTransporter = nodemailer.createTransport({
        host: testConfig.host,
        port: testConfig.port,
        secure: testConfig.secure,
        auth: {
          user: testConfig.username,
          pass: password,
        },
      });

      await testTransporter.verify();
      testTransporter.close();

      if (this.config) {
        await this.prisma.emailConfig.update({
          where: { id: this.config.id },
          data: {
            verified: true,
            lastTestAt: new Date(),
          },
        });
      }

      return {
        success: true,
        message: '连接成功',
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error.message}`,
      };
    }
  }

  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      const initialized = await this.initTransporter();
      if (!initialized || !this.transporter) {
        return {
          success: false,
          message: '邮件服务未配置或未启用',
        };
      }
    }

    try {
      await this.transporter.sendMail({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
      });

      this.logger.log(`Email sent to ${dto.to}`);
      return {
        success: true,
        message: '邮件发送成功',
      };
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return {
        success: false,
        message: `发送失败: ${error.message}`,
      };
    }
  }

  async sendTestEmail(to: string): Promise<EmailTestResult> {
    return this.sendEmail({
      to,
      subject: 'EasyWorkflow 测试邮件',
      html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">测试邮件</h2>
          <p>这是一封来自 EasyWorkflow 的测试邮件。</p>
          <p>如果您收到此邮件，说明邮箱配置正确。</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: '这是一封来自 EasyWorkflow 的测试邮件。如果您收到此邮件，说明邮箱配置正确。',
    });
  }

  isEnabled(): boolean {
    return this.config?.enabled && !!this.transporter;
  }
}
