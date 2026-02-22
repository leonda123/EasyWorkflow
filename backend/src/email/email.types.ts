export interface EmailConfigDto {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface EmailTestResult {
  success: boolean;
  message: string;
}

export interface SendEmailDto {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
